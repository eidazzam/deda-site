'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { adminApi, AdminApiError } from '@/lib/admin/api';
import type { ColorGroup } from '@/lib/api/types';

const COLOR_GROUPS: ColorGroup[] = [
  'WHITE',
  'BLACK',
  'GRAY',
  'BEIGE',
  'BROWN',
  'BLUE',
  'GREEN',
  'RED',
  'YELLOW',
  'PURPLE',
  'ORANGE',
  'MULTI',
];

// The canonical abaya size set the storefront expects. The user can
// edit the comma-list freely if a variant needs a different range.
const DEFAULT_SIZES = '50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 62';

type Props = {
  productId: number;
  // When present, the form edits the existing variant; otherwise it creates.
  variant?: {
    id: number;
    colorNameEn: string;
    colorNameAr: string;
    colorHex: string;
    colorGroup: ColorGroup;
    sizes: string[];
  };
  onSaved: () => void;
  onCancel: () => void;
};

/**
 * Inline form for adding or editing a single colour variant on a
 * product. Mirrors the backend variantInputSchema in lib/admin/api.
 */
export function VariantForm({ productId, variant, onSaved, onCancel }: Props) {
  const isEdit = Boolean(variant);
  const [colorNameEn, setColorNameEn] = useState(variant?.colorNameEn ?? '');
  const [colorNameAr, setColorNameAr] = useState(variant?.colorNameAr ?? '');
  const [colorHex, setColorHex] = useState(variant?.colorHex ?? '#000000');
  const [colorGroup, setColorGroup] = useState<ColorGroup>(variant?.colorGroup ?? 'BLACK');
  const [sizesText, setSizesText] = useState(
    variant?.sizes.join(', ') ?? DEFAULT_SIZES,
  );
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sizes = sizesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (sizes.length === 0) {
      toast.error('At least one size is required');
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
      toast.error('Hex must be #RRGGBB (6 chars)');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        colorNameEn: colorNameEn.trim(),
        colorNameAr: colorNameAr.trim(),
        colorHex,
        colorGroup,
        sizes,
      };
      if (isEdit && variant) {
        await adminApi.products.updateVariant(variant.id, body);
        toast.success('Colour updated');
      } else {
        await adminApi.products.addVariant(productId, body);
        toast.success('Colour added');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="border border-border bg-subtle/30 p-4 space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Colour name (English)">
          <input
            value={colorNameEn}
            onChange={(e) => setColorNameEn(e.target.value)}
            placeholder="Olive"
            className={inputCls}
            required
            maxLength={60}
          />
        </Field>
        <Field label="Colour name (Arabic)">
          <input
            value={colorNameAr}
            onChange={(e) => setColorNameAr(e.target.value)}
            placeholder="زيتى"
            dir="rtl"
            className={inputCls}
            required
            maxLength={60}
          />
        </Field>
        <Field label="Hex (#RRGGBB)">
          <div className="flex gap-2">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-9 w-12 border border-border bg-bg cursor-pointer"
            />
            <input
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#000000"
              className={`${inputCls} flex-1 font-mono`}
              maxLength={7}
            />
          </div>
        </Field>
        <Field label="Colour group">
          <select
            value={colorGroup}
            onChange={(e) => setColorGroup(e.target.value as ColorGroup)}
            className={inputCls}
          >
            {COLOR_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g[0] + g.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Sizes (comma-separated)" hint="e.g. 50, 51, 52 … 60, 62">
        <input
          value={sizesText}
          onChange={(e) => setSizesText(e.target.value)}
          className={inputCls}
          required
        />
      </Field>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-ink text-bg text-xs tracking-widest uppercase px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save colour' : 'Add colour'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-border text-xs tracking-widest uppercase px-4 py-2 hover:border-accent hover:text-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  'w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none';

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
