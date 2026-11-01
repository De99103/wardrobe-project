"""Runs installed Chromium against a deterministic network-intercepted fixture."""
import unittest
from unittest.mock import patch
import browser_renderer

URL = 'https://store.example/product'
HTML = b'''<html><body><main></main><script>setTimeout(() => { document.querySelector('main').innerHTML = '<h1>Blue linen shirt</h1><p>Price 399 SEK. Pure linen.</p>'; }, 100);</script></body></html>'''


class RenderingTests(unittest.TestCase):
    def test_javascript_product_is_rendered(self):
        with patch.object(browser_renderer, 'validate_url', return_value=URL), \
             patch.object(browser_renderer, 'fetch_resource', return_value=(HTML, URL, {'content-type': 'text/html'})):
            html, final = browser_renderer.render_product_page(URL)
        self.assertIn('<h1>Blue linen shirt</h1>', html)
        self.assertEqual(final, URL)


if __name__ == '__main__':
    unittest.main()
