/* global chrome */
const button = document.getElementById('import');
const message = document.getElementById('message');

// Serialized by Chrome and executed only in the tab the user invokes.
function captureProduct() {
  if (location.protocol !== 'https:') throw new Error('Open an HTTPS product page first.');
  const doc = document.implementation.createHTMLDocument('Product');
  doc.title = document.title;
  for (const tag of document.querySelectorAll('meta[property^="og:"], meta[property^="product:"], meta[name="description"], meta[name="brand"], meta[name="product:brand"], meta[name^="twitter:"]')) {
    doc.head.appendChild(tag.cloneNode(true));
  }
  for (const tag of Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 30)) {
    try {
      const script = doc.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(JSON.parse(tag.textContent)).replace(/</g, '\\u003c');
      if (script.textContent.length <= 100000) doc.head.appendChild(script);
    } catch { /* Ignore malformed structured data; visible product text is still usable. */ }
  }
  const region = document.querySelector('main, [itemtype="https://schema.org/Product"]') || document.body;
  const main = doc.createElement('main');
  const brandNode = region.querySelector('[itemprop~="brand"]');
  if (brandNode) {
    const nameNode = brandNode.querySelector('[itemprop~="name"]');
    const brand = doc.createElement('meta');
    brand.setAttribute('property', 'product:brand');
    brand.content = brandNode.getAttribute('content') || (nameNode ? nameNode.innerText : brandNode.innerText);
    if (brand.content) doc.head.appendChild(brand);
  }
  const heading = region.querySelector('h1') || document.querySelector('h1');
  if (heading) {
    const h1 = doc.createElement('h1');
    h1.textContent = heading.innerText;
    main.appendChild(h1);
  }
  const text = doc.createElement('p');
  text.textContent = region.innerText.slice(0, 18000);
  main.appendChild(text);
  // Image links are evidence only; no screenshot, cookies, form values or storage are read.
  if (!doc.querySelector('meta[property="og:image"]')) {
    const images = Array.from(region.querySelectorAll('img')).filter(img => img.naturalWidth >= 200);
    if (images.length) {
      const image = doc.createElement('meta');
      image.setAttribute('property', 'og:image');
      image.content = images[0].currentSrc || images[0].src;
      doc.head.appendChild(image);
    }
  }
  doc.body.appendChild(main);
  return { url: location.href, html: doc.documentElement.outerHTML };
}

button.addEventListener('click', async () => {
  button.disabled = true;
  message.textContent = 'Reading product and analyzing details…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: captureProduct });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response;
    try {
      response = await fetch('http://127.0.0.1:8000/import-page', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results[0].result), signal: controller.signal,
      });
    } finally { clearTimeout(timeout); }
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not analyze this product.');
    if (typeof data.importId !== 'string') throw new Error('Invalid import response.');
    const target = new URL('http://localhost:8081/import-result');
    target.searchParams.set('importId', data.importId);
    target.searchParams.set('status', document.getElementById('collection').value);
    await chrome.tabs.create({ url: target.href });
    message.textContent = 'Product ready. Review it in Wardrobe AI.';
  } catch (error) {
    message.textContent = `${error.message || 'Import failed.'} Check that the backend is running.`;
  } finally { button.disabled = false; }
});
