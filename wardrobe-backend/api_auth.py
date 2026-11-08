"""Verify Firebase ID tokens before spending AI provider quota."""
import logging
import os
import requests
from fastapi import Header, HTTPException


logger = logging.getLogger(__name__)
SESSION_ERRORS = {'INVALID_ID_TOKEN', 'TOKEN_EXPIRED', 'USER_DISABLED', 'USER_NOT_FOUND', 'INVALID_REFRESH_TOKEN'}

def require_user(authorization: str = Header(default='')):
    if not authorization.startswith('Bearer ') or not authorization[7:].strip() or len(authorization) > 10000:
        raise HTTPException(401, 'Sign in to use AI features.')
    key = os.getenv('FIREBASE_WEB_API_KEY', '').strip()
    if not key:
        logger.error('AI authentication unavailable: set FIREBASE_WEB_API_KEY in the backend environment and restart or redeploy.')
        raise HTTPException(503, 'AI sign-in verification is not configured.')
    try:
        response = requests.post(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
            params={'key': key}, json={'idToken': authorization[7:]}, timeout=10)
        if response.status_code == 400:
            payload = response.json()
            error = payload.get('error', {}) if isinstance(payload, dict) else {}
            message = error.get('message', '') if isinstance(error, dict) else ''
            code = message.split(' : ', 1)[0] if isinstance(message, str) else ''
            if code in SESSION_ERRORS:
                raise HTTPException(401, 'Your session expired. Please sign in again.')
            # Do not log Google's response: it may contain credentials or user data.
            logger.error('Firebase verification rejected the server request. Check FIREBASE_WEB_API_KEY and API restrictions.')
            raise HTTPException(503, 'Sign-in verification is temporarily unavailable.')
        if response.status_code != 200:
            logger.warning('Firebase verification unavailable (HTTP %s).', response.status_code)
            raise HTTPException(503, 'Sign-in verification is temporarily unavailable.')
        users = response.json().get('users', [])
        if not users or not users[0].get('localId') or users[0].get('disabled'):
            raise HTTPException(401, 'Please sign in again.')
        return users[0]['localId']
    except (requests.RequestException, ValueError):
        logger.warning('Firebase verification failed due to a connection or response error.')
        raise HTTPException(503, 'Sign-in verification is temporarily unavailable.') from None
