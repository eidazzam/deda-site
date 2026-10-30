'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import type {
  AdminBundleDetail,
  AdminBundleInput,
  AdminProductListItem,
} from '@/lib/admin/types';
import { resolveImageUrl } from '@/lib/image';

type Mode = 'create' | 'edit';

type Props = {
  mode: Mode;
  initial?: AdminBundleDetail;
  onSaved?: (bundle: AdminBundleDetail) => void;
};

/**
 * Shared form for creating + editing a bundle. Wraps the scalar fields,
 * the product picker, and the cover image upload. The image upload only
 * works in edit mode (the API needs an existing bundle id), so on create
 * we save first, then let the admin upload the image on the edit page.
 */
export function BundleForm({ mode, initial, onSaved }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initial?.descriptionEn ?? '');
  const [descriptionAr, setDescriptionAr] = useState(initial?.descriptionAr ?? '');
  const [bundlePrice, setBundlePrice] = useState(String(initial?.bundlePrice ?? ''));
  const [originalPrice, setOriginalPrice] = useState(String(initial?.originalPrice ?? ''));
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [productIds, setProductIds] = useState<number[]>(initial?.productIds ?? []);

  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');

  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the product list once — picker uses it to add/remove members.
  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.products.list({ limit: 500 });
        setProducts(res.items);
      } catch (err) {
        toast.error(
          err instanceof AdminApiError ? err.message : 'Could not load products',
        );
      } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  const selected = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as AdminProductListItem[];

  const available = products
    .filter((p) => !productIds.includes(p.id))
    .filter((p) => {
      if (!productFilter.trim()) return true;
      const q = productFilter.toLowerCase();
      return (
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAr.includes(productFilter) ||
        p.slug.includes(q)
      );
    });

  const addProduct = (id: number) => setProductIds((cur) => [...cur, id]);
  const removeProduct = (id: number) =>
    setProductIds((cur) => cur.filter((x) => x !== id));
  const moveProduct = (id: number, dir: -1 | 1) =>
    setProductIds((cur) => {
      const idx = cur.indexOf(id);
      if (idx < 0) return cur;
      const target = idx + dir;
      if (target < 0 || target >= cur.length) return cur;
      const next = cur.slice();
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: AdminBundleInput = {
        slug: slug.trim(),
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        descriptionEn: descriptionEn.trim(),
        descriptionAr: descriptionAr.trim(),
        bundlePrice: Number(bundlePrice) || 0,
        originalPrice: Number(originalPrice) || 0,
        sortOrder: Number(sortOrder) || 0,
        isActive,
        productIds,
      };

      const saved =
        mode === 'create'
          ? await adminApi.bundles.create(payload)
          : await adminApi.bundles.update(initial!.id, payload);

      toast.success('Saved');
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onPickImage = () => fileInputRef.current?.click();

  const onUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initial) return;
    setUploadingImage(true);
    try {
      const updated = await adminApi.bundles.uploadImage(initial.id, file);
      setImageUrl(updated.imageUrl);
      toast.success('Image uploaded');
      onSaved?.(updated);
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onRemoveImage = async () => {
    if (!initial) return;
    if (!window.confirm('Remove the cover image? The bundle will fall back to product images.')) {
      return;
    }
    try {
      await adminApi.bundles.removeImage(initial.id);
      setImageUrl(null);
      toast.success('Image removed');
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Remove failed');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Cover image — edit mode only */}
      {mode === 'edit' ? (
        <section className="border border-border p-6 bg-subtle/30">
          <h2 className="text-xs tracking-widest uppercase text-muted mb-4">
            Cover image
          </h2>
          <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
            <div className="relative w-[200px] aspect-[5/4] bg-bg overflow-hidden border border-border">
              {imageUrl ? (
                <Image
                  src={resolveImageUrl(imageUrl)}
                  alt="Bundle cover"
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-[10px] tracking-widest uppercase text-muted">
                  No image
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Replaces the product-photo grid on the homepage. Cropped to
                5:4 (1400×1120). JPG / PNG / WebP, max 10MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onUploadImage}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onPickImage}
                  disabled={uploadingImage}
                  className="bg-ink text-bg text-xs tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {uploadingImage ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
                </button>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={onRemoveImage}
                    className="border border-border text-xs tracking-widest uppercase px-4 py-2 hover:border-accent hover:text-accent transition-colors"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Scalar fields */}
      <section className="grid sm:grid-cols-2 gap-4">
        <Field label="Slug" hint="URL-safe identifier. e.g. mother-daughter-set.">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputCls}
            required
            disabled={mode === 'edit'}
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Name (English)">
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Name (Arabic)">
          <input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className={inputCls}
            dir="rtl"
            required
          />
        </Field>
        <Field label="Description (English)">
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>
        <Field label="Description (Arabic)">
          <textarea
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
            rows={3}
            className={inputCls}
            dir="rtl"
          />
        </Field>
        <Field label="Bundle price (fils)" hint="1 KWD = 1000 fils.">
          <input
            type="number"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field
          label="Original price (fils)"
          hint="Shown crossed-out. Set higher than bundle price for a saving badge."
        >
          <input
            type="number"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
      </section>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm">Show on homepage</span>
      </label>

      {/* Product picker */}
      <section className="border border-border p-6 bg-subtle/30">
        <h2 className="text-xs tracking-widest uppercase text-muted mb-4">
          Products in this bundle ({productIds.length})
        </h2>

        {productsLoading ? (
          <div className="text-sm text-muted">Loading products…</div>
        ) : (
          <div className="space-y-5">
            {/* Selected (ordered) */}
            {selected.length > 0 ? (
              <ul className="space-y-2">
                {selected.map((p, idx) => (
                  <li
                    key={p.id}
                    className="grid grid-cols-[48px_1fr_auto] gap-3 items-center bg-bg border border-border px-3 py-2"
                  >
                    <div className="relative w-12 h-12 bg-subtle">
                      {p.primaryImage ? (
                        <Image
                          src={resolveImageUrl(p.primaryImage)}
                          alt={p.nameEn}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{p.nameEn}</div>
                      <div className="text-xs text-muted truncate" dir="rtl">
                        {p.nameAr}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveProduct(p.id, -1)}
                        disabled={idx === 0}
                        title="Move up"
                        className="px-2 py-1 text-xs border border-border hover:border-accent disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProduct(p.id, 1)}
                        disabled={idx === selected.length - 1}
                        title="Move down"
                        className="px-2 py-1 text-xs border border-border hover:border-accent disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.id)}
                        title="Remove"
                        className="px-2 py-1 text-xs border border-border hover:border-accent hover:text-accent"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted italic">
                No products selected yet. Pick from the list below.
              </div>
            )}

            {/* Available picker */}
            <div>
              <input
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Search products by name or slug…"
                className={`${inputCls} mb-3`}
              />
              <div className="max-h-72 overflow-auto border border-border bg-bg divide-y divide-border">
                {available.length === 0 ? (
                  <div className="p-3 text-xs text-muted">No matches.</div>
                ) : (
                  available.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addProduct(p.id)}
                      className="w-full grid grid-cols-[40px_1fr_auto] gap-3 items-center text-left px-3 py-2 hover:bg-subtle/50"
                    >
                      <div className="relative w-10 h-10 bg-subtle">
                        {p.primaryImage ? (
                          <Image
                            src={resolveImageUrl(p.primaryImage)}
                            alt={p.nameEn}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{p.nameEn}</div>
                        <div className="text-xs text-muted truncate" dir="rtl">
                          {p.nameAr}
                        </div>
                      </div>
                      <span className="text-[10px] tracking-widest uppercase text-accent">
                        + Add
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {error ? (
        <div className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-ink text-bg text-sm tracking-widest uppercase px-6 py-3 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
        {mode === 'create' ? (
          <span className="text-xs text-muted">
            Upload the cover image after saving.
          </span>
        ) : null}
      </div>
    </form>
  );
}

const inputCls =
  'w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none disabled:bg-subtle disabled:text-muted';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[10px] text-muted mt-1">{hint}</span> : null}
    </label>
  );
}
