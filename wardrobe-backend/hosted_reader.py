"""Optional server-side page retrieval. Never expose provider credentials to clients."""
import json
import os
import threading
import time

import requests
from fastapi import HTTPException
from safe_fetch import validate_url

_slots = threading.BoundedSemaphore(2)
MAX_RESPONSE_BYTES = 4_000_000


def hosted_reader_enabled():
    return bool(os.getenv('FIRECRAWL_API_KEY', '').strip())


def read_product_page(url):
    validate_url(url)
    key = os.getenv('FIRECRAWL_API_KEY', '').strip()
    if not key:
        raise HTTPException(503, 'Automatic page reader is not configured.')
    if not _slots.acquire(blocking=False):
        raise HTTPException(503, 'Product importing is busy. Please try again shortly.')
    try:
        started = time.monotonic()
        with requests.post('https://api.firecrawl.dev/v2/scrape',
                headers={'Authorization': 'Bearer ' + key},
                json={'url': url, 'formats': ['rawHtml'], 'onlyMainContent': False,
                      'timeout': 25000, 'maxAge': 0, 'proxy': 'auto',
                      'parsers': [], 'location': {'country': 'SE', 'languages': ['sv-SE', 'en-US']}},
                timeout=(5, 30), stream=True, allow_redirects=False) as response:
            if response.status_code != 200:
                # Provider error payloads may contain account details; do not forward them.
                raise HTTPException(502, 'The automatic page reader is unavailable. Try again later or import the open page with the browser extension.')
            body = bytearray()
            for chunk in response.iter_content(65536):
                body.extend(chunk)
                if len(body) > MAX_RESPONSE_BYTES or time.monotonic() - started > 35:
                    raise HTTPException(502, 'The automatic page reader exceeded its response limit.')
        payload = json.loads(body)
        data = payload.get('data') if isinstance(payload, dict) else None
        if payload.get('success') is not True or not isinstance(data, dict):
            raise ValueError('Invalid result')
        html = data.get('rawHtml')
        metadata = data.get('metadata') or {}
        if not isinstance(metadata, dict):
            raise ValueError('Invalid metadata')
        status = metadata.get('statusCode', 200)
        if not isinstance(status, int) or status >= 400:
            raise ValueError('Store page unavailable')
        final_url = metadata.get('url') or metadata.get('sourceURL') or url
        if not isinstance(final_url, str):
            raise ValueError('Invalid URL')
        validate_url(final_url, resolve=False)
        if not isinstance(html, str) or not html.strip() or len(html.encode()) > 2_000_000:
            raise ValueError('Missing product page')
        return html, final_url
    except (requests.RequestException, ValueError, TypeError, AttributeError):
        raise HTTPException(502, 'Could not read this store page automatically. Try the browser extension on the open product page.') from None
    finally:
        _slots.release()
