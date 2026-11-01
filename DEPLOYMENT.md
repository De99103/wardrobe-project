# Production deployment

Deploy the backend before the frontend because the Expo web build needs the public API URL.

## 1. Backend Vercel project

Use `wardrobe-backend` as the Vercel project root. Configure these environment variables for Production and Preview without committing `.env`:

- `GROQ_API_KEY`
- `GROQ_MODEL` (optional; defaults to `openai/gpt-oss-20b`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional; defaults to `gemini-3.5-flash-lite`)
- `weather_api_key`
- `FIRECRAWL_API_KEY` (optional fallback)
- `CORS_ORIGINS` (set after the frontend URL exists)

After deployment, verify `https://BACKEND_DOMAIN/health` returns `{"status":"ok"}`.

The local Playwright renderer is a best-effort final fallback and is not expected to launch inside a Vercel Function. Direct extraction, Gemini URL Context, and Firecrawl remain available before it.

## 2. Frontend Vercel project

Use `wardrobe-ai` as the Vercel project root. Copy all `EXPO_PUBLIC_FIREBASE_*` values from `.env.local` into Vercel and set:

`EXPO_PUBLIC_API_URL=https://BACKEND_DOMAIN`

These values are embedded during the Expo web build, so redeploy after changing them.

## 3. Connect domains

Set the backend `CORS_ORIGINS` to the exact frontend origin, for example:

`https://wardrobe-ai.vercel.app`

Redeploy the backend. In Firebase Console, add the same frontend hostname (without `https://`) under Authentication > Settings > Authorized domains.

## 4. Production check

In a private browser window:

1. Open the frontend URL.
2. Sign in with a different Google account.
3. Add one manual wardrobe item.
4. Import one store link into the wishlist.
5. Move it to the wardrobe.
6. Request an outfit for a real city.

Before public launch, protect AI endpoints with Firebase ID-token verification and per-user rate limits. A private friend test is acceptable only while the URL is not broadly shared and provider usage limits are set.
