# Connect Firebase and Google sign-in

The app currently works without Firebase using device storage. The Firebase integration is prepared for **the web app** and stays disabled until all client configuration values are set. Native iOS/Android Google sign-in is not implemented by this change; it needs platform OAuth clients and a native sign-in flow.

1. Create/select a project in Firebase Console and register a **Web app**.
2. Copy its `apiKey`, `authDomain`, `projectId` and `appId` into the matching `EXPO_PUBLIC_FIREBASE_*` variables in `.env.local`. See `.env.example`. These are client identifiers, not Admin/service-account secrets. Never put a service-account key in the frontend.
3. In Authentication > Sign-in method, enable Google and select your project's support email. Add `localhost`, `127.0.0.1` and your deployed hostname to Authorized domains as appropriate.
4. Create a Cloud Firestore database. Publish the included `firestore.rules` using the Firebase Console Rules editor before enabling cloud use. These rules restrict `/users/{uid}/clothing/{id}` to that authenticated owner and validate saved fields. No rules or project configuration have been deployed by this code change.
5. Restart Expo to load environment changes. Open the app in a browser, choose Sign in with Google and select an account.
6. Signed-in saves go to that user's Firestore collection. Signed-out saves remain on the device. Choose **Account > Upload my device items** to copy existing device items into the signed-in account. This is explicit to avoid accidentally uploading another user's device collection.

The source URL (`sourceUrl`) is retained in both local and cloud items and used by **Open store page**. Each user's item ID is a SHA-256 digest of collection status and source URL, so the same product can appear once in Wardrobe and once in Wishlist without overwriting the other. Uploads are retryable and do not delete local copies. Cloud failures surface as errors instead of silently falling back to device storage.

Live Google sign-in, Firestore persistence, and security rules must be tested against the configured project or Firebase Emulator Suite after setup; the client configuration for wardrobe-project-ac378 is now present locally; provider/domain/database/rules setup must still be verified in Firebase Console. The existing AI backend still needs its own authentication and rate limiting before public deployment.

Official setup references: https://firebase.google.com/docs/auth/web/google-signin and https://firebase.google.com/docs/firestore/security/rules-conditions

## iOS and Android later

Use one Firebase project for this product. Register a Web app for the existing browser/Firebase JavaScript integration, plus iOS and Android apps for the native builds. Those registrations share Authentication and Firestore. Native registrations require the final iOS bundle identifier and Android package name from Expo app configuration. Android Google sign-in also needs signing-certificate SHA fingerprints. Native Google sign-in needs a configured native sign-in library and Expo development builds; the current web popup sign-in is not a native sign-in implementation.

The installed Firebase app package requires Node 24.12+. `.nvmrc` selects Node 24; update your local runtime before fresh installs/builds.

## Connection check — 1 November 2026

Client configuration for `wardrobe-project-ac378` is saved in `.env.local`. The public Authentication configuration endpoint returned HTTP 400 `CONFIGURATION_NOT_FOUND`, so Authentication still needs initialization/provider setup in Firebase Console. Live Google sign-in and Firestore access have not been verified.

## Firebase SDK registration

The Firebase wrapper is pinned to 12.19.0 and its core App SDK to 0.16.2, matching the wrapper's declared dependency. The Auth and Firestore peer dependencies must resolve to that same core instance. Mixing App SDK versions causes `Component auth has not been registered yet`. Real-SDK initialization regression tests run as part of `npm test`.

## Readable user profiles and clothing fields

Publish the updated `firestore.rules` after adding profile support, then reload the app while signed in. It creates the previously missing `users/{uid}` document with `uid`, `displayName` (the Google account name) and `updatedAt`. This does not move or delete the existing clothing subcollection. Profile synchronization errors do not block clothing access.

The Firebase Console's document list shows IDs. Select a user document to see its displayName; select a clothing document to see its existing name, color, brand and other fields. Usernames are not used as ownership keys because they may change or collide. Clothing IDs remain stable for duplicate protection; name and color remain editable data rather than database addresses. No live rules were deployed by this local code change.

## Manual clothing entries

Publish the updated `firestore.rules` before saving manual items while signed in.
Manual items use `manual:<UUID>` as their stable source identity because they have
no store URL. The rule accepts only this ID format and one of the seven clothing
categories. Imported HTTPS store links are unchanged. Existing documents need no
migration. Blank optional answers are stored as null, including price (not zero).
The collection hides store links for manual entries. Guest saves use device storage.

Manual entry supports selecting a photo from the local phone/computer. Photos are
resized to JPEG (at most 300,000 base64 characters) before saving. Guest photos are
stored with the local item, so they survive reloads but use device/browser storage
quota. Signed-in saves and explicit device-to-cloud uploads store the compressed
photo directly in the item's imageUrl field in Firestore, as a JPEG data URL.
No Firebase Storage bucket, Storage rules or billing upgrade is needed.

### Enable database photos

Publish the updated `firestore.rules` in **Firestore Database > Rules**. It accepts
bounded JPEG data URLs as well as existing HTTPS image links and still restricts
reads/writes to the authenticated owner. Earlier rules limited imageUrl to 2,000
characters, so they must be updated before saving photos. No live rules have been
deployed by this code change. Existing imported items need no migration.

Photos are capped at 300,023 ASCII bytes including the data URL prefix, comfortably
below Firestore's 1 MiB document limit with the other bounded fields. This is a
small-app compromise: images consume database storage and download quota whenever
items are loaded. Monitor the free quota in Firebase; it is not unlimited. In the
Firestore Indexes > Single field settings, exempt clothing.imageUrl from indexing
(collection group `clothing`, field `imageUrl`); the app never queries by image.
Original full-resolution photos are not uploaded. Guests remain on local storage.

Native Google authentication still remains separate work. Rebuild native development
clients after adding the Expo ImageManipulator dependency/plugin configuration.
