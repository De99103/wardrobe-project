"""Bounded HTTPS retrieval; validated DNS addresses are pinned to the TLS connection."""
import gzip
import http.client
import ipaddress
import socket
import ssl
from urllib.parse import urlparse, urljoin
from fastapi import HTTPException

MAX_BYTES = 2_000_000


def validate_url(url, resolve=True):
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or '').rstrip('.').lower()
        port = parsed.port
        if (len(url) > 2048 or parsed.scheme != 'https' or port not in (None, 443)
                or not host or parsed.username or parsed.password or '\\' in url
                or any(ord(c) < 33 or ord(c) == 127 for c in url)):
            raise ValueError()
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            address = None
        if host == 'localhost' or host.endswith(('.localhost', '.local', '.internal')):
            raise ValueError()
        if address and not address.is_global:
            raise ValueError()
    except ValueError:
        raise HTTPException(400, 'Use a valid public HTTPS product link.')
    if resolve:
        public_addresses(host)
    return url


def public_addresses(host):
    try:
        addresses = list(dict.fromkeys(row[4][0] for row in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)))
    except OSError:
        raise HTTPException(422, 'Could not resolve this store address.')
    if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):
        raise HTTPException(400, 'Private or local destinations cannot be imported.')
    return addresses


def fetch_resource(url, timeout=8, max_bytes=MAX_BYTES, redirects=4):
    current = url
    for _ in range(redirects + 1):
        validate_url(current, resolve=False)
        parsed = urlparse(current)
        host = parsed.hostname.rstrip('.').encode('idna').decode('ascii')
        addresses = public_addresses(host)
        connection = http.client.HTTPSConnection(host, timeout=timeout)
        raw = None
        try:
            # DNS is not repeated by the HTTP library. TLS still authenticates the original host.
            raw = socket.create_connection((addresses[0], 443), timeout=timeout)
            connection.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=host)
            raw = None
            path = parsed.path or '/'
            if parsed.query:
                path += '?' + parsed.query
            connection.request('GET', path, headers={
                'User-Agent': 'WardrobeAI/0.2', 'Accept-Encoding': 'identity',
                'Accept': 'text/html,application/json,text/javascript,text/css;q=0.8,*/*;q=0.5',
            })
            response = connection.getresponse()
            headers = {key.lower(): value for key, value in response.getheaders()}
            if response.status in (301, 302, 303, 307, 308):
                location = headers.get('location')
                if not location:
                    raise HTTPException(422, 'Store returned an invalid redirect.')
                current = urljoin(current, location)
                continue
            if response.status in (401, 403, 429):
                raise HTTPException(422, 'This store blocked automatic access. Use the browser extension to import the open product page.')
            if response.status != 200:
                raise HTTPException(502, f'Store returned HTTP {response.status}.')
            if headers.get('content-encoding', '').lower() == 'gzip':
                stream = gzip.GzipFile(fileobj=response)
            elif headers.get('content-encoding', '').lower() in ('', 'identity'):
                stream = response
            else:
                raise HTTPException(422, 'Unsupported store response encoding.')
            body = stream.read(max_bytes + 1)
            if len(body) > max_bytes:
                raise HTTPException(422, 'Product page is too large to import.')
            return body, current, headers
        except (OSError, http.client.HTTPException, ValueError):
            raise HTTPException(502, 'Could not retrieve this product page.')
        finally:
            connection.close()
            if raw:
                raw.close()
    raise HTTPException(422, 'Too many store redirects.')


def fetch_product_page(url):
    body, final_url, headers = fetch_resource(url)
    if 'text/html' not in headers.get('content-type', '').lower():
        raise HTTPException(422, 'The link does not return a product web page.')
    return body.decode('utf-8', errors='replace'), final_url
