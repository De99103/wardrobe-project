import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Wearly | Digital Wardrobe & AI Outfit Planner</title>
        <meta name="description" content="Wearly is a digital wardrobe and AI outfit planner. Organize the clothes you own, save a wishlist, and get weather-aware outfit ideas." />
        <meta name="theme-color" content="#F6F3EE" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wearly-closet-app.vercel.app/" />
        <meta property="og:site_name" content="Wearly" />
        <meta property="og:title" content="Wearly – Digital Wardrobe & AI Outfit Planner" />
        <meta property="og:description" content="Organize the clothes you own and get weather-aware AI outfit ideas." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Wearly – Digital Wardrobe & AI Outfit Planner" />
        <meta name="twitter:description" content="Organize the clothes you own and get weather-aware AI outfit ideas." />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Wearly',
          url: 'https://wearly-closet-app.vercel.app/',
          inLanguage: ['en', 'ar'],
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'Web, iOS, Android',
          description: 'Digital wardrobe and AI outfit planner with weather-aware recommendations.',
          author: { '@type': 'Person', name: 'Deema Abo Gheda' },
        }) }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
