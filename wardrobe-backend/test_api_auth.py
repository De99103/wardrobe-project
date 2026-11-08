import unittest
from unittest.mock import Mock, patch
import requests
from fastapi import HTTPException
from api_auth import require_user


class ApiAuthTests(unittest.TestCase):
    def check_failure(self, status, payload, expected):
        response = Mock(status_code=status)
        response.json.return_value = payload
        with patch.dict('os.environ', {'FIREBASE_WEB_API_KEY': 'test-key'}), patch('api_auth.requests.post', return_value=response):
            with self.assertRaises(HTTPException) as raised:
                require_user('Bearer test-token')
        self.assertEqual(raised.exception.status_code, expected)

    def test_missing_or_empty_authorization_does_not_contact_firebase(self):
        for authorization in ['', 'Bearer ', 'Bearer    ', 'Basic token']:
            with patch('api_auth.requests.post') as post:
                with self.assertRaises(HTTPException) as raised:
                    require_user(authorization)
                self.assertEqual(raised.exception.status_code, 401)
                post.assert_not_called()

    def test_missing_configuration_is_a_service_error(self):
        with patch.dict('os.environ', {'FIREBASE_WEB_API_KEY': '  '}), patch('api_auth.requests.post') as post:
            with self.assertRaises(HTTPException) as raised:
                require_user('Bearer test-token')
            self.assertEqual(raised.exception.status_code, 503)
            post.assert_not_called()

    def test_invalid_sessions_require_sign_in(self):
        for message in ['INVALID_ID_TOKEN', 'TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND']:
            self.check_failure(400, {'error': {'message': message}}, 401)

    def test_invalid_server_key_does_not_blame_the_session(self):
        self.check_failure(400, {'error': {'message': 'API key not valid. Please pass a valid API key.'}}, 503)
        self.check_failure(403, {}, 503)
        self.check_failure(429, {}, 503)
        self.check_failure(500, {}, 503)

    def test_missing_and_disabled_users_are_rejected(self):
        self.check_failure(200, {'users': []}, 401)
        self.check_failure(200, {'users': [{'localId': 'alice', 'disabled': True}]}, 401)

    def test_valid_user_passes_and_no_credentials_are_logged(self):
        response = Mock(status_code=200)
        response.json.return_value = {'users': [{'localId': 'alice'}]}
        with patch.dict('os.environ', {'FIREBASE_WEB_API_KEY': 'test-key'}), patch('api_auth.requests.post', return_value=response) as post:
            self.assertEqual(require_user('Bearer test-token'), 'alice')
            self.assertEqual(post.call_args.kwargs['json'], {'idToken': 'test-token'})

    def test_connection_failure_does_not_leak_credentials(self):
        with patch.dict('os.environ', {'FIREBASE_WEB_API_KEY': 'test-key'}), patch('api_auth.requests.post', side_effect=requests.ConnectionError('secret-key')):
            with self.assertLogs('api_auth', level='WARNING') as logs:
                with self.assertRaises(HTTPException) as raised:
                    require_user('Bearer test-token')
            self.assertEqual(raised.exception.status_code, 503)
            self.assertNotIn('secret-key', raised.exception.detail)
            self.assertNotIn('secret-key', str(logs.output))
