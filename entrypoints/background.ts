// Privileged Reddit GETs. The new-tab page is chrome-extension:// and
// Reddit does not send Access-Control-Allow-Origin, so page `fetch` is
// CORS-blocked. This worker has host_permissions and can read the body.
import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';

const HOSTS = new Set(['www.reddit.com', 'old.reddit.com']);

type RedditFetchMessage = {
  type: 'opendial.redditFetch';
  url: string;
};

function isRedditFetch(value: unknown): value is RedditFetchMessage {
  return (
    typeof value === 'object' &&
    value != null &&
    (value as { type?: string }).type === 'opendial.redditFetch' &&
    typeof (value as { url?: unknown }).url === 'string'
  );
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isRedditFetch(message)) return;

    let host: string;
    try {
      const parsed = new URL(message.url);
      host = parsed.hostname;
      if (parsed.protocol !== 'https:' || !HOSTS.has(host)) {
        sendResponse({ ok: false, status: 0, text: '' });
        return true;
      }
    } catch {
      sendResponse({ ok: false, status: 0, text: '' });
      return true;
    }

    void fetch(message.url, { credentials: 'omit' })
      .then(async (response) => {
        sendResponse({
          ok: response.ok,
          status: response.status,
          text: await response.text(),
        });
      })
      .catch(() => {
        sendResponse({ ok: false, status: 0, text: '' });
      });

    return true;
  });
});
