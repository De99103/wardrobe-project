import base64
import unittest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from photo_analysis import PhotoRequest, analyze_photo


class PhotoTests(unittest.TestCase):
    def test_invalid_photo_is_rejected_before_provider_call(self):
        with patch('photo_analysis.requests.post') as post:
            with self.assertRaises(HTTPException):
                analyze_photo(PhotoRequest(image='data:image/jpeg;base64,bm90LWpwZWc='))
            post.assert_not_called()

    def test_returns_editable_details(self):
        response = Mock()
        response.json.return_value = {'candidates': [{'content': {'parts': [{'text': '{"category":"tops","name":"Blue shirt","subcategory":"shirt","color":"blue"}'}]}}]}
        photo = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xfftest').decode()
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test'}), patch('photo_analysis.requests.post', return_value=response):
            result = analyze_photo(PhotoRequest(image=photo))
        self.assertEqual(result.category, 'tops')
        self.assertEqual(result.color, 'blue')

    def test_provider_failure_has_safe_error(self):
        photo = 'data:image/jpeg;base64,' + base64.b64encode(b'\xff\xd8\xfftest').decode()
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test'}), patch('photo_analysis.requests.post', side_effect=ValueError('secret')):
            with self.assertRaises(HTTPException) as error:
                analyze_photo(PhotoRequest(image=photo))
        self.assertEqual(error.exception.status_code, 502)
        self.assertNotIn('secret', error.exception.detail)
