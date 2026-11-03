import json
import os
import re
import secrets
import threading
import time
from functools import lru_cache
from typing import Optional, Literal, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, Depends
from api_auth import require_user
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

from safe_fetch import validate_url, fetch_product_page
from product_extraction import extract_product_data, FIELDS
from browser_renderer import render_product_page
from hosted_reader import hosted_reader_enabled, read_product_page
from gemini_reader import gemini_reader_enabled, read_product_with_gemini
from clothing_normalization import NORMALIZATION_PROMPT
from outfit_recommendation import OutfitRequest, OutfitResult, recommend_outfit
from photo_analysis import PhotoRequest, PhotoDetails, analyze_photo

load_dotenv()
app = FastAPI()
# Keep the local development origins configurable, but always allow the two
# public app domains.  Without this, browsers report a generic "Failed to
# fetch" even though the recommendation endpoint itself is healthy.
configured_origins = {
    origin.strip().rstrip('/')
    for origin in os.getenv('CORS_ORIGINS', '').split(',')
    if origin.strip()
}
configured_origins.update({
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'https://wearly-closet-app.vercel.app',
    'https://wardrobe-ai-six.vercel.app',
})
app.add_middleware(CORSMiddleware,
    allow_origins=sorted(configured_origins),
    allow_methods=['GET', 'POST'], allow_headers=['Content-Type', 'Authorization'])


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.post('/analyze-photo', response_model=PhotoDetails)
def analyze_clothing_photo(request: PhotoRequest, uid: str = Depends(require_user)):
    return analyze_photo(request)


@app.get('/')
def root():
    return {'service': 'Wearly API', 'status': 'ok', 'docs': '/docs'}


@app.post('/recommend-outfit', response_model=OutfitResult)
def recommend_weather_outfit(request: OutfitRequest, uid: str = Depends(require_user)):
    return recommend_outfit(request, get_client(), os.getenv('GROQ_MODEL', 'openai/gpt-oss-20b'))


@lru_cache(maxsize=1)
def get_client():
    return Groq(timeout=30, max_retries=0)


class ImportRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)


class ManualProductRequest(ImportRequest):
    description: str = Field(min_length=5, max_length=5000)


class PageImportRequest(ImportRequest):
    html: str = Field(min_length=1, max_length=2_000_000)


class ProductAttributes(BaseModel):
    name: Optional[str]
    brand: Optional[str]
    category: Optional[Literal['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories']]
    subcategory: Optional[str]
    color: Optional[str]
    material: Optional[str]
    price: Optional[float] = Field(ge=0, allow_inf_nan=False)
    currency: Optional[str]


def normalized(text):
    return re.sub(r'\s+', ' ', text).strip().casefold()


def analyze_product(data, source_url, method):
    schema = ProductAttributes.model_json_schema()
    schema['additionalProperties'] = False
    evidence_schema = {'type': 'object', 'properties': {
        field: {'type': ['string', 'null']} for field in FIELDS},
        'required': list(FIELDS), 'additionalProperties': False}
    schema['properties']['evidence'] = evidence_schema
    schema['required'] = list(FIELDS) + ['evidence']
    direct = data.get('direct', {})
    evidence = dict(data.get('evidence', {}))
    result = {key: None for key in FIELDS}
    try:
        response = get_client().chat.completions.create(
            model=os.getenv('GROQ_MODEL', 'openai/gpt-oss-20b'), temperature=0,
            messages=[{'role': 'system', 'content': NORMALIZATION_PROMPT},
                {'role': 'user', 'content': data['text']}],
            response_format={'type': 'json_schema', 'json_schema': {
                'name': 'clothing_product', 'strict': True, 'schema': schema}})
        payload = json.loads(response.choices[0].message.content)
        attributes = ProductAttributes.model_validate(payload).model_dump()
        quotes = payload.get('evidence', {})
        source = normalized(data['text'])
        for key, value in attributes.items():
            quote = quotes.get(key)
            if value is not None and isinstance(quote, str) and normalized(quote) and normalized(quote) in source:
                result[key] = value
                evidence[key] = quote[:1000]
        # Explicit product brand and exact price metadata take precedence over AI guesses or omissions.
        for key in ('price', 'currency', 'brand'):
            if key == 'brand' and data.get('brandSource') == 'first_party_store' and result.get('brand'):
                continue
            if direct.get(key) is not None:
                result[key] = direct[key]
                evidence[key] = str(direct[key])
        if not result.get('name') and direct.get('name'):
            result['name'] = direct['name']
            evidence['name'] = evidence.get('name') or str(direct['name'])
    except Exception:
        # Useful structured products can still be imported when AI is unavailable.
        if not data.get('structured') or not direct.get('name'):
            raise HTTPException(502, 'AI analysis is unavailable. Please try importing again shortly.')
        result = {key: direct.get(key) for key in FIELDS}
    if not result.get('name'):
        raise HTTPException(422, 'Could not identify a product on this page. Open the product itself and try the browser extension.')
    result = ProductAttributes.model_validate(result).model_dump()
    return {**result, 'sourceUrl': source_url, 'imageUrl': data.get('imageUrl'),
            'imageUrls': data.get('imageUrls', []),
            'importMethod': method, 'evidence': evidence, 'brandSource': data.get('brandSource')}


