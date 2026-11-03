"""Verify Firebase ID tokens before spending AI provider quota."""
import os
import requests
from fastapi import Header, HTTPException


def require_user(authorization: str = Header(default='')):
    if not authorization.startswith('Bearer ') or len(authorization) > 10000:
        raise HTTPException(401, 'Sign in to use AI features.')
    key = os.getenv('FIREBASE_WEB_API_KEY')
    if not key:
        raise HTTPException(503, 'AI sign-in verification is not configured.')
    try:
        response = requests.post(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
            params={'key': key}, json={'idToken': authorization[7:]}, timeout=10)
        if response.status_code == 400:
            raise HTTPException(401, 'Your session expired. Please sign in again.')
        if response.status_code != 200:
            raise HTTPException(503, 'Sign-in verification is temporarily unavailable.')
        users = response.json().get('users', [])
        if not users or not users[0].get('localId') or users[0].get('disabled'):
            raise HTTPException(401, 'Please sign in again.')
        return users[0]['localId']
    except (requests.RequestException, ValueError):
        raise HTTPException(503, 'Sign-in verification is temporarily unavailable.') from None
