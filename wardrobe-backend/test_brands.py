import json
import unittest
from unittest.mock import patch
from product_extraction import extract_product_data
from test_universal import ai_response
import main


class BrandTests(unittest.TestCase):
    def extract(self, product=None, extra='', url='https://shop.example/item'):
        script = '<script type="application/ld+json">'+json.dumps(product)+'</script>' if product else ''
        return extract_product_data(extra+script+'<main><h1>Blue sweatshirt</h1><p>A blue cotton sweatshirt for everyday wear.</p></main>', url)

    def test_hm_and_zara_first_party_fallback(self):
        for url, brand in [('https://www2.hm.com/sv_se/productpage.1367863002.html', 'H&M'), ('https://www.zara.com/se/sv/product.html', 'Zara')]:
            with self.subTest(url=url):
                data = self.extract(url=url)
                self.assertEqual(data['direct']['brand'], brand)
                self.assertEqual(data['brandSource'], 'first_party_store')

    def test_marketplace_and_deceptive_domain_are_not_brands(self):
        for url in ['https://www.zalando.se/item', 'https://www.asos.com/item', 'https://hm.com.attacker.example/item', 'https://independent.example/item']:
            self.assertIsNone(self.extract(url=url)['direct']['brand'])

    def test_product_brand_wins_over_seller_site_and_domain(self):
        product = {'@type': 'Product', 'name': 'Blue sweatshirt', 'brand': {'name': 'ARKET'}, 'offers': {'seller': {'name': 'H&M'}}}
        self.assertEqual(self.extract(product, url='https://www2.hm.com/item')['direct']['brand'], 'ARKET')

    def test_graph_brand_reference(self):
        product = {'@graph': [{'@type': 'Product', 'name': 'Blue sweatshirt', 'brand': {'@id': '#brand'}}, {'@type': 'Brand', '@id': '#brand', 'name': 'Independent Label'}]}
        self.assertEqual(self.extract(product)['direct']['brand'], 'Independent Label')

    def test_single_brand_array_and_html_entity(self):
        product = {'@type': 'Product', 'name': 'Blue sweatshirt', 'brand': [{'name': 'H & M'}]}
        self.assertEqual(self.extract(product)['direct']['brand'], 'H&M')
        self.assertEqual(self.extract(extra='<meta name="brand" content="H&amp;M">')['direct']['brand'], 'H&M')

    def test_product_microdata_and_meta_brand(self):
        self.assertEqual(self.extract(extra='<meta property="product:brand" content="Studio Label">')['direct']['brand'], 'Studio Label')
        data = extract_product_data('<main><h1>Shirt</h1><span itemprop="brand"><span itemprop="name">Studio Label</span></span></main>', 'https://shop.example/item')
        self.assertEqual(data['direct']['brand'], 'Studio Label')

    def test_ai_omission_cannot_erase_explicit_brand(self):
        data = self.extract({'@type': 'Product', 'name': 'Blue sweatshirt', 'brand': 'Independent Label'})
        with patch.object(main, 'get_client', return_value=ai_response(name='Blue sweatshirt')):
            result = main.analyze_product(data, 'https://shop.example/item', 'browser_extension')
        self.assertEqual(result['brand'], 'Independent Label')

    def test_unknown_retailer_site_name_is_context_only(self):
        data = self.extract(extra='<title>Blue sweatshirt | Marketplace</title><meta property="og:site_name" content="Marketplace">')
        self.assertIsNone(data['direct']['brand'])
        context = json.loads(data['text'])
        self.assertEqual(context['site_name'], 'Marketplace')
        self.assertIn('Marketplace', context['document_title'])

    def test_text_brand_wins_over_first_party_fallback(self):
        data = self.extract(extra='<meta name="description" content="Blue sweatshirt. Brand: ARKET.">', url='https://www2.hm.com/item')
        with patch.object(main, 'get_client', return_value=ai_response(name='Blue sweatshirt', brand='ARKET')):
            result = main.analyze_product(data, 'https://www2.hm.com/item', 'browser_extension')
        self.assertEqual(result['brand'], 'ARKET')


if __name__ == '__main__':
    unittest.main()
