# OpenDial

A personal Chrome new tab page: speed-dial tiles, a compact Google / ChatGPT / Gemini search bar, most-visited domains, recently closed tabs, local time, and weather.

This is **not** on the Chrome Web Store. Load it unpacked. All dials and settings stay in `chrome.storage.local` on your machine.

## Install

1. Clone this repo.
2. `npm install`
3. `npm run build`
4. Open `chrome://extensions`
5. Turn on **Developer mode**
6. **Load unpacked** and select `.output/chrome-mv3`

During development, use `npm run dev` and load `.output/chrome-mv3-dev` instead. A zip for GitHub Releases is `npm run zip`.

Chrome cannot override the New Tab page in incognito windows.

## Permissions

| Permission | Why |
|---|---|
| `storage` / `unlimitedStorage` | Dials, theme, greeting, uploaded icons |
| `history` | Most-visited **domains** and visit counts |
| `topSites` | Fallback list when history is thin |
| `sessions` | Recently closed tabs (click restores the tab) |
| `favicon` | Site icons |
| `geolocation` | Local weather; you can set a city instead |
| Host access to Open-Meteo | Weather, no API key |
| Host access to Gemini | Fill the prompt when you search with Gemini |

## Search

- **Google** — `google.com/search?q=`
- **ChatGPT** — `chatgpt.com/?q=` (you need to be signed in)
- **Gemini** — opens Gemini and tries to fill the prompt. If Google changes the page, it falls back to Google AI Mode (`udm=50`)

Press `/` to focus the search bar.

## Restyle

Colors, glow, grain, fonts, rail width, and tile size live in [`src/theme/tokens.css`](src/theme/tokens.css). Change CSS variables there; components only use `var(--od-*)`.

## Backup

The gear menu exports and imports a JSON file of dials, greeting, theme, and search engine.

Weather data by [Open-Meteo](https://open-meteo.com/).
