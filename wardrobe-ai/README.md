# Wardrobe AI

Expo 57 / React Native frontend with a FastAPI and Groq product importer in the sibling `wardrobe-backend` folder.

## Local development

Use Node 24.12 or newer in the Node 24 release line (`nvm use` reads `.nvmrc`). The currently installed Node 23 is outside the supported engine range of React Native/Metro and the installed Firebase app dependency.

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` to the backend address.
3. Start the backend using the instructions below.
4. Run `npm run web` for the browser or `npm start` for Expo.

For a physical phone, use your computer's LAN address in `EXPO_PUBLIC_API_URL`; `127.0.0.1` points to the phone itself. Restart Expo after changing environment variables.

## Backend

From `../wardrobe-backend`:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env
# Set GROQ_API_KEY in .env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

For deployed web clients, set `CORS_ORIGINS` to a comma-separated list of their exact origins. The default permits the local Expo web origins only. Keep the Groq API key on the backend.

## Current behavior

Import a public HTTPS product link from any store. The backend tries standard product metadata and readable page content, with an isolated Chromium rendering fallback for JavaScript pages. Store access restrictions can still prevent automatic retrieval. When a retailer blocks automatic retrieval, use the browser extension on the open product page. See `../browser-extension/README.md` for one-time installation. Pasting a description remains an optional fallback. Review the extracted details and save to Wardrobe or Wishlist. Open **View My Wardrobe & Wishlist** to browse saved items.

Collections persist on this device/browser. Re-saving the same source URL updates the existing item in that collection. Collections do not sync across devices. Photo selection currently provides a preview; photo-based analysis and photo saving are unfinished.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```

Backend regression tests (no external API calls):

```sh
cd ../wardrobe-backend
.venv/bin/python -B -m unittest test_imports test_universal -v
```

See `../REVIEW.md` for review findings and remaining release work.

## Import architecture

`safe_fetch.py` validates every destination and redirect, rejects private/local addresses, and connects to the validated IP while preserving TLS hostname verification. `product_extraction.py` reads JSON-LD Product/ProductGroup, metadata and visible product text. `browser_renderer.py` runs JavaScript in an isolated Chromium context with service workers/WebSockets disabled and network requests routed through the same safe fetcher. It limits page bytes, requests and rendering time.

Groq normalizes the product into the existing response fields and must supply supporting quotes. Unsupported fields become null; missing AI service can fall back to genuine structured-product data. The API includes evidence and importMethod for inspection. Browser-supplied content uses `/import-page` and a five-minute, one-use `/imports/{token}` review handoff. Tokens are shared across React effect remounts by the frontend. Handoff storage is in process; run one backend worker locally.

For production, add authenticated/rate-limited endpoints, a shared TTL handoff store, and isolated browser workers with network-level egress restrictions. Do not deploy the local extension's hardcoded localhost addresses unchanged. Browser verification challenges are reported to the user rather than solved automatically. The extension is a desktop Chrome/Edge workflow; mobile share importing and vision/screenshot analysis are not part of this change.

## Store links, collection organization and Firebase

Each item keeps its original source URL. Use **Open store page** in Wardrobe or Wishlist to return to the product. Collections are grouped by clothing category by default, with category filters and Type/Newest/Name sorting; unknown categories appear under Uncategorized.

Firebase/Google sign-in and user-scoped Firestore adapters are prepared for the web app. They are disabled without Firebase configuration. Follow `FIREBASE_SETUP.md` to connect a project and deploy the included ownership rules. Existing device items are only uploaded when the user explicitly chooses to upload them.
