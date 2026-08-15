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
      'unlimitedStorage',
      'history',
      'topSites',
      'sessions',
      'favicon',
      'geolocation',
    ],
    host_permissions: [
      'https://api.open-meteo.com/*',
      'https://geocoding-api.open-meteo.com/*',
      'https://gemini.google.com/*',
    ],
    action: {
      default_title: 'OpenDial',
    },
  },
});