@app.post('/import-product')
def import_product(request: ImportRequest):
    validate_url(request.url, resolve=False)
    try:
        html, final_url = fetch_product_page(request.url)
        data = extract_product_data(html, final_url)
        # Metadata/text may exist on a landing shell without meaningful product information.
        if len(json.loads(data['text']).get('visible_product_text', '')) < 30 and not data.get('structured'):
            raise HTTPException(422, 'The product needs browser rendering.')
        method = 'page'
    except HTTPException as error:
        if error.status_code == 400:
            raise
        data = None
        final_url = request.url
        if gemini_reader_enabled():
            try:
                data = read_product_with_gemini(request.url)
                method = 'gemini_url_context'
            except HTTPException:
                pass
        if data is None and hosted_reader_enabled():
            # One hosted attempt instead of another local browser request that the store may block.
            html, final_url = read_product_page(request.url)
            data = extract_product_data(html, final_url)
            method = 'hosted_page'
        elif data is None:
            if 'verification' in str(error.detail) or 'blocked automatic' in str(error.detail):
                raise
            html, final_url = render_product_page(request.url)
            data = extract_product_data(html, final_url)
            method = 'rendered_page'
    return analyze_product(data, final_url, method)


@app.post('/import-product-manual')
def import_product_manual(request: ManualProductRequest):
    validate_url(request.url, resolve=False)
    if len(request.description.strip()) < 5:
        raise HTTPException(400, 'Provide a product description.')
    return analyze_product({'text': request.description.strip(), 'imageUrl': None}, request.url, 'description')


# Short-lived one-use handoff avoids putting page content in URLs or browser history.
_handoffs: Dict[str, tuple] = {}
_handoff_lock = threading.Lock()


def create_handoff(product):
    now = time.monotonic()
    with _handoff_lock:
        for key in list(_handoffs):
            if _handoffs[key][0] <= now:
                del _handoffs[key]
        if len(_handoffs) >= 100:
            raise HTTPException(503, 'Too many pending imports. Please try again shortly.')
        token = secrets.token_urlsafe(32)
        _handoffs[token] = (now + 300, product)
    return token


@app.post('/import-page')
def import_page(request: PageImportRequest):
    # This endpoint analyzes browser-supplied content. It never fetches the source URL.
    validate_url(request.url, resolve=False)
    data = extract_product_data(request.html, request.url)
    product = analyze_product(data, request.url, 'browser_extension')
    return {'importId': create_handoff(product), 'expiresIn': 300}


@app.get('/imports/{token}')
def consume_import(token: str, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    with _handoff_lock:
        entry = _handoffs.pop(token, None)
    if not entry or entry[0] <= time.monotonic():
        raise HTTPException(410, 'This browser import expired or was already opened. Import the product again from the extension.')
    return entry[1]
