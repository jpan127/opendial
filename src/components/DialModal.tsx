import { useEffect, useRef, useState } from 'react';
import type { Dial, DialIcon } from '@/src/types';
import { normalizeUrl } from '@/src/lib/format';

type Props = {
  initial?: Dial | null;
  onSave: (input: { name: string; url: string; icon: DialIcon }) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export function DialModal({ initial, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [iconKind, setIconKind] = useState<DialIcon['kind']>(initial?.icon.kind ?? 'favicon');
  const [iconUrl, setIconUrl] = useState(initial?.icon.kind === 'url' ? initial.icon.href : '');
  const [upload, setUpload] = useState(initial?.icon.kind === 'upload' ? initial.icon.dataUrl : '');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <form
        className="modal"
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
        <h2>{initial ? 'Edit site' : 'Add site'}</h2>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="GitHub" />
        </label>
        <label>
          URL
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="github.com"
            required
          />
        </label>
        <fieldset>
          <legend>Icon</legend>
          <label className="radio">
            <input
              type="radio"
              checked={iconKind === 'favicon'}
              onChange={() => setIconKind('favicon')}
            />
            Site favicon
          </label>
          <label className="radio">
            <input
              type="radio"
              checked={iconKind === 'upload'}
              onChange={() => setIconKind('upload')}
            />
            Upload image
          </label>
          {iconKind === 'upload' && (
            <div className="icon-upload">
              <button type="button" className="text-btn" onClick={() => fileRef.current?.click()}>
                {upload ? 'Replace image' : 'Choose image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setUpload(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
              {upload ? <img src={upload} alt="" className="icon-preview" /> : null}
            </div>
          )}
          <label className="radio">
            <input
              type="radio"
              checked={iconKind === 'url'}
              onChange={() => setIconKind('url')}
            />
            Image URL
          </label>
          {iconKind === 'url' && (
            <input
              value={iconUrl}
              onChange={(event) => setIconUrl(event.target.value)}
              placeholder="https://…"
            />
          )}
        </fieldset>
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
