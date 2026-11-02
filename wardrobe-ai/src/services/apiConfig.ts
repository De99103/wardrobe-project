import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const productionHosts = new Set(['wearly-closet-app.vercel.app', 'wardrobe-ai-six.vercel.app']);
const webHostname = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : null;

// A local .env value must never make it into a deployed build. This fallback
// also keeps Vercel deployments working when the frontend environment variable
// was omitted or still contains the development URL.
export const API_URL = webHostname && productionHosts.has(webHostname)
  && (!configuredApiUrl || /localhost|127\.0\.0\.1/.test(configuredApiUrl))
  ? 'https://wardrobe-backend-seven.vercel.app'
  : configuredApiUrl;
