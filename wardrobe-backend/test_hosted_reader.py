import json
import os
import unittest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient
import main
import hosted_reader
from test_universal import HTML, URL


class HostedReaderTests(unittest.TestCase):
    def response(self, payload, status=200):
        response = Mock(status_code=status)
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.iter_content.return_value = [json.dumps(payload).encode()]
        return response

    def read(self, payload, status=200):
        with patch.dict(os.environ, {'FIRECRAWL_API_KEY': 'test-secret'}), \
             patch.object(hosted_reader, 'validate_url'), \
             patch.object(hosted_reader.requests, 'post', return_value=self.response(payload, status)) as post:
            result = hosted_reader.read_product_page(URL)
        self.assertEqual(post.call_args.kwargs['json']['url'], URL)
        self.assertEqual(post.call_args.kwargs['json']['maxAge'], 0)
        self.assertFalse(post.call_args.kwargs['allow_redirects'])
        return result

    def test_html_and_variant_url_are_preserved(self):
        final = URL + '?variant=blue'
        self.assertEqual(self.read({'success': True, 'data': {'rawHtml': HTML, 'metadata': {'url': final}}}), (HTML, final))

    def test_invalid_payloads_fail_cleanly(self):
        for payload in [[], {}, {'success': True, 'data': {}},
                        {'success': True, 'data': {'rawHtml': HTML, 'metadata': {'statusCode': 403}}}]:
            with self.subTest(payload=payload), self.assertRaises(HTTPException):
                self.read(payload)

    def test_provider_error_does_not_leak_credentials(self):
        with self.assertRaises(HTTPException) as error:
            self.read({'error': 'test-secret'}, 401)
        self.assertNotIn('test-secret', str(error.exception.detail))

    def test_private_url_never_reaches_provider(self):
        with patch.object(hosted_reader.requests, 'post') as post, self.assertRaises(HTTPException):
            hosted_reader.read_product_page('https://127.0.0.1/secret')
        post.assert_not_called()

    def test_hosted_fallback_on_blocked_store(self):
        with patch.object(main, 'fetch_product_page', side_effect=HTTPException(422, 'Store blocked automatic access')), \
             patch.object(main, 'gemini_reader_enabled', return_value=False), \
             patch.object(main, 'hosted_reader_enabled', return_value=True), \
             patch.object(main, 'read_product_page', return_value=(HTML, URL)) as reader, \
             patch.object(main, 'render_product_page') as renderer, \
             patch.object(main, 'get_client', side_effect=RuntimeError('offline')):
            response = TestClient(main.app).post('/import-product', json={'url': URL})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['importMethod'], 'hosted_page')
        self.assertEqual(response.json()['sourceUrl'], URL)
        reader.assert_called_once_with(URL)
        renderer.assert_not_called()

    def test_no_hosted_call_for_valid_page_or_invalid_url(self):
        with patch.object(main, 'fetch_product_page', return_value=(HTML, URL)), \
             patch.object(main, 'read_product_page') as reader, \
             patch.object(main, 'get_client', side_effect=RuntimeError('offline')):
            api = TestClient(main.app)
            self.assertEqual(api.post('/import-product', json={'url': URL}).status_code, 200)
            self.assertEqual(api.post('/import-product', json={'url': 'https://localhost/'}).status_code, 400)
        reader.assert_not_called()

    def test_disabled_provider_preserves_extension_fallback(self):
        with patch.object(main, 'fetch_product_page', side_effect=HTTPException(422, 'Store blocked automatic access')), \
             patch.object(main, 'gemini_reader_enabled', return_value=False), \
             patch.object(main, 'hosted_reader_enabled', return_value=False), \
             patch.object(main, 'read_product_page') as reader:
            response = TestClient(main.app).post('/import-product', json={'url': URL})
        self.assertEqual(response.status_code, 422)
        reader.assert_not_called()
