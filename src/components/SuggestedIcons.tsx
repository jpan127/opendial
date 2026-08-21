// Suggested-icon picker inside `DialModal`.
//
// Three rows: SVGL brand mark, Simple Icons slug match, then the site
// favicon. The user picks one row; that choice is not persisted until the
// modal Saves (then it becomes an upload or favicon).
//
// Each row shows a preview thumb, match status, and a link to the catalog
// (or the site itself for favicon). Unmatched SVGL/Simple rows are disabled.
// Until catalogs load, or until the address field has text, this shows a
// short status instead of the list.
//
// `PickSource` is which of those three rows is selected.
import { hostnameOf } from '@/src/lib/format';

// Which suggested row is selected: SVGL, Simple Icons, or favicon.
export type PickSource = 'svgl' | 'simpleicons' | 'favicon';

const SVGL_SITE = 'https://svgl.app';
const SIMPLE_ICONS_SITE = 'https://simpleicons.org';

function svglPage(title: string | null): string {
  if (!title) return SVGL_SITE;
  return `${SVGL_SITE}/?search=${encodeURIComponent(title)}`;
}

function simpleIconsPage(slug: string | null): string {
  if (!slug) return SIMPLE_ICONS_SITE;
  return `${SIMPLE_ICONS_SITE}/?q=${encodeURIComponent(slug)}`;
}

// Three-row suggested list, or a short “looking up / no address” status.
export function SuggestedPanel({
  ready,
  hasAddress,
  pick,
  siteUrl,
  svglOk,
  simpleOk,
  svglHref,
  simpleHref,
  faviconHref,
  svglTitle,
  simpleTitle,
  simpleSlug,
  onPick,
  onSvglError,
  onSimpleError,
}: {
  ready: boolean;
  hasAddress: boolean;
  pick: PickSource;
  siteUrl: string;
  svglOk: boolean;
  simpleOk: boolean;
  svglHref: string | null;
  simpleHref: string | null;
  faviconHref: string | null;
  svglTitle: string | null;
  simpleTitle: string | null;
  simpleSlug: string | null;
  onPick: (pick: PickSource) => void;
  onSvglError: () => void;
  onSimpleError: () => void;
}) {
  if (!ready) {
    return (
      <div className="suggest-card">
        <p className="suggest-kicker">Looking up logos…</p>
        <p className="field-hint">Checking SVGL and Simple Icons.</p>
      </div>
    );
  }
  if (!hasAddress) {
    return (
      <div className="suggest-card">
        <p className="suggest-kicker">No address yet</p>
        <p className="field-hint">Type a site to search SVGL and Simple Icons.</p>
      </div>
    );
  }

  return (
    <div className="suggest-card">
      <div className="suggest-steps" role="radiogroup" aria-label="Suggested icon">
        <SuggestStep
          label="SVGL"
          mark={svglOk ? (pick === 'svgl' ? 'yes' : 'skip') : 'no'}
          detail={svglOk ? (svglTitle ?? 'Matched') : 'Not in the SVGL catalog'}
          previewSrc={svglHref}
          disabled={!svglOk}
          sourceHref={svglPage(svglTitle)}
          sourceLabel="svgl.app"
          onClick={() => onPick('svgl')}
          onImgError={onSvglError}
        />
        <SuggestStep
          label="Simple Icons"
          mark={simpleOk ? (pick === 'simpleicons' ? 'yes' : 'skip') : 'no'}
          detail={simpleOk ? (simpleTitle ?? simpleSlug ?? 'Matched') : 'No slug match for this host'}
          previewSrc={simpleHref}
          disabled={!simpleOk}
          sourceHref={simpleIconsPage(simpleSlug)}
          sourceLabel="simpleicons.org"
          onClick={() => onPick('simpleicons')}
          onImgError={onSimpleError}
        />
        <SuggestStep
          label="Favicon"
          mark={pick === 'favicon' ? 'yes' : 'skip'}
          detail="Site tab icon"
          previewSrc={faviconHref}
          sourceHref={siteUrl || undefined}
          sourceLabel={hostnameOf(siteUrl) ?? 'site'}
          onClick={() => onPick('favicon')}
        />
      </div>
    </div>
  );
}

function SuggestStep({
  label,
  mark,
  detail,
  previewSrc,
  disabled,
  sourceHref,
  sourceLabel,
  onClick,
  onImgError,
}: {
  label: string;
  mark: 'yes' | 'no' | 'skip' | 'wait';
  detail: string;
  previewSrc?: string | null;
  disabled?: boolean;
  sourceHref?: string;
  sourceLabel: string;
  onClick: () => void;
  onImgError?: () => void;
}) {
  return (
    <div className="suggest-row">
      <button
        type="button"
        role="radio"
        aria-checked={mark === 'yes'}
        className={`suggest-step is-${mark}`}
        disabled={disabled}
        onClick={onClick}
      >
        <span className="suggest-step-thumb" aria-hidden>
          {previewSrc ? <img src={previewSrc} alt="" onError={onImgError} /> : null}
        </span>
        <span className="suggest-step-copy">
          <span className="suggest-step-name">{detail}</span>
          <span className="suggest-step-source">{label}</span>
        </span>
      </button>
      {sourceHref ? (
        <a
          className="suggest-step-link"
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${sourceLabel}`}
          aria-label={`Open ${sourceLabel}`}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 5h5v5M19 5l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
