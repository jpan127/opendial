# OpenDial

A personal Chrome new tab page: speed-dial tiles, a compact Google / ChatGPT / Gemini search bar, most-visited domains, recently closed tabs, local time, weather, a small calculator, an optional Reddit RSS card, and note cards in the left dock.

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
- **Widget dock** — left column of cards (clock/weather, Top 10, recently closed, Reddit, notes). Drag a card to reorder. Drag the dock’s right edge to change its width; cards follow. Turn cards off in the gear menu; hiding every card removes the dock. Scrollbars stay hidden until you hover or scroll, and they overlay so layout does not shift.
- **Notes** — **+ Note** at the bottom of the dock adds a card (up to 30). Each has a title and a body of mixed text, bullets, and checklists. Type `- ` or `* ` at the start of a line for a bullet, `[]` for a checklist. Pause on a line and a small icon bubble appears above the caret to change the line type; the square on a checklist marks it done. Drag to reorder like the other cards. Delete from the X on the card (there is no gear toggle).
- **Top 10** — the 10 most-visited domains from the last 90 days, with visit counts. Chrome’s `topSites` list fills in if history is thin. Hosts already on the dial grid are hidden.
- **Recently closed** — click a row to restore that tab or window. The list scrolls inside the card.
- **Clock / Weather** — optional widgets, each its own card, toggled from the gear menu. Drag to reorder like the other dock cards. The clock shows the date, time, and timezone. Weather uses the browser location, or click it to set a city. Shows city and state/region, today’s high/low, rain chance, UV, and US AQI. A **Forecast days** slider adds the next 1–6 days. Temperature unit follows your browser locale (US → °F). Data from [Open-Meteo](https://open-meteo.com/).
- **Reddit** — optional card. Turn it on in the gear menu, then add subreddits on the card (`Add r/subreddit`). OpenDial fetches one combined public RSS feed (`/r/a+b/hot/.rss`). Pills default on (pastel green); click one to hide that sub until you reload the page. Hot / Today / Week is on the card. The footer shows when the feed was last pulled. Refresh is disabled for 15 minutes after a successful pull so Reddit does not rate-limit you. A gear slider sets list height. The list shows every post in the pulled feed (up to 100). If Reddit rate-limits RSS, the card tries the old.reddit listing page once, or keeps the last saved posts. No Reddit login.
- **Calculator** — the keypad icon in the top right, or **Alt+C**. Type an expression and press Enter. History is stored locally. Hide the button from the gear menu. Open/closed state still persists across new tabs.
- **Theme** — sun/moon in the top right. Defaults to dark and persists.
- **Backup** — the gear menu exports/imports a JSON file of dials, greeting, theme, widgets, widget order, notes, tile size, greeting size, search engine, calculator visibility, whether the calculator panel was open, and Reddit settings (not the post cache).

---

## Chrome “OpenDial” footer / Customize Chrome

That bar is **Chrome’s**, not OpenDial. Starting in Chrome 138, Chrome draws a footer on any New Tab page owned by an extension. The extension cannot remove it.

To hide it:

1. Right-click the footer → **Hide footer on New Tab page**, or
2. Click **Customize Chrome** on the footer → under Footer, turn off **Show footer on New Tab page**

---

## Restyle

Colors, glow, grain, fonts, dock width, and tile size live in [`src/theme/tokens.css`](src/theme/tokens.css). Layout and component rules are split under [`entrypoints/home/styles/`](entrypoints/home/styles/).

Change the CSS variables there (`--od-bg`, `--od-glow`, `--od-font-greeting`, `--od-dock-width`, …). Components only use `var(--od-*)`. Dark and light themes are both in that file.

---

## Permissions

| Permission | Why |
|---|---|
| `storage` / `unlimitedStorage` | Dials, theme, greeting, uploaded icons, notes |
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
| Host access to www.reddit.com | Combined public RSS for the Reddit card (fetched from the extension worker; Reddit has no CORS headers) |
| Host access to old.reddit.com | HTML listing fallback if RSS is blocked |

Weather data by [Open-Meteo](https://open-meteo.com/).
