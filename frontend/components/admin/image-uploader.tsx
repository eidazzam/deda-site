'use client';

import { useRef, useState } from 'react';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import type { AdminProductDetail } from '@/lib/admin/types';

type Props = {
  productId: number;
  variantId?: number;
  existing: AdminProductDetail['images'];
  onChange: (images: AdminProductDetail['images']) => void;
};

/**
 * Drag-and-drop or click uploader. Posts one file at a time to the
 * `/api/admin/uploads` endpoint, which converts to WebP server-side
 * with sharp and returns the public URL. Existing images render as a
 * grid with delete buttons.
 */
export function ImageUploader({ productId, variantId, existing, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const res = await adminApi.uploads.upload(file, productId, variantId);
      onChange([
        ...existing,
        {
          id: res.id,
          url: res.url,
          alt: null,
          sortOrder: existing.length,
          variantId: variantId ?? null,
        },
      ]);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f) await upload(f);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void onFiles(e.dataTransfer.files);
  };

  const remove = async (id: number) => {
    if (!window.confirm('Remove this image?')) return;
    try {
      await adminApi.uploads.remove(id);
      onChange(existing.filter((img) => img.id !== id));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
        {existing.map((img) => (
          <div key={img.id} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ''}
              className="w-full aspect-[3/4] object-cover bg-subtle"
            />
            <button
              type="button"
              onClick={() => remove(img.id)}
              className="absolute top-1.5 right-1.5 bg-ink/90 text-bg text-[10px] tracking-widest uppercase px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`aspect-[3/4] border-2 border-dashed grid place-items-center text-[10px] tracking-widest uppercase transition-colors ${
            dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-ink'
          } ${uploading ? 'opacity-50' : ''}`}
          disabled={uploading}
        >
          <span className="text-muted text-center px-2 leading-tight">
            {uploading ? 'Uploading…' : 'Drop or click to upload'}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => {
            void onFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </div>
      {error ? <div className="text-accent text-xs">{error}</div> : null}
    </div>
  );
}
