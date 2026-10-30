'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { ProductForm, type ProductFormPayload } from '@/components/admin/product-form';
import { adminApi, AdminApiError } from '@/lib/admin/api';

export default function NewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (payload: ProductFormPayload) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await adminApi.products.create(payload);
      toast.success('Product created');
      router.push(`/admin/products/${created.id}`);
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : 'Failed to create';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="px-8 py-10 max-w-4xl">
      <Link
        href="/admin/products"
        className="text-[10px] tracking-widest uppercase text-muted hover:text-ink"
      >
        ← Products
      </Link>
      <h1 className="font-display text-4xl mt-3 mb-8">New product</h1>
      <ProductForm
        mode="create"
        onSubmit={onSubmit}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
