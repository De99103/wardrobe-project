# Store-link importing

The Import from Store button first reads public product HTML and structured metadata. If this fails, the backend tries Gemini URL Context, then Firecrawl, then the existing local renderer or browser-extension fallback. Groq still normalizes grounded product evidence into the app's English clothing fields.

## Activate blocked-page retrieval

1. Create a Gemini API key in Google AI Studio.
2. Add `GEMINI_API_KEY=your-key` to `wardrobe-backend/.env`, not frontend configuration. Do not commit it. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` because that model successfully read the Bik Bok test product; `gemini-2.5-flash` was unavailable to the new account and `gemini-3.8-flash` timed out in that test.
3. Optionally add `FIRECRAWL_API_KEY=your-key` as the fallback when Gemini cannot read a page.
4. Restart the backend (an .env change alone may not trigger reload).
5. Paste a store product link in Wearly, choose Wardrobe or Wishlist, and import. Review the selected variant, currency, price and source link before saving.

The integration is covered by provider and route tests. Gemini URL Context was also verified against the exact Bik Bok product that the direct fetch could not read; it returned the selected product and its 1,199 SEK price. Store behavior changes, so do not assume every product on every store will always work.

Only failed direct fetches use a provider. A successful Gemini result is cached in memory for five minutes so collection changes do not repeat the request. Providers receive the public product URL; no Firebase identity, wardrobe contents, browser cookies or credentials are sent. Provider errors are sanitized. Later price monitoring must match the same variant and currency and must bypass this short interactive cache.

Pages requiring login or human verification may still need the browser extension. No automatic CAPTCHA interaction is implemented. Before exposing the backend publicly, add authenticated requests, per-user quotas and a provider spending limit; the current backend is a local development service.

API reference: https://docs.firecrawl.dev/api-reference/endpoint/scrape
