// WXT extension config. `entrypoints/` is scanned automatically:
// newtab stub, home UI, ChatGPT/Gemini content scripts.
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'OpenDial',
    short_name: 'OpenDial',
    description:
      'A local new tab dashboard with speed dial, multi-engine search, and browsing shortcuts.',
    version: '0.1.0',
    permissions: [
      'storage',
      'unlimitedStorage', // uploaded PNG data URLs
      'history',
      'topSites',
      'sessions',
      'tabs',
      'favicon',
      'geolocation',
    ],
    host_permissions: [
      'https://api.open-meteo.com/*',
      'https://air-quality-api.open-meteo.com/*',
      'https://geocoding-api.open-meteo.com/*',
      'https://api.bigdatacloud.net/*',
      'https://gemini.google.com/*',
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://api.svgl.app/*', // catalog + SVG download (CORS *)
      'https://svgl.app/*', // preview <img> only
      'https://cdn.jsdelivr.net/*',
      'https://cdn.simpleicons.org/*',
      'https://www.reddit.com/*',
      'https://old.reddit.com/*',
    ],
    action: {
      default_title: 'OpenDial',
    },
  },
});
