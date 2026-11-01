import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch, Mock

from fastapi import HTTPException
from fastapi.testclient import TestClient
import main
import safe_fetch


PRODUCT = dict(name="Dress", brand=None, category="dresses", subcategory=None,
               color=None, material=None, price=0, currency="SEK")


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.api = TestClient(main.app)

    def test_invalid_urls_are_client_errors(self):
        for url in ["https://zara.com:bad/a", "https://[", "http://zara.com/a",
                    "https://a:b@zara.com/a"]:
            with self.subTest(url=url):
                response = self.api.post("/import-product", json={"url": url})
                self.assertEqual(response.status_code, 400)

    def test_manual_import_does_not_depend_on_store_dns(self):
        client = Mock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps({**PRODUCT, "evidence": {"name": "dress", "category": "dress", "price": "0", "currency": "SEK"}})))])
        with patch.object(main, "get_client", return_value=client), \
             patch.object(safe_fetch.socket, "getaddrinfo", side_effect=OSError("offline")):
            response = self.api.post("/import-product-manual", json={
                "url": "https://zara.com/product", "description": "Black dress, price 0 SEK"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["price"], 0)
        self.assertIsNone(response.json()["imageUrl"])

    def test_invalid_ai_output_returns_controlled_error(self):
        client = Mock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps({**PRODUCT, "price": -10})))])
        with patch.object(main, "get_client", return_value=client):
            response = self.api.post("/import-product-manual", json={
                "url": "https://zara.com/product", "description": "Black dress"})
        self.assertEqual(response.status_code, 502)

    def test_private_destinations_are_blocked(self):
        with patch.object(safe_fetch.socket, "getaddrinfo", return_value=[(None, None, None, None, ("127.0.0.1", 443))]):
            with self.assertRaises(HTTPException) as raised:
                main.validate_url("https://zara.com/product")
        self.assertEqual(raised.exception.status_code, 400)

    def test_product_graph_and_relative_image(self):
        html = '<script type="application/ld+json">' + json.dumps({"@graph": [
            {"@type": "Product", "name": "Dress", "image": {"url": "/dress.jpg"}}
        ]}) + '</script>'
        result = main.extract_product_data(html, "https://zara.com/product")
        self.assertEqual(result["imageUrl"], "https://zara.com/dress.jpg")
        self.assertIn("Dress", result["text"])

    def test_verification_page_is_identified_before_ai(self):
        html = '<html><head><title>Verify your browser</title></head><body><iframe src="/interstitial/ic.html"></iframe></body></html>'
        with patch.object(main, "fetch_product_page", return_value=(html, "https://zara.com/product")), \
             patch.object(main, "gemini_reader_enabled", return_value=False), \
             patch.object(main, "hosted_reader_enabled", return_value=False), \
             patch.object(main, "get_client") as client:
            response = self.api.post("/import-product", json={"url": "https://zara.com/product"})
        self.assertEqual(response.status_code, 422)
        self.assertIn("browser verification", response.json()["detail"])
        client.assert_not_called()

    def test_verification_refresh_without_frame_is_detected(self):
        html = '<meta http-equiv="Refresh" content="5; URL=/product?bm-verify=example">'
        with self.assertRaises(HTTPException) as raised:
            main.extract_product_data(html, "https://zara.com/product")
        self.assertIn("browser verification", raised.exception.detail)

    def test_empty_page_does_not_call_ai(self):
        with self.assertRaises(HTTPException) as raised:
            main.extract_product_data("<html></html>", "https://zara.com/product")
        self.assertEqual(raised.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
