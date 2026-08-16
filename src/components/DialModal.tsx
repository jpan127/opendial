import { useEffect, useRef, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { faviconUrl, hostnameOf, monogram, normalizeUrl } from '@/src/lib/format';
import { useTheme } from '@/src/lib/storage';
import {
  fetchSvgAsDataUrl,
  loadSvglCatalog,
  matchSvgl,
  svglIconHref,
  type SvglCatalog,
  type SvglRow,
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
  const isAdd = !initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [debouncedUrl, setDebouncedUrl] = useState(initial?.url ?? '');
  const [iconKind, setIconKind] = useState<IconSource>(
    isAdd ? 'suggested' : (initial?.icon.kind ?? 'favicon'),
  );
  const [iconUrl, setIconUrl] = useState(initial?.icon.kind === 'url' ? initial.icon.href : '');
  const [upload, setUpload] = useState(initial?.icon.kind === 'upload' ? initial.icon.dataUrl : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [brokenPreview, setBrokenPreview] = useState(false);
  const [catalog, setCatalog] = useState<SvglCatalog | null>(null);
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
    void loadSvglCatalog().then((loaded) => {
      if (cancelled) return;
      setCatalog(loaded);
      setCatalogReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [iconKind]);

  const match = matchSvgl(debouncedUrl, catalog);
  // Catalog URL on svgl.app — fine for <img> preview, not for fetch() (no CORS).
  const suggestionHref = match ? svglIconHref(match, theme) : null;
  const suggestionOk = Boolean(suggestionHref) && !(iconKind === 'suggested' && brokenPreview);

  const previewHref = safeNormalize(url);
  const previewName = name.trim() || hostnameOf(previewHref) || 'New site';
  const previewSrc = previewIconSrc(iconKind, previewHref, upload, iconUrl, suggestionOk ? suggestionHref : null);
  const showPreviewImage = Boolean(previewSrc) && !brokenPreview;

  const buildIcon = async (): Promise<DialIcon> => {
    if (iconKind === 'suggested') {
      if (!match || !suggestionHref || !suggestionOk) return { kind: 'favicon' };
      // Rewrites suggestionHref to api.svgl.app, rasterizes PNG. See svgl.ts.
      const dataUrl = await fetchSvgAsDataUrl(suggestionHref);
      return { kind: 'upload', dataUrl };
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
      setBrokenPreview(false);
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
        aria-labelledby="dial-modal-title"
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
          <div>
            <h2 id="dial-modal-title">{initial ? 'Edit site' : 'Add site'}</h2>
            <p className="modal-kicker">
              {initial ? 'Update how this tile looks on your new tab.' : 'Pin a site to your dial grid.'}
            </p>
          </div>
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
          <div className="modal-preview" aria-hidden>
            <span className="modal-preview-icon">
              {showPreviewImage ? (
                <img
                  key={previewSrc}
                  src={previewSrc ?? ''}
                  alt=""
                  onError={() => setBrokenPreview(true)}
                />
              ) : (
                <span className="monogram">{monogram(previewName)}</span>
              )}
            </span>
            <span className="modal-preview-name">{previewName}</span>
          </div>

          <div className="modal-fields">
            <label className="modal-field">
              Name
              <input
                ref={firstFieldRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="GitHub"
              />
            </label>
            <label className="modal-field">
              Address
              <input
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setBrokenPreview(false);
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
                      setBrokenPreview(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {iconKind === 'suggested' ? (
                <SuggestedPanel
                  catalogReady={catalogReady}
                  hasAddress={Boolean(debouncedUrl.trim())}
                  match={match}
                  href={suggestionHref}
                  broken={!suggestionOk && Boolean(suggestionHref)}
                  onImgError={() => setBrokenPreview(true)}
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
                    setBrokenPreview(false);
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
            {saving ? 'Saving…' : initial ? 'Save' : 'Add site'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SuggestedPanel({
  catalogReady,
  hasAddress,
  match,
  href,
  broken,
  onImgError,
}: {
  catalogReady: boolean;
  hasAddress: boolean;
  match: SvglRow | null;
  href: string | null;
  broken: boolean;
  onImgError: () => void;
}) {
  if (!catalogReady) {
    return <p className="field-hint">Looking up logos…</p>;
  }
  if (!hasAddress) {
    return <p className="field-hint">Type an address to look up a logo.</p>;
  }
  if (!match || !href || broken) {
    return (
      <p className="field-hint">No logo in SVGL — save will use the site favicon.</p>
    );
  }
  return (
    <div className="svgl-suggest">
      <img src={href} alt="" onError={onImgError} />
      <div>
        <p className="svgl-suggest-title">{match.title}</p>
        <p className="field-hint">From SVGL. Save stores a local copy on this tile.</p>
      </div>
    </div>
  );
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
): string | null {
  if (kind === 'suggested') return suggestionHref;
  if (kind === 'upload') return upload || null;
  if (kind === 'url') return iconHref.trim() || null;
  return pageUrl ? faviconUrl(pageUrl, 256) : null;
}
