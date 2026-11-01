import json
import os
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

import gemini_reader
import main
from test_universal import HTML, URL


PRODUCT = {
    'name': 'Evening wide suit trousers in wool blend',
    'brand': 'Bik Bok',
    'category': 'bottoms',
    'subcategory': 'wide-leg suit trousers',
    'color': 'black',
    'material': 'wool blend',
    'price': 1199,
    'currency': 'SEK',
    'imageUrl': 'https://cdn.example/product.jpg',
    'sourceUrl': URL,
    'evidence': {
        'name': 'Evening vida kostymbyxor i ullblandning',
        'brand': 'Bik Bok',
        'category': 'Byxor',
        'subcategory': 'Kostymbyxor',
        'color': 'Svart',
        'material': 'ullblandning',
        'price': '1 199:-',
        'currency': 'SEK',
    },
}


class GeminiReaderTests(unittest.TestCase):
    def setUp(self):
        with gemini_reader._cache_lock:
            gemini_reader._cache.clear()

    @staticmethod
    def response(product=PRODUCT, status=200):
        payload = {'interaction': {'steps': [{'type': 'model_output', 'content': [
            {'type': 'text', 'text': json.dumps(product)}]}]}}
        response = Mock(status_code=status)
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [json.dumps(payload).encode()]
        return response

    def test_grounded_result_and_cache(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-secret'}, clear=False), \
             patch.object(gemini_reader, 'validate_url'), \
             patch.object(gemini_reader.requests, 'post', return_value=self.response()) as post:
            first = gemini_reader.read_product_with_gemini(URL)
            second = gemini_reader.read_product_with_gemini(URL)
        self.assertEqual(first['direct']['price'], 1199)
        self.assertEqual(first['direct']['category'], 'bottoms')
        self.assertEqual(first['brandSource'], 'gemini_url_context')
        self.assertEqual(first, second)
        post.assert_called_once()
        self.assertEqual(post.call_args.kwargs['json']['tools'], [{'type': 'url_context'}])
        self.assertFalse(post.call_args.kwargs['allow_redirects'])
        self.assertTrue(post.call_args.kwargs['stream'])

    def test_bad_provider_payload_is_sanitized(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-secret'}, clear=False), \
             patch.object(gemini_reader, 'validate_url'), \
             patch.object(gemini_reader.requests, 'post', return_value=self.response(status=401)), \
             self.assertRaises(HTTPException) as error:
            gemini_reader.read_product_with_gemini(URL)
        self.assertEqual(error.exception.status_code, 502)
        self.assertNotIn('test-secret', str(error.exception.detail))

    def test_private_url_never_reaches_provider(self):
        with patch.object(gemini_reader.requests, 'post') as post, self.assertRaises(HTTPException):
            gemini_reader.read_product_with_gemini('https://127.0.0.1/secret')
        post.assert_not_called()

    def test_unsafe_image_is_removed(self):
        product = {**PRODUCT, 'imageUrl': 'http://cdn.example/product.jpg'}
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test-secret'}, clear=False), \
             patch.object(gemini_reader, 'validate_url'), \
             patch.object(gemini_reader.requests, 'post', return_value=self.response(product)):
            result = gemini_reader.read_product_with_gemini(URL)
        self.assertIsNone(result['imageUrl'])

    def test_route_uses_gemini_before_other_fallbacks(self):
        data = gemini_reader._product_data(gemini_reader.GeminiProduct.model_validate(PRODUCT), URL)
        with patch.object(main, 'fetch_product_page', side_effect=HTTPException(422, 'Store blocked automatic access')), \
             patch.object(main, 'gemini_reader_enabled', return_value=True), \
             patch.object(main, 'read_product_with_gemini', return_value=data) as gemini, \
             patch.object(main, 'read_product_page') as hosted, \
             patch.object(main, 'render_product_page') as renderer, \
             patch.object(main, 'get_client', side_effect=RuntimeError('offline')):
            response = TestClient(main.app).post('/import-product', json={'url': URL})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['importMethod'], 'gemini_url_context')
        self.assertEqual(response.json()['price'], 1199)
        gemini.assert_called_once_with(URL)
        hosted.assert_not_called()
        renderer.assert_not_called()

    def test_gemini_failure_continues_to_firecrawl(self):
        with patch.object(main, 'fetch_product_page', side_effect=HTTPException(422, 'Store blocked automatic access')), \
             patch.object(main, 'gemini_reader_enabled', return_value=True), \
             patch.object(main, 'read_product_with_gemini', side_effect=HTTPException(502, 'failed')), \
             patch.object(main, 'hosted_reader_enabled', return_value=True), \
             patch.object(main, 'read_product_page', return_value=(HTML, URL)) as hosted, \
             patch.object(main, 'get_client', side_effect=RuntimeError('offline')):
            response = TestClient(main.app).post('/import-product', json={'url': URL})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['importMethod'], 'hosted_page')
        hosted.assert_called_once_with(URL)


if __name__ == '__main__':
    unittest.main()
