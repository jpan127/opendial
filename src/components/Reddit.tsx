// Combined Reddit RSS card in the left widget dock.
//
// Subreddits are added on the card. Pills default on (pastel green); click
// to hide a sub until reload (not stored). One network load covers all of
// them (see reddit.ts). Sort is stored and refetches. Refresh is disabled
// for 15 minutes after a successful pull so we do not 429.
import { useEffect, useState, type CSSProperties } from 'react';
import { ageLabel, formatCount, relativeTime, waitMinutesLabel } from '@/src/lib/format';
import { useOverlayScroll } from '@/src/lib/overlayScroll';
import { loadReddit, lookupSubreddit, normalizeSubreddit, prefetchRedditSorts, REDDIT_CACHE_MS } from '@/src/lib/reddit';
import {
  useRedditListHeight,
  useRedditSort,
  useRedditSubs,
} from '@/src/lib/storage';
import { MAX_REDDIT_SUBS } from '@/src/types';
import type { RedditPost, RedditSort } from '@/src/types';

const SORTS: { id: RedditSort; label: string }[] = [
  { id: 'hot', label: 'Hot' },
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Week' },
];

export function Reddit() {
  const [subs, setSubs] = useRedditSubs();
  const [sort, setSort] = useRedditSort();
  const [listHeight] = useRedditListHeight();
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState('');
  const [checking, setChecking] = useState(false);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'empty'>('idle');
  const [blocked, setBlocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const listScroll = useOverlayScroll();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (subs.length === 0) {
      setPosts([]);
      setFetchedAt(null);
      setBlocked(false);
      setStatus('empty');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    let cancelPrefetch: (() => void) | undefined;
    void loadReddit(subs, sort).then((result) => {
      if (cancelled) return;
      setPosts(result.cache?.posts ?? []);
      setFetchedAt(result.cache?.fetchedAt ?? null);
      setBlocked(result.blocked);
      setStatus('ready');
      cancelPrefetch = prefetchRedditSorts(subs, sort);
    });
    return () => {
      cancelled = true;
      cancelPrefetch?.();
    };
  }, [subs, sort]);

  const visible = posts.filter((post) => !hidden.includes(post.sub));
  const cooldownLeft =
    fetchedAt == null ? 0 : Math.max(0, fetchedAt + REDDIT_CACHE_MS - now);
  const refreshLocked = cooldownLeft > 0;
  const loading = status === 'loading';
  const refreshTitle = loading
    ? 'Refreshing…'
    : refreshLocked
      ? `Wait ${waitMinutesLabel(cooldownLeft)} to avoid Reddit rate limits`
      : 'Fetch the feed again';

  const pull = (force: boolean) => {
    if (subs.length === 0) return;
    setStatus('loading');
    void loadReddit(subs, sort, force).then((result) => {
      setPosts(result.cache?.posts ?? []);
      setFetchedAt(result.cache?.fetchedAt ?? null);
      setBlocked(result.blocked);
      setStatus('ready');
      setNow(Date.now());
      if (!force) return;
      prefetchRedditSorts(subs, sort);
    });
  };

  const addSub = () => {
    const name = normalizeSubreddit(draft);
    if (!name) {
      setAddError(draft.trim() ? 'Use a name like television' : '');
      return;
    }
    if (subs.includes(name)) {
      setDraft('');
      setAddError('');
      return;
    }
    if (subs.length >= MAX_REDDIT_SUBS) {
      setAddError(`You can add up to ${MAX_REDDIT_SUBS} subreddits`);
      return;
    }
    setChecking(true);
    setAddError('');
    void lookupSubreddit(name).then((result) => {
      setChecking(false);
      if (result === 'missing') {
        setAddError(`r/${name} doesn’t exist`);
        return;
      }
      if (result === 'private') {
        setAddError(`r/${name} isn’t public`);
        return;
      }
      if (result === 'unknown') {
        setAddError('Couldn’t check that subreddit right now');
        return;
      }
      setSubs((current) => (current.includes(name) ? current : [...current, name]));
      setDraft('');
      setAddError('');
    });
  };

  const pulledClock =
    fetchedAt == null
      ? null
      : new Date(fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <section
      className="reddit-card now-card"
      style={
        {
          '--od-reddit-list-height': `${listHeight}px`,
        } as CSSProperties
      }
    >
      <header className="reddit-head">
        <h2 className="reddit-title">Reddit</h2>
        <div className="reddit-sort widget-no-drag" role="radiogroup" aria-label="Reddit sort">
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={sort === item.id}
              className={sort === item.id ? 'is-on' : ''}
              onClick={() => setSort(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>
      <form
        className="reddit-add widget-no-drag"
        onSubmit={(event) => {
          event.preventDefault();
          addSub();
        }}
      >
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (addError) setAddError('');
          }}
          placeholder="Add r/subreddit"
          aria-label="Add subreddit"
          disabled={checking}
        />
        <button type="submit" disabled={checking || subs.length >= MAX_REDDIT_SUBS}>
          {checking ? '…' : 'Add'}
        </button>
      </form>
      {addError ? <p className="reddit-note reddit-add-error">{addError}</p> : null}
      {subs.length > 0 ? (
        <ul className="reddit-chips od-scroll-x widget-no-drag">
          {subs.map((sub) => {
            const on = !hidden.includes(sub);
            return (
              <li key={sub} className={on ? 'is-on' : ''}>
                <button
                  type="button"
                  className="reddit-chip"
                  aria-pressed={on}
                  title={on ? `Hide r/${sub} until reload` : `Show r/${sub}`}
                  onClick={() =>
                    setHidden((current) =>
                      current.includes(sub)
                        ? current.filter((item) => item !== sub)
                        : [...current, sub],
                    )
                  }
                >
                  r/{sub}
                </button>
                <button
                  type="button"
                  className="reddit-chip-x"
                  aria-label={`Remove r/${sub}`}
                  onClick={() => {
                    setHidden((current) => current.filter((item) => item !== sub));
                    setSubs(subs.filter((item) => item !== sub));
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {subs.length === 0 ? (
        <p className="reddit-note">Add a subreddit to start the feed.</p>
      ) : loading && posts.length === 0 ? (
        <p className="reddit-note">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="reddit-note">
          {blocked ? 'Reddit blocked this request' : 'No posts in this feed'}
        </p>
      ) : (
        <ul
          className={`reddit-list od-scroll${listScroll.scrolling ? ' is-scrolling' : ''}`}
          onScroll={listScroll.onScroll}
        >
          {visible.map((post) => (
            <li key={post.id}>
              <a
                className="reddit-row"
                href={post.url}
                title={post.title}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey) {
                    event.preventDefault();
                    window.open(post.url, '_blank', 'noopener');
                  }
                }}
              >
                <span className="reddit-row-title">{post.title}</span>
                <span className="reddit-row-meta">
                  <span className="reddit-sub">r/{post.sub}</span>
                  <span>{relativeTime(Math.floor(post.updatedAt / 1000))}</span>
                  {post.score != null ? <span>{formatCount(post.score)}</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {subs.length > 0 ? (
        <footer className="reddit-foot">
          <p className="reddit-pulled">
            {fetchedAt == null || pulledClock == null
              ? 'Not pulled yet'
              : `${visible.length} · ${
                  blocked ? 'Last saved' : 'Pulled'
                } ${pulledClock} · ${ageLabel(fetchedAt, now)}`}
          </p>
          <span className="reddit-refresh-wrap widget-no-drag" title={refreshTitle}>
            <button
              type="button"
              className={`reddit-refresh${loading ? ' is-busy' : ''}`}
              aria-label="Refresh Reddit feed"
              disabled={loading || refreshLocked || subs.length === 0}
              onClick={() => pull(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20 12a8 8 0 1 1-2.2-5.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <path
                  d="M20 5v5h-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </span>
        </footer>
      ) : null}
    </section>
  );
}
