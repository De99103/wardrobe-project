"""Store-independent extraction of product evidence from metadata and rendered HTML."""
import json
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from fastapi import HTTPException

FIELDS = ('name', 'brand', 'category', 'subcategory', 'color', 'material', 'price', 'currency')


def clean(value, limit=1000):
    return re.sub(r'\s+', ' ', value).strip()[:limit] if isinstance(value, str) else None


def image_url(value, base):
    if isinstance(value, list):
        value = next((item for item in value if item), None)
    if isinstance(value, dict):
        value = value.get('url') or value.get('contentUrl')
    if not isinstance(value, str):
        return None
    url = urljoin(base, value)
    return url if urlparse(url).scheme == 'https' else None


def nodes(data):
    queue = [data]
    visited = 0
    while queue and visited < 500:
        node = queue.pop(0)
        visited += 1
        if isinstance(node, list):
            queue.extend(node[:100])
        elif isinstance(node, dict):
            yield node
            for key in ('@graph', 'mainEntity', 'hasVariant'):
                if key in node:
                    queue.append(node[key])


def kind(node, expected):
    value = node.get('@type', [])
    values = value if isinstance(value, list) else [value]
    return any(isinstance(item, str) and item.rsplit('/', 1)[-1] in expected for item in values)


def decimal_price(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        # Schema.org amounts are machine-readable; never guess ambiguous localized separators.
        price = Decimal(str(value))
        return float(price) if price.is_finite() and price >= 0 else None
    except InvalidOperation:
        return None


def brand_name(value, entities):
    """Read Schema.org Brand strings, arrays and graph references without choosing arbitrarily."""
    if isinstance(value, list):
        names = {name for item in value if (name := brand_name(item, entities))}
        return next(iter(names)) if len(names) == 1 else None
    if isinstance(value, dict):
        if value.get('name'):
            return canonical_brand(value['name'])
        reference = value.get('@id')
        if reference and reference in entities:
            return canonical_brand(entities[reference].get('name'))
        return None
    return canonical_brand(value)


def canonical_brand(value):
    value = clean(value, 200)
    if not value:
        return None
    key = re.sub(r'\s+', '', value).casefold()
    return {'h&m': 'H&M', 'hennes&mauritz': 'H&M', 'zara': 'Zara'}.get(key, value)


def first_party_brand(page_url):
    # Fallback for these first-party stores only. Marketplace identity is never a product brand.
    host = (urlparse(page_url).hostname or '').lower().rstrip('.')
    for domain, name in (('hm.com', 'H&M'), ('zara.com', 'Zara')):
        if host == domain or host.endswith('.' + domain):
            return name
    return None


def extract_product_data(html, page_url):
    soup = BeautifulSoup(html, 'html.parser')
    if (soup.find('iframe', src=lambda src: bool(src and '/interstitial/' in src))
            or any(tag.get('http-equiv', '').lower() == 'refresh' and 'bm-verify=' in tag.get('content', '')
                   for tag in soup.find_all('meta'))
            or soup.select_one('#challenge-running, #cf-challenge-running, form#challenge-form')):
        raise HTTPException(422, 'This store requires browser verification. Use the browser extension to import the product page after it opens in your browser.')

    def meta(key):
        tag = soup.find('meta', property=key)
        if tag is None:
            tag = soup.find('meta', attrs={'name': key})
        return clean(tag.get('content')) if tag else None

    candidates = []
    entities = {}
    for script in soup.select('script[type="application/ld+json"]')[:30]:
        try:
            data = json.loads(script.string or script.get_text())
        except (ValueError, TypeError):
            continue
        parsed_nodes = list(nodes(data))
        entities.update({node['@id']: node for node in parsed_nodes if isinstance(node.get('@id'), str)})
        candidates.extend(node for node in parsed_nodes if kind(node, ('Product', 'ProductGroup')))

    def score(product):
        offers = product.get('offers')
        urls = [product.get('url')]
        if isinstance(offers, dict):
            urls.append(offers.get('url'))
        return (100 if page_url in urls else 0) + (10 if product.get('name') else 0)

    product = max(candidates, key=score) if candidates else {}
    heading = soup.find('h1')
    title = clean(product.get('name')) or meta('og:title') or meta('twitter:title') or (clean(heading.get_text(' ', strip=True)) if heading else None)
    description = clean(product.get('description'), 5000) or meta('og:description') or meta('description')
    image = image_url(product.get('image') or meta('og:image') or meta('twitter:image'), page_url)
    if not image:
        image_link = soup.find('link', rel=lambda rel: 'image_src' in ([rel.lower()] if isinstance(rel, str) else [value.lower() for value in (rel or [])]))
        image = image_url(image_link.get('href') if image_link else None, page_url)
    if not image:
        # Many modern storefronts lazy-load the first product image into data-* attributes.
        # Prefer images inside the product/main region and ignore data/blob placeholders.
        region = soup.find('main') or soup
        for image_tag in region.select('img, [itemprop="image"]')[:30]:
            candidate = next((image_tag.get(attribute) for attribute in ('data-src', 'data-lazy-src', 'data-original', 'src') if image_tag.get(attribute)), None)
            image = image_url(candidate, page_url)
            if image:
                break
    images = []
    raw_images = product.get('image') or []
    for raw in ([image] + (raw_images if isinstance(raw_images, list) else [raw_images])):
        candidate = image_url(raw, page_url)
        if candidate and candidate not in images:
            images.append(candidate)
    if len(images) < 2:
        region = soup.find('main') or soup
        for tag in region.select('img')[:40]:
            candidate = image_url(tag.get('data-src') or tag.get('src'), page_url)
            if candidate and candidate not in images:
                images.append(candidate)
    brand = brand_name(product.get('brand'), entities)
    brand_source = 'product_schema' if brand else None
    if not brand:
        brand = canonical_brand(meta('product:brand') or meta('brand'))
        brand_source = 'product_metadata' if brand else None
    if not brand:
        region = soup.find('main') or soup
        node = region.select_one('[itemprop~="brand"]')
        if node:
            name_node = node.select_one('[itemprop~="name"]')
            brand = canonical_brand(node.get('content') or (name_node.get_text(' ', strip=True) if name_node else node.get_text(' ', strip=True)))
            brand_source = 'product_microdata' if brand else None
    if not brand and not product.get('brand'):
        brand = first_party_brand(page_url)
        brand_source = 'first_party_store' if brand else None
    offers = product.get('offers', {})
    if isinstance(offers, list):
        matching = [offer for offer in offers if isinstance(offer, dict) and offer.get('url') == page_url]
        offers = matching[0] if len(matching) == 1 else offers[0] if len(offers) == 1 else {}
    if not isinstance(offers, dict):
        offers = {}
    # AggregateOffer lowPrice is not the selected product's price.
    direct = {field: None for field in FIELDS}
    direct.update(name=title, brand=brand, color=clean(product.get('color')),
                  material=clean(product.get('material')),
                  price=decimal_price(offers.get('price', meta('product:price:amount'))),
                  currency=clean(offers.get('priceCurrency') or meta('product:price:currency')))
    for tag in soup.select('script, style, noscript, nav, footer, header, [aria-hidden="true"]'):
        tag.decompose()
    main = soup.find('main') or soup.find(attrs={'itemtype': 'https://schema.org/Product'}) or soup.body or soup
    visible = clean(main.get_text(' ', strip=True), 14000) or ''
    if not title and not description and len(visible) < 30:
        raise HTTPException(422, 'No readable product information found. Try importing the open page with the browser extension.')
    evidence = {
        'page_title': title, 'description': description,
        'source_url': page_url,
        'document_title': clean(soup.title.get_text(' ', strip=True)) if soup.title else None,
        'site_name': meta('og:site_name'),
        'product_brand': brand, 'brand_source': brand_source,
        'structured_product': product, 'visible_product_text': visible,
    }
    # Keep valid JSON rather than truncating a serialized object halfway through.
    if len(json.dumps(product, ensure_ascii=False)) > 16000:
        evidence['structured_product'] = {**direct, 'description': description}
    return {'text': json.dumps(evidence, ensure_ascii=False), 'imageUrl': image, 'imageUrls': images[:20],
            'direct': direct, 'brandSource': brand_source, 'structured': bool(product.get('name')), 'evidence': {key: str(value) for key, value in direct.items() if value is not None}}
