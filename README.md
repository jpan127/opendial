# OpenDial

A personal Chrome new tab page: speed-dial tiles, a compact Google / ChatGPT / Gemini search bar, most-visited domains, recently closed tabs, local time, weather, and a small calculator.

This is **not** on the Chrome Web Store. Load it unpacked. All dials and settings stay in `chrome.storage.local` on your machine.

Chrome cannot override the New Tab page in incognito windows.

---

## Requirements

- Google Chrome (or another Chromium browser)
- [Node.js](https://nodejs.org/) 22 or newer (`npm` comes with it)

---

## Install (load unpacked)

From this repo:

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `opendial/.output/chrome-mv3` folder

Open a new tab. OpenDial should replace Chrome’s default New Tab page.

If you already loaded it and you rebuild, click **Reload** on the extension card.

---

## Development

```bash
npm install
npm run dev
```

Load unpacked from `.output/chrome-mv3-dev` instead of `.output/chrome-mv3`. WXT reloads the extension when files change.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build → `.output/chrome-mv3` |
| `npm run zip` | Zip for a GitHub Release |
| `npm run compile` | Typecheck only (`tsc --noEmit`) |

---

## Using OpenDial

- **Greeting** — click `hello` / your name to edit both words. Press Enter or click outside to save. Escape cancels. Greeting size is a slider in the gear menu.
- **Search** — type in the pill and press Enter. The dropdown on the left picks Google, ChatGPT, or Gemini. Press `/` to focus the bar when it is not already focused. Press Tab / Shift+Tab in the field to cycle engines. There is no mic button.
  - Google: `google.com/search?q=`
  - ChatGPT / Gemini: OpenDial opens the site and fills the prompt box (you need to be signed in)
- **Dials** — click a tile to open it. Ctrl/Cmd-click opens a new tab. The dashed **+** tile adds a site. Right-click a tile to edit or delete. Drag tiles to reorder. Icon choices: **Suggested** (SVGL, then Simple Icons, then the site favicon), the site’s favicon, an uploaded image, or an image URL. Suggested logos are downloaded once and stored as local PNGs. Tile size is a slider in the gear menu.
- **Top 10** — the 10 most-visited domains from the last 90 days, with visit counts. Click the header to collapse, or turn the section off in the gear menu. Turning both sidebar sections off hides the rail. Chrome’s `topSites` list fills in if history is thin. Hosts already on the dial grid are hidden.
- **Recently closed** — sits directly under Top 10. Click a row to restore that tab or window. Click the header to collapse, or turn the section off in the gear menu.
- **Clock / Weather** — optional widgets in the top left, toggled from the gear menu. They share one card. The clock shows the date, time, and timezone. Weather uses the browser location, or click it to set a city. Shows city and state/region, today’s high/low, rain chance, UV, and US AQI. A **Forecast days** slider adds the next 1–6 days. Click **°C** / **°F** to switch units. Data from [Open-Meteo](https://open-meteo.com/).
- **Calculator** — the keypad icon in the top right, or **Alt+C**. Type an expression and press Enter. History is stored locally. Whether the panel is open persists across new tabs.
- **Theme** — sun/moon in the top right. Defaults to dark and persists.
- **Backup** — the gear menu exports/imports a JSON file of dials, greeting, theme, widgets, sidebar sections, tile size, greeting size, search engine, and calculator open state.

---

## Chrome “OpenDial” footer / Customize Chrome

That bar is **Chrome’s**, not OpenDial. Starting in Chrome 138, Chrome draws a footer on any New Tab page owned by an extension. The extension cannot remove it.

To hide it:

1. Right-click the footer → **Hide footer on New Tab page**, or
2. Click **Customize Chrome** on the footer → under Footer, turn off **Show footer on New Tab page**

---

## Restyle

Colors, glow, grain, fonts, rail width, and tile size live in [`src/theme/tokens.css`](src/theme/tokens.css).

Change the CSS variables there (`--od-bg`, `--od-glow`, `--od-font-greeting`, `--od-rail-width`, …). Components only use `var(--od-*)`. Dark and light themes are both in that file.

---

## Permissions

| Permission | Why |
|---|---|
| `storage` / `unlimitedStorage` | Dials, theme, greeting, uploaded icons |
| `history` | Most-visited **domains** and visit counts |
| `topSites` | Fallback list when history is thin |
| `sessions` | Recently closed tabs (click restores the tab) |
| `tabs` | Titles/URLs for recently closed tabs |
| `favicon` | Site icons (favicons) |
| `geolocation` | Local weather; you can set a city instead |
| Host access to Open-Meteo | Weather and air quality, no API key |
| Host access to BigDataCloud | Reverse-geocode GPS to city/state |
| Host access to ChatGPT / Gemini | Fill the prompt when you search with those engines |
| Host access to SVGL | Suggested brand logos |
| Host access to jsDelivr / Simple Icons | Fallback suggested logos |

Weather data by [Open-Meteo](https://open-meteo.com/).
