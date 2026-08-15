import { useEffect, useRef, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { faviconUrl, hostnameOf, monogram, normalizeUrl } from '@/src/lib/format';

type Props = {
  initial?: Dial | null;
  onSave: (input: { name: string; url: string; icon: DialIcon }) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const ICON_OPTIONS: { kind: DialIcon['kind']; label: string }[] = [
  { kind: 'favicon', label: 'Favicon' },
  { kind: 'upload', label: 'Upload' },
  { kind: 'url', label: 'URL' },
];

export function DialModal({ initial, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [iconKind, setIconKind] = useState<DialIcon['kind']>(initial?.icon.kind ?? 'favicon');
  const [iconUrl, setIconUrl] = useState(initial?.icon.kind === 'url' ? initial.icon.href : '');
  const [upload, setUpload] = useState(initial?.icon.kind === 'upload' ? initial.icon.dataUrl : '');
  const [error, setError] = useState('');
  const [draggingFile, setDraggingFile] = useState(false);
  const [brokenPreview, setBrokenPreview] = useState(false);
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

  const previewHref = safeNormalize(url);
  const previewName = name.trim() || hostnameOf(previewHref) || 'New site';
  const previewSrc = previewIconSrc(iconKind, previewHref, upload, iconUrl);
  const showPreviewImage = Boolean(previewSrc) && !brokenPreview;

  const buildIcon = (): DialIcon => {
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
          try {
            const normalized = normalizeUrl(url);
            onSave({
              name: name.trim() || hostnameFrom(normalized),
              url: normalized,
              icon: buildIcon(),
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save');
          }
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

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          {onDelete ? (
            <button type="button" className="danger-btn" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="text-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            {initial ? 'Save' : 'Add site'}
          </button>
        </div>
      </form>
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
  kind: DialIcon['kind'],
  pageUrl: string,
  upload: string,
  iconHref: string,
): string | null {
  if (kind === 'upload') return upload || null;
  if (kind === 'url') return iconHref.trim() || null;
  return pageUrl ? faviconUrl(pageUrl, 256) : null;
}
