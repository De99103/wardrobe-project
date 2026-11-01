"""Isolated rendering with all external requests routed through the pinned HTTPS fetcher."""
import threading
import time
from fastapi import HTTPException
from safe_fetch import fetch_resource, validate_url

_slots = threading.BoundedSemaphore(2)


def render_product_page(url):
    validate_url(url)
    if not _slots.acquire(blocking=False):
        raise HTTPException(503, 'Product rendering is busy. Please try again shortly.')
    try:
        from playwright.sync_api import sync_playwright, Error
        with sync_playwright() as runtime:
            browser = runtime.chromium.launch(headless=True)
            try:
                context = browser.new_context(service_workers='block', accept_downloads=False)
                context.route_web_socket('**/*', lambda websocket: websocket.close())
                started = time.monotonic()
                count, total = 0, 0

                def handle(route):
                    nonlocal count, total
                    request = route.request
                    count += 1
                    if (time.monotonic() - started > 18 or count > 50 or total > 5_000_000
                            or request.method != 'GET' or request.resource_type in ('image', 'media', 'font')):
                        route.abort()
                        return
                    try:
                        body, _, headers = fetch_resource(request.url, timeout=3, max_bytes=1_000_000, redirects=0)
                        total += len(body)
                        route.fulfill(status=200, body=body, headers={
                            'content-type': headers.get('content-type', 'application/octet-stream')})
                    except HTTPException:
                        route.abort()

                # Resolve the top-level redirects safely before opening the document.
                _, final_url, _ = fetch_resource(url)
                context.route('**/*', handle)
                page = context.new_page()
                page.set_default_timeout(18000)
                page.goto(final_url, wait_until='domcontentloaded', timeout=20000)
                try:
                    page.wait_for_function("() => document.querySelector('h1, script[type=\"application/ld+json\"]') || document.body.innerText.length > 100", timeout=5000)
                except Error:
                    pass
                html = page.content()
                if len(html.encode()) > 2_000_000:
                    raise HTTPException(422, 'Rendered product page is too large.')
                validate_url(page.url, resolve=False)
                return html, page.url
            finally:
                browser.close()
    except ImportError:
        raise HTTPException(503, 'Browser rendering is not installed. Use the browser extension to import this page.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'This page could not be rendered automatically. Use the browser extension on the open product page.')
    finally:
        _slots.release()
