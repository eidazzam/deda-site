'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { ImageUploader } from '@/components/admin/image-uploader';
import { ProductForm, type ProductFormPayload } from '@/components/admin/product-form';
import { VariantForm } from '@/components/admin/variant-form';
import { adminApi, AdminApiError } from '@/lib/admin/api';
import type { AdminProductDetail } from '@/lib/admin/types';

export const runtime = 'edge';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);
  // 'create' → showing the add-colour form; number → editing that variant's
  // id; null → no inline form open.
  const [variantFormFor, setVariantFormFor] = useState<'create' | number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await adminApi.products.detail(id);
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 404) {
          router.replace('/admin/products');
          return;
        }
        setError(err instanceof AdminApiError ? err.message : 'Failed to load');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const onSaveForm = async (payload: ProductFormPayload) => {
    setSavingForm(true);
    setError(null);
    try {
      // Variants live behind their own endpoints — strip them from the
      // product PATCH so we don't accidentally overwrite stored data.
      const { variants: _omit, ...rest } = payload;
      void _omit;
      const updated = await adminApi.products.update(id, rest);
      setProduct((curr) => (curr ? { ...curr, ...updated } : curr));
      toast.success('Changes saved');
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingForm(false);
    }
  };

  const onToggleVariant = async (variantId: number) => {
    try {
      const res = await adminApi.products.toggleVariant(variantId);
      setProduct((curr) =>
        curr
          ? {
              ...curr,
              variants: curr.variants.map((v) =>
                v.id === variantId
                  ? { ...v, status: res.status as 'IN_SALE' | 'OUT_OF_STOCK' }
                  : v,
              ),
            }
          : curr,
      );
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Toggle failed');
    }
  };

  // Refetch the product to pick up newly created / edited / deleted
  // variants. Keeps the colour list and the form's internal state in sync
  // without us having to thread variant updates back through React state.
  const refresh = async () => {
    try {
      const data = await adminApi.products.detail(id);
      setProduct(data);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to refresh');
    }
  };

  const onDeleteVariant = async (variantId: number, colorName: string) => {
    if (!window.confirm(`Delete colour "${colorName}"? This cannot be undone.`)) {
      return;
    }
    try {
      await adminApi.products.deleteVariant(variantId);
      toast.success('Colour deleted');
      void refresh();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed');
    }
  };

  const onDelete = async () => {
    if (!product) return;
    if (!window.confirm(`Delete "${product.nameEn}" permanently?`)) return;
    try {
      await adminApi.products.remove(id);
      router.push('/admin/products');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Delete failed');
    }
  };

  if (loading) {
    return <div className="px-8 py-10 text-muted">Loading…</div>;
  }

  if (!product) {
    return (
      <div className="px-8 py-10">
        <div className="text-accent">{error ?? 'Product not found.'}</div>
        <Link
          href="/admin/products"
          className="inline-block mt-4 text-[10px] tracking-widest uppercase text-accent hover:underline"
        >
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-4xl">
      <Link
        href="/admin/products"
        className="text-[10px] tracking-widest uppercase text-muted hover:text-ink"
      >
        ← Products
      </Link>
      <div className="flex items-end justify-between gap-4 mt-3 mb-8">
        <h1 className="font-display text-4xl">{product.nameEn}</h1>
        <button
          onClick={onDelete}
          className="text-[10px] tracking-widest uppercase text-accent hover:underline"
        >
          Delete product
        </button>
      </div>

      <ProductForm
        mode="edit"
        initial={product}
        onSubmit={onSaveForm}
        submitting={savingForm}
        error={error}
      />

      {/* Variants — list + inline create / edit / delete */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-[10px] tracking-widest uppercase text-muted">
            Colours ({product.variants.length})
          </h2>
          {variantFormFor === null ? (
            <button
              type="button"
              onClick={() => setVariantFormFor('create')}
              className="text-[10px] tracking-widest uppercase text-accent hover:underline"
            >
              + Add colour
            </button>
          ) : null}
        </div>

        {variantFormFor === 'create' ? (
          <div className="mb-4">
            <VariantForm
              productId={product.id}
              onSaved={() => {
                setVariantFormFor(null);
                void refresh();
              }}
              onCancel={() => setVariantFormFor(null)}
            />
          </div>
        ) : null}

        <div className="space-y-3 mb-8">
          {product.variants.map((v) =>
            variantFormFor === v.id ? (
              <VariantForm
                key={v.id}
                productId={product.id}
                variant={{
                  id: v.id,
                  colorNameEn: v.colorNameEn,
                  colorNameAr: v.colorNameAr,
                  colorHex: v.colorHex,
                  colorGroup: v.colorGroup,
                  sizes: v.sizes,
                }}
                onSaved={() => {
                  setVariantFormFor(null);
                  void refresh();
                }}
                onCancel={() => setVariantFormFor(null)}
              />
            ) : (
              <div
                key={v.id}
                className="flex items-center justify-between gap-4 border border-border p-3 bg-bg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="inline-block w-8 h-8 rounded-full ring-1 ring-border shrink-0"
                    style={{ backgroundColor: v.colorHex }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {v.colorNameEn} · {v.colorNameAr}
                    </div>
                    <div className="text-xs text-muted truncate">
                      {v.colorGroup.toLowerCase()} · sizes: {v.sizes.join(', ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleVariant(v.id)}
                    className={`text-[10px] tracking-widest uppercase px-3 py-1.5 border ${
                      v.status === 'IN_SALE'
                        ? 'border-border bg-bg hover:border-ink'
                        : 'border-accent/40 bg-accent/10 text-accent'
                    }`}
                  >
                    {v.status === 'IN_SALE' ? 'In sale' : 'Sold out'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariantFormFor(v.id)}
                    className="text-[10px] tracking-widest uppercase px-3 py-1.5 border border-border hover:border-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteVariant(v.id, v.colorNameEn)}
                    className="text-[10px] tracking-widest uppercase px-3 py-1.5 border border-border hover:border-accent hover:text-accent"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Images */}
      <section className="mt-12">
        <h2 className="text-[10px] tracking-widest uppercase text-muted mb-4 pb-2 border-b border-border">
          Images ({product.images.length})
        </h2>
        <ImageUploader
          productId={product.id}
          existing={product.images}
          onChange={(images) =>
            setProduct((curr) => (curr ? { ...curr, images } : curr))
          }
        />
        <p className="text-xs text-muted mt-3">
          Images are converted to WebP server-side and stored under
          <code className="mx-1 bg-subtle px-1.5 py-0.5">/uploads/products/{product.slug}/</code>
          — Nginx serves them directly.
        </p>
      </section>
    </div>
  );
}
