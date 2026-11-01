import json
import unittest
from unittest.mock import Mock, patch
from types import SimpleNamespace
from fastapi import HTTPException
from fastapi.testclient import TestClient
import main
import safe_fetch
from product_extraction import extract_product_data

URL = 'https://independent-shop.example/products/linen-shirt'
PRODUCT = {'@type': 'Product', 'name': 'Linen shirt', 'brand': {'name': 'Small Shop'},
           'color': 'Blue', 'material': '100% linen', 'image': '/shirt.jpg',
           'offers': {'@type': 'Offer', 'price': '0.00', 'priceCurrency': 'SEK'}}
HTML = '<main><h1>Linen shirt</h1><p>Blue shirt made from 100% linen.</p></main><script type="application/ld+json">' + json.dumps(PRODUCT) + '</script>'


def ai_response(**attributes):
    payload = {field: None for field in main.FIELDS}
    payload.update(attributes)
    payload['evidence'] = {key: str(value) if value is not None else None for key, value in payload.items()}
    client = Mock()
    client.chat.completions.create.return_value = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))])
    return client


class UniversalImportTests(unittest.TestCase):
    def setUp(self):
        self.api = TestClient(main.app)

    def test_unfamiliar_store_is_allowed_without_dns_for_capture(self):
        self.assertEqual(safe_fetch.validate_url(URL, resolve=False), URL)

    def test_local_urls_are_never_allowed(self):
        for url in ['https://127.0.0.1/a', 'https://[::1]/a', 'https://localhost/a',
                    'https://192.168.1.1/a', 'https://169.254.169.254/a', 'file:///etc/passwd',
                    'https://user:pass@store.example/a', 'https://store.example:bad/a',
                    'https://store.example/\r\nHost: localhost']:
            with self.subTest(url=url), self.assertRaises(HTTPException):
                safe_fetch.validate_url(url, resolve=False)

    def test_mixed_public_and_private_dns_is_rejected(self):
        rows = [(None, None, None, None, (ip, 443)) for ip in ['93.184.216.34', '10.0.0.1']]
        with patch.object(safe_fetch.socket, 'getaddrinfo', return_value=rows), self.assertRaises(HTTPException):
            safe_fetch.validate_url(URL)

    def test_dns_is_pinned_and_tls_authenticates_original_host(self):
        response = Mock(status=200)
        response.getheaders.return_value = [('Content-Type', 'text/html')]
        response.read.return_value = b'<h1>Product</h1>'
        connection = Mock()
        connection.getresponse.return_value = response
        tls = Mock()
        with patch.object(safe_fetch, 'public_addresses', return_value=['93.184.216.34']), \
             patch.object(safe_fetch.socket, 'create_connection') as connect, \
             patch.object(safe_fetch.ssl, 'create_default_context', return_value=tls), \
             patch.object(safe_fetch.http.client, 'HTTPSConnection', return_value=connection):
            body, _, _ = safe_fetch.fetch_resource(URL)
        self.assertEqual(connect.call_args.args[0], ('93.184.216.34', 443))
        self.assertEqual(tls.wrap_socket.call_args.kwargs['server_hostname'], 'independent-shop.example')
        self.assertIn(b'Product', body)

    def test_redirect_to_private_address_is_rejected(self):
        response = Mock(status=302)
        response.getheaders.return_value = [('Location', 'https://127.0.0.1/private')]
        connection = Mock()
        connection.getresponse.return_value = response
        with patch.object(safe_fetch, 'public_addresses', return_value=['93.184.216.34']), \
             patch.object(safe_fetch.socket, 'create_connection'), \
             patch.object(safe_fetch.ssl, 'create_default_context'), \
             patch.object(safe_fetch.http.client, 'HTTPSConnection', return_value=connection), \
             self.assertRaises(HTTPException) as error:
            safe_fetch.fetch_resource(URL)
        self.assertEqual(error.exception.status_code, 400)

    def test_structured_product_preserves_zero_price_and_image(self):
        data = extract_product_data(HTML, URL)
        self.assertEqual(data['direct']['price'], 0)
        self.assertEqual(data['direct']['currency'], 'SEK')
        self.assertEqual(data['imageUrl'], 'https://independent-shop.example/shirt.jpg')
        self.assertEqual(data['direct']['brand'], 'Small Shop')

    def test_visible_text_without_metadata_is_useful_evidence(self):
        data = extract_product_data('<main>Independent Shop linen shirt. Blue. Price 399 SEK. Pure linen.</main>', URL)
        self.assertIn('399 SEK', data['text'])

    def test_price_range_does_not_become_single_price(self):
        product = {**PRODUCT, 'offers': {'@type': 'AggregateOffer', 'lowPrice': 10, 'highPrice': 50}}
        data = extract_product_data('<script type="application/ld+json">'+json.dumps(product)+'</script>', URL)
        self.assertIsNone(data['direct']['price'])

    def test_missing_initial_content_invokes_renderer(self):
        with patch.object(main, 'fetch_product_page', return_value=('<html></html>', URL)), \
             patch.object(main, 'gemini_reader_enabled', return_value=False), \
             patch.object(main, 'hosted_reader_enabled', return_value=False), \
             patch.object(main, 'render_product_page', return_value=(HTML, URL)) as render, \
             patch.object(main, 'get_client', side_effect=RuntimeError('AI offline')):
            response = self.api.post('/import-product', json={'url': URL})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['importMethod'], 'rendered_page')
        render.assert_called_once()

    def test_no_ai_guess_without_supporting_quote(self):
        client = ai_response(name='Invented dress', material='silk')
        with patch.object(main, 'get_client', return_value=client), self.assertRaises(HTTPException):
            main.analyze_product({'text': 'A blue linen shirt', 'imageUrl': None}, URL, 'page')

    def test_capture_and_one_use_handoff_do_not_fetch_source(self):
        with patch.object(main, 'get_client', side_effect=RuntimeError('offline')), \
             patch.object(main, 'fetch_product_page') as fetch:
            response = self.api.post('/import-page', json={'url': URL, 'html': HTML})
        self.assertEqual(response.status_code, 200, response.text)
        token = response.json()['importId']
        first = self.api.get('/imports/'+token)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.headers['cache-control'], 'no-store')
        self.assertEqual(first.json()['name'], 'Linen shirt')
        self.assertEqual(self.api.get('/imports/'+token).status_code, 410)
        fetch.assert_not_called()

    def test_expired_handoff_is_rejected(self):
        token = main.create_handoff({'name': 'test'})
        with patch.object(main.time, 'monotonic', return_value=10**12):
            self.assertEqual(self.api.get('/imports/'+token).status_code, 410)

    def test_browser_content_is_bounded(self):
        response = self.api.post('/import-page', json={'url': URL, 'html': 'a'*2_000_001})
        self.assertEqual(response.status_code, 422)


if __name__ == '__main__':
    unittest.main()
