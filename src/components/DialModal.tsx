import { useEffect, useRef, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { faviconUrl, hostnameOf, monogram, normalizeUrl } from '@/src/lib/format';
import { useTheme } from '@/src/lib/storage';
import {
  fetchSimpleIconPng,
  loadSimpleIconsCatalog,
  matchSimpleIcon,
  simpleIconPreviewHref,
  type SimpleIconsCatalog,
} from '@/src/lib/simpleicons';
import {
  fetchSvgAsDataUrl,
  loadSvglCatalog,
  matchSvgl,
  svglIconHref,
  type SvglCatalog,
} from '@/src/lib/svgl';

/** Suggested is a modal-only source. It is never persisted; Save becomes upload or favicon. */
type IconSource = DialIcon['kind'] | 'suggested';

type Props = {
  initial?: Dial | null;
  onSave: (input: { name: string; url: string; icon: DialIcon }) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const ICON_OPTIONS: { kind: IconSource; label: string }[] = [
  { kind: 'suggested', label: 'Suggested' },
  { kind: 'favicon', label: 'Favicon' },
  { kind: 'upload', label: 'Upload' },
  { kind: 'url', label: 'URL' },
];

export function DialModal({ initial, onSave, onDelete, onClose }: Props) {
  const [theme] = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [debouncedUrl, setDebouncedUrl] = useState(initial?.url ?? '');
  const [iconKind, setIconKind] = useState<IconSource>(initialIconTab(initial));
  const [iconUrl, setIconUrl] = useState(initial?.icon.kind === 'url' ? initial.icon.href : '');
  const [upload, setUpload] = useState(initial?.icon.kind === 'upload' ? initial.icon.dataUrl : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [brokenSvgl, setBrokenSvgl] = useState(false);
  const [brokenSimple, setBrokenSimple] = useState(false);
  const [pick, setPick] = useState<'svgl' | 'simpleicons' | 'favicon'>('favicon');
  const [catalog, setCatalog] = useState<SvglCatalog | null>(null);
  const [simpleCatalog, setSimpleCatalog] = useState<SimpleIconsCatalog | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedUrl(url), 200);
    return () => window.clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (iconKind !== 'suggested') return;
    let cancelled = false;
    void Promise.all([loadSvglCatalog(), loadSimpleIconsCatalog()]).then(
      ([svgl, simpleIcons]) => {
        if (cancelled) return;
        setCatalog(svgl);
        setSimpleCatalog(simpleIcons);
        setCatalogReady(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [iconKind]);

  const svglMatch = matchSvgl(debouncedUrl, catalog);
  const svglHref = svglMatch ? svglIconHref(svglMatch, theme) : null;
  const svglOk = Boolean(svglHref) && !brokenSvgl;
  const simpleMatch = matchSimpleIcon(debouncedUrl, simpleCatalog);
  const simpleHref = simpleMatch ? simpleIconPreviewHref(simpleMatch) : null;
  const simpleOk = Boolean(simpleHref) && !brokenSimple;
  const hasAddress = Boolean(debouncedUrl.trim());

  useEffect(() => {
    setBrokenSvgl(false);
    setBrokenSimple(false);
  }, [debouncedUrl]);

  useEffect(() => {
    if (!hasAddress) {
      setPick('favicon');
      return;
    }
    if (svglOk) setPick('svgl');
    else if (simpleOk) setPick('simpleicons');
    else setPick('favicon');
  }, [hasAddress, svglOk, simpleOk, debouncedUrl]);

  const chosenHref =
    pick === 'svgl' && svglOk ? svglHref : pick === 'simpleicons' && simpleOk ? simpleHref : null;

  const previewHref = safeNormalize(url);
  const previewName = name.trim() || hostnameOf(previewHref) || 'New site';
  const previewSrc = previewIconSrc(
    iconKind,
    previewHref,
    upload,
    iconUrl,
    pick === 'favicon' ? null : chosenHref,
    pick === 'favicon' ? previewHref : null,
  );
  const showPreviewImage = Boolean(previewSrc);

  const buildIcon = async (): Promise<DialIcon> => {
    if (iconKind === 'suggested') {
      if (pick === 'svgl' && svglOk && svglHref) {
        const dataUrl = await fetchSvgAsDataUrl(svglHref);
        return { kind: 'upload', dataUrl, via: 'suggested' };
      }
      if (pick === 'simpleicons' && simpleOk && simpleMatch) {
        const dataUrl = await fetchSimpleIconPng(simpleMatch);
        return { kind: 'upload', dataUrl, via: 'suggested' };
      }
      return { kind: 'favicon' };
    }
    if (iconKind === 'upload') {
      if (!upload) throw new Error('Choose an image to upload');
      return { kind: 'upload', dataUrl: upload };
    }
    if (iconKind === 'url') {
      if (!iconUrl.trim()) throw new Error('Icon URL is required');
      return { kind: 'url', href: iconUrl.trim() };
    }
    return { kind: 'favicon' };
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setUpload(String(reader.result));
      setIconKind('upload');
      setBrokenSvgl(false);
      setBrokenSimple(false);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? 'Edit site' : 'Add site'}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (saving) return;
          setSaving(true);
          setError('');
          void (async () => {
            try {
              const normalized = normalizeUrl(url);
              const icon = await buildIcon();
              onSave({
                name: name.trim() || hostnameFrom(normalized),
                url: normalized,
                icon,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not save');
              setSaving(false);
            }
          })();
        }}
      >
        <header className="modal-head">
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {error ? (
          <div className="modal-alert" role="alert">
            <span className="modal-alert-mark" aria-hidden>
              !
            </span>
            <p>{error}</p>
          </div>
        ) : null}

        <div className="modal-body">
          <div className="modal-preview dial-tile" aria-hidden>
            <span className="dial-icon">
              {showPreviewImage ? (
                <img
                  key={previewSrc}
                  src={previewSrc ?? ''}
                  alt=""
                  onError={() => {
                    if (iconKind !== 'suggested') return;
                    if (pick === 'svgl') setBrokenSvgl(true);
                    if (pick === 'simpleicons') setBrokenSimple(true);
                  }}
                />
              ) : (
                <span className="monogram">{monogram(previewName)}</span>
              )}
            </span>
            <span className="dial-name">{previewName}</span>
          </div>

          <div className="modal-fields">
            <label className="modal-field">
              <span>Name</span>
              <input
                ref={firstFieldRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="GitHub"
              />
            </label>
            <label className="modal-field">
              <span>Address</span>
              <input
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setBrokenSvgl(false);
                  setBrokenSimple(false);
                  setError('');
                }}
                placeholder="github.com"
                required
                autoComplete="url"
              />
            </label>

            <div className="modal-field">
              <span className="modal-field-label">Icon</span>
              <div className="modal-seg" role="radiogroup" aria-label="Icon source">
                {ICON_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    role="radio"
                    aria-checked={iconKind === option.kind}
                    className={iconKind === option.kind ? 'is-on' : ''}
                    onClick={() => {
                      setIconKind(option.kind);
                      setBrokenSvgl(false);
                      setBrokenSimple(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {iconKind === 'suggested' ? (
                <SuggestedPanel
                  ready={catalogReady}
                  hasAddress={hasAddress}
                  pick={pick}
                  siteUrl={previewHref}
                  svglOk={svglOk}
                  simpleOk={simpleOk}
                  svglHref={svglOk ? svglHref : null}
                  simpleHref={simpleOk ? simpleHref : null}
                  faviconHref={previewHref ? faviconUrl(previewHref, 128) : null}
                  svglTitle={svglMatch?.title ?? null}
                  simpleTitle={simpleMatch?.title ?? null}
                  simpleSlug={simpleMatch?.slug ?? null}
                  onPick={setPick}
                  onSvglError={() => setBrokenSvgl(true)}
                  onSimpleError={() => setBrokenSimple(true)}
                />
              ) : null}

              {iconKind === 'favicon' ? (
                <p className="field-hint">Uses the site’s tab icon. Type an address to preview it.</p>
              ) : null}

              {iconKind === 'upload' ? (
                <div
                  className={`icon-drop${draggingFile ? ' is-over' : ''}${upload ? ' has-file' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingFile(true);
                  }}
                  onDragLeave={() => setDraggingFile(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDraggingFile(false);
                    const file = event.dataTransfer.files[0];
                    if (file) readFile(file);
                  }}
                >
                  <button type="button" className="icon-drop-btn" onClick={() => fileRef.current?.click()}>
                    {upload ? 'Replace image' : 'Drop an image here, or browse'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) readFile(file);
                    }}
                  />
                </div>
              ) : null}

              {iconKind === 'url' ? (
                <input
                  value={iconUrl}
                  onChange={(event) => {
                    setIconUrl(event.target.value);
                    setBrokenSvgl(false);
                    setBrokenSimple(false);
                  }}
                  placeholder="https://example.com/icon.png"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          {onDelete ? (
            <button type="button" className="danger-btn" onClick={onDelete} disabled={saving}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="text-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}

type PickSource = 'svgl' | 'simpleicons' | 'favicon';

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

function SuggestedPanel({
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

function initialIconTab(initial?: Dial | null): IconSource {
  if (!initial) return 'suggested';
  if (initial.icon.kind === 'upload' && initial.icon.via === 'suggested') return 'suggested';
  return initial.icon.kind;
}

function hostnameFrom(url: string): string {
  return hostnameOf(url) ?? url;
}

function safeNormalize(value: string): string {
  try {
    return normalizeUrl(value);
  } catch {
    return '';
  }
}

function previewIconSrc(
  kind: IconSource,
  pageUrl: string,
  upload: string,
  iconHref: string,
  suggestionHref: string | null,
  faviconPageUrl: string | null,
): string | null {
  if (kind === 'suggested') {
    if (suggestionHref) return suggestionHref;
    if (faviconPageUrl) return faviconUrl(faviconPageUrl, 256);
    return upload || null;
  }
  if (kind === 'upload') return upload || null;
  if (kind === 'url') return iconHref.trim() || null;
  return pageUrl ? faviconUrl(pageUrl, 256) : null;
}
