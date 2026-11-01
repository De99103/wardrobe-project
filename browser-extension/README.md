# Wardrobe AI browser importing

Local Chrome/Edge extension. No store-specific selectors or copy/paste required.

1. Start the backend on port 8000 and Expo Web on port 8081.
2. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this `browser-extension` folder.
3. Open a product page. Click the extension, select Wardrobe or Wishlist, then **Import Product**.
4. The extension sends product text, product metadata and image links to `http://127.0.0.1:8000/import-page`. The backend analyzes it and opens a review page in Wardrobe AI. Click Save to keep it.

The extension requests temporary access to the tab only when invoked. It does not read cookies, passwords, browser history, screenshots or form field values. Review page text before importing sensitive account pages. It does not solve verification challenges or sign in automatically.

The extension is configured for local development. Production distribution requires the deployed backend/app URLs in popup.js and narrowly scoped backend host permissions in manifest.json. Never embed a Groq API key in the extension. The local backend must stay single-process while a handoff is pending; production needs shared TTL storage and authentication/rate limits.
