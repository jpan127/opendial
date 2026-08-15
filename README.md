# OpenDial

A personal Chrome new tab page: speed-dial tiles, a compact Google / ChatGPT / Gemini search bar, most-visited domains, recently closed tabs, local time, and weather.

This is **not** on the Chrome Web Store. Load it unpacked. All dials and settings stay in `chrome.storage.local` on your machine.

Chrome cannot override the New Tab page in incognito windows.

---

## Requirements

- Google Chrome (or another Chromium browser)
- [Node.js](https://nodejs.org/) 22 or newer (`npm` comes with it)
- Git (see [Upgrade Git?](#upgrade-git) below)

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

- **Greeting** — click `hello` / your name to edit both words. They are saved locally.
- **Search** — type in the pill and press Enter. The small dropdown on the left picks Google, ChatGPT, or Gemini. Press `/` to focus the bar. There is no mic button.
  - Google: `google.com/search?q=`
  - ChatGPT: `chatgpt.com/?q=` (you need to be signed in)
  - Gemini: opens Gemini and tries to fill the prompt. If Google changes that page, it falls back to Google AI Mode (`udm=50`)
- **Dials** — click a tile to open it. Ctrl/Cmd-click opens a new tab. The dashed **+** tile adds a site. Right-click a tile to edit or delete. Drag tiles to reorder. Icons can be the site favicon, an upload, or an image URL.
- **Most visited** — domains from the last 90 days of history, with visit counts. Chrome’s `topSites` list fills in if history is thin. Hosts already on the dial grid are hidden.
- **Recently closed** — click a row to restore that tab or window (not just reopen the URL).
- **Weather** — uses the browser location, or click the weather to set a city. Click **C** / **F** to switch units. Data from [Open-Meteo](https://open-meteo.com/).
- **Theme** — sun/moon in the top right. Defaults to dark and persists.
- **Backup** — the gear menu exports/imports a JSON file of dials, greeting, theme, and search engine.

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
| `favicon` | Site icons |
| `geolocation` | Local weather; you can set a city instead |
| Host access to Open-Meteo | Weather, no API key |
| Host access to Gemini | Fill the prompt when you search with Gemini |

---

## Publish on GitHub (link a remote)

You already have a local git repo. A **remote** is just a local nickname (usually `origin`) for a GitHub repository URL. You do **not** create a special “remote” object on GitHub — you create a **repository**, then point this folder at it.

### Best way: GitHub CLI (no website first)

You do **not** need to create the repo in the GitHub UI first.

1. Install [GitHub CLI](https://cli.github.com/)
2. In a terminal:

```bash
gh auth login
cd C:\Users\JP\opendial
gh repo create opendial --source=. --public --push
```

That creates `https://github.com/<you>/opendial`, sets `origin`, and pushes `master` in one step.

Use `--private` instead of `--public` if you do not want it public.

### Other way: GitHub website, then link

If you would rather click around:

1. On [github.com/new](https://github.com/new), create a repo named `opendial`
2. Leave it **empty** — do not add a README, `.gitignore`, or license (this repo already has those; adding them on GitHub makes the first push messy)
3. Then in this folder:

```bash
git remote add origin https://github.com/<you>/opendial.git
git push -u origin master
```

HTTPS will prompt you to sign in (a [personal access token](https://github.com/settings/tokens) if GitHub rejects your password). SSH is the same idea with `git@github.com:<you>/opendial.git` if you already use SSH keys.

After that, later updates are:

```bash
git push
```

### Optional: rename `master` to `main`

GitHub’s default branch name is `main`. This repo currently uses `master`. Either is fine. To match GitHub before the first push:

```bash
git branch -m master main
git push -u origin main
```

If you already pushed `master`, you can still rename later in the GitHub repo settings (Settings → General → Default branch).

---

## Upgrade Git?

**You should, but you do not have to in order to push this repo.**

This machine has Git **2.13.0** (2017). `git add`, `commit`, `remote`, and `push` still work. What you lose:

- Nine years of security fixes
- Newer GitHub/HTTPS credential helpers
- Features current tools expect (for example `git commit --trailer`, which 2.13 does not understand)

Install a current [Git for Windows](https://git-scm.com/download/win) (2.47+). After installing, open a **new** terminal and check:

```bash
git --version
```

You want something in the 2.4x / 2.5x range, not 2.13.

The GitHub CLI (`gh`) is separate from Git. Install it from [cli.github.com](https://cli.github.com/) if you want the one-command `gh repo create` flow above.

---

Weather data by [Open-Meteo](https://open-meteo.com/).
