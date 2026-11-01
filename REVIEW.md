# Wardrobe AI review — 31 October 2026

Reviewed the existing Expo frontend and FastAPI backend in `/Users/deemaabogheda/Desktop/wardrobe-project`. The initially selected Codex folder under Documents was empty. Existing uncommitted changes were preserved.

## Findings addressed

- **High: native startup could remain on the splash screen.** `_layout.tsx` prevented automatic hiding without ever hiding it. Removed that call so Expo handles startup normally.
- **High: no usable collection saving flow.** Import results only displayed data; `wardrobe.tsx` was a placeholder. Added local persistent wardrobe/wishlist storage, explicit Save actions, collection navigation, duplicate updating, loading/error/retry states, and safe handling of unreadable saved data.
- **Medium: TypeScript failed.** The home screen referenced a missing error style. Added the style.
- **Medium: malformed product URLs could cause unhandled backend errors.** Catch URL parsing and port errors and return HTTP 400. Match the supported-store validation in the frontend.
- **Medium: manual fallback unnecessarily depended on retailer DNS.** Keep store-link validation, but do not resolve the retailer when analyzing pasted text.
- **Medium: API requests could wait indefinitely or display raw JSON parse errors.** Added a 60-second frontend timeout, clear invalid-response messages and response-shape validation. Groq calls now have a 30-second timeout without automatic retries.
- **Medium: AI output was trusted without server validation.** Validate category, nullable fields and nonnegative finite prices before returning a product.
- **Medium: lint was not configured.** Added Expo lint tooling and fixed the starter theme hook's hydration effect error using `useSyncExternalStore`.
- Added pinned backend requirements, environment examples, configurable CORS origins, backend ignore rules and project-specific setup instructions. Removed unconditional product debug dumps and the raw API viewer from the normal result screen.

## Verification

- **Passed:** TypeScript (`npm run typecheck`), ESLint (`eslint . --no-cache`), and Git whitespace checks.
- Five frontend tests cover URL validation, duplicate/concurrent saves, corrupt storage recovery, API response failures and timeouts.
- Six backend tests cover malformed URLs, private destinations, manual import without DNS, invalid AI output, structured-product extraction and empty pages.
- **Passed:** Expo static web export (six routes). Native device behavior and live retailer/Groq integration require separate verification; regression tests mock external services and browser/device storage.

## Remaining release work

1. **Dependency advisories remain.** The initial full npm audit reported 31 affected package entries (2 low, 24 moderate, 5 high), including transitive development tools. After classifying lint tooling as development dependencies, `npm audit --omit=dev` still reports 18 affected entries (2 low, 11 moderate, 5 high); Expo tooling remains in that tree because Expo is an application dependency. The decoder used through Expo Router and Zod used through Expo CLI are among the findings. The report proposes incompatible major-version changes/downgrades for several paths. A supported SDK/dependency upgrade needs its own compatibility and device testing; no forced overrides were applied.
2. **Runtime versions need attention.** This machine runs Node 23.11, outside the installed React Native/Metro engine range. Added `.nvmrc` for Node 22 and declared supported engines. The existing Python 3.9 virtual environment also emits an urllib3/LibreSSL warning; rebuild it with a maintained Python/OpenSSL installation.
3. **Photo importing is unfinished.** Selecting a photo only previews it. The app now says so explicitly.
4. **Retailer imports are best effort.** JavaScript-only or blocked product pages still require manual description analysis. Parser changes cannot supply absent HTML product data.
5. **Deployment needs backend protection.** There is no authentication or rate limiting around paid AI calls. Add these before exposing the backend publicly. CORS alone does not provide access control.
6. **Collections are local only.** No accounts, cloud sync, editing or removal UI are implemented. Backend source also has no Git repository of its own in this checkout.

Implementation references: [Expo SDK 57 splash behavior](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/) and [Expo SDK 57 persistent storage](https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/).

## Live Zara import check — 1 November 2026

Reproduced the specific Zara metallic top link from the app. The backend received 2,467 characters of a verification interstitial with `bm-verify` and `/interstitial/ic.html`, not product HTML. Added explicit detection, an actionable explanation and regression coverage. This does not enable automatic access to blocked retailers.

Verified the running manual import endpoint against Groq using the public product description from the user's open Zara page: HTTP 200, Zara metallic top, pastel blue, 399 SEK, 65% polyester and 35% metallized fiber. The fallback provides no product image. Improved the result-screen instructions and button accessibility.

## General importer implementation — 1 November 2026

Replaced the five-store allowlist with public HTTPS product URLs. Added DNS-pinned HTTPS retrieval with redirect validation and size limits; store-independent JSON-LD/metadata/text extraction; isolated Chromium rendering for JavaScript shells; AI extraction with supporting quotes and nulls for unsupported fields; and a local Chrome/Edge extension for importing product content already visible in a browser. Added expiring one-use review handoffs and frontend support.

Chromium was installed in the backend environment and successfully rendered a dynamic product fixture. Live Groq analysis of captured fixture content returned HTTP 200. Automated tests cover unfamiliar domains, private/mixed DNS, pinned connections, private redirects, structured price zero, ambiguous price ranges, dynamic rendering orchestration, unsupported AI output, bounded capture input and handoff expiration/consumption.

The extension source is provided in `browser-extension`; installation requires the user's Chrome Developer mode/Load unpacked action. No extension was silently installed. It is configured for localhost ports 8000 and 8081. This removes manual product-text entry for the desktop browser workflow, but does not promise backend access to every retailer or implement a mobile share extension. The earlier dependency advisories, runtime version issues and production access-control requirements still apply.
