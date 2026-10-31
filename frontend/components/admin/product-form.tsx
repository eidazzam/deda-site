'use client';

import { useState } from 'react';

import type { AdminProductDetail } from '@/lib/admin/types';
import type { Category, ColorGroup, SaleStatus } from '@/lib/api/types';

const CATEGORIES: Category[] = [
  'COLOURED',
  'BLACK',
  'SNAP',
  'EMBROIDERED',
  'OVERHEAD',
  'KIDS',
  'EVERYDAY',
  'READY',
  'WINTER',
];
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

type VariantInput = {
  colorNameEn: string;
  colorNameAr: string;
  colorHex: string;
  colorGroup: ColorGroup;
  sizes: string[];
  status: SaleStatus;
};

export type ProductFormPayload = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  basePrice: number;
  discount: number | null;
  category: Category;
  status: SaleStatus;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  sortOrder: number;
  // Only required on create — edit form ignores this and uses
  // separate variant endpoints to mutate variants in isolation.
  variants?: VariantInput[];
};

type Props = {
  mode: 'create' | 'edit';
  initial?: AdminProductDetail;
  onSubmit: (payload: ProductFormPayload) => Promise<void>;
  submitting?: boolean;
  error?: string | null;
};

// Default sizes for a fresh variant on a brand-new product. Deda's
// abaya catalogue uses numeric Gulf sizes (50 → 62), not Latin S/M/L,
// so seeding this with letters meant every new product silently shipped
// with the wrong size set. Kids products override this in their own
// flow.
const EMPTY_VARIANT: VariantInput = {
  colorNameEn: '',
  colorNameAr: '',
  colorHex: '#000000',
  colorGroup: 'BLACK',
  sizes: ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '62'],
  status: 'IN_SALE',
};

export function ProductForm({ mode, initial, onSubmit, submitting, error }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '');
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initial?.descriptionEn ?? '');
  const [descriptionAr, setDescriptionAr] = useState(initial?.descriptionAr ?? '');
  // Prices are stored as piastres (1 EGP = 1000 piastres); the form deals in EGP
  // so the admin types familiar amounts. We convert back to piastres on submit.
  const [basePrice, setBasePrice] = useState<number | ''>(
    initial ? initial.basePrice / 100 : '',
  );
  const [discount, setDiscount] = useState<number | ''>(
    initial?.discount != null ? initial.discount / 100 : '',
  );
  const [category, setCategory] = useState<Category>(initial?.category ?? 'COLOURED');
  const [status, setStatus] = useState<SaleStatus>(initial?.status ?? 'IN_SALE');
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
  const [isBestSeller, setIsBestSeller] = useState(initial?.isBestSeller ?? false);
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);

  // Variants only matter on create. On edit they live behind separate
  // toggle / patch endpoints — kept out of this form by design.
  const [variants, setVariants] = useState<VariantInput[]>([{ ...EMPTY_VARIANT }]);

  const updateVariant = (i: number, patch: Partial<VariantInput>) => {
    setVariants((curr) => curr.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };

  // Optional event so the click-handler fallback below can call this
  // without synthesising a fake FormEvent. On Cloudflare Pages / edge
  // runtime the <form onSubmit> binding occasionally fails to hydrate
  // — the explicit onClick on the button is the safety net.
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (basePrice === '') return;
    void onSubmit({
      slug: slug.trim().toLowerCase(),
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      descriptionEn: descriptionEn.trim(),
      descriptionAr: descriptionAr.trim(),
      basePrice: Math.round(Number(basePrice) * 100),
      discount: discount === '' ? null : Math.round(Number(discount) * 100),
      category,
      status,
      isFeatured,
      isNew,
      isBestSeller,
      sortOrder,
      ...(mode === 'create'
        ? {
            variants: variants.map((v) => ({
              ...v,
              colorNameEn: v.colorNameEn.trim(),
              colorNameAr: v.colorNameAr.trim(),
              sizes: v.sizes.map((s) => s.trim()).filter(Boolean),
            })),
          }
        : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section title="Basics">
        <Grid>
          <Field label="Slug" hint="lowercase letters, digits, dashes only" required>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9-]+"
              disabled={mode === 'edit'}
              className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none disabled:opacity-60"
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name (EN)" required>
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              required
              className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
            />
          </Field>
          <Field label="Name (AR)" required>
            <input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              required
              dir="rtl"
              className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none"
            />
          </Field>
        </Grid>

        <Field label="Description (EN)" full>
          <textarea
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={3}
            required
            className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none resize-none"
          />
        </Field>
        <Field label="Description (AR)" full>
          <textarea
            value={descriptionAr}
            onChange={(e) => setDescriptionAr(e.target.value)}
            rows={3}
            required
            dir="rtl"
            className="w-full bg-bg border border-border px-3 py-2 text-sm focus:border-ink outline-none resize-none"
          />
        </Field>
      </Section>

      <Section title="Pricing & flags">
        <Grid>
          <Field label="Base price (EGP)" required>
            <input
              type="number"
              min={0}
              value={basePrice}
              onChange={(e) =>
                setBasePrice(e.target.value === '' ? '' : Number(e.target.value))
              }
              required
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Discount price (optional)">
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) =>
                setDiscount(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SaleStatus)}
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            >
              <option value="IN_SALE">In sale</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </select>
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full bg-bg border border-border px-3 py-2 text-sm"
            />
          </Field>
        </Grid>

        <div className="flex flex-wrap gap-6 mt-2">
          <Checkbox
            label="Featured (homepage)"
            checked={isFeatured}
            onChange={setIsFeatured}
          />
          <Checkbox label="New (badge)" checked={isNew} onChange={setIsNew} />
          <Checkbox
            label="Best seller (homepage)"
            checked={isBestSeller}
            onChange={setIsBestSeller}
          />
        </div>
      </Section>

      {mode === 'create' ? (
        <Section title="Variants (colours)">
          <p className="text-xs text-muted -mt-2 mb-4">
            Add a row per colour. Sizes are display-only — no per-size stock
            counters. Edit each variant later from the product detail page.
          </p>
          <div className="space-y-4">
            {variants.map((v, i) => (
              <div key={i} className="border border-border p-4 grid sm:grid-cols-2 gap-3">
                <Field label="Colour name (EN)" required>
                  <input
                    value={v.colorNameEn}
                    onChange={(e) => updateVariant(i, { colorNameEn: e.target.value })}
                    required
                    className="w-full bg-bg border border-border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Colour name (AR)" required>
                  <input
                    value={v.colorNameAr}
                    onChange={(e) => updateVariant(i, { colorNameAr: e.target.value })}
                    required
                    dir="rtl"
                    className="w-full bg-bg border border-border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Hex">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={v.colorHex}
                      onChange={(e) => updateVariant(i, { colorHex: e.target.value })}
                      className="w-12 h-9 border border-border bg-bg"
                    />
                    <input
                      value={v.colorHex}
                      onChange={(e) => updateVariant(i, { colorHex: e.target.value })}
                      pattern="#[0-9a-fA-F]{6}"
                      className="flex-1 bg-bg border border-border px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </Field>
                <Field label="Colour group (for filter)">
                  <select
                    value={v.colorGroup}
                    onChange={(e) =>
                      updateVariant(i, { colorGroup: e.target.value as ColorGroup })
                    }
                    className="w-full bg-bg border border-border px-3 py-2 text-sm"
                  >
                    {COLOR_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {g.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sizes (comma-separated)" full>
                  <input
                    value={v.sizes.join(', ')}
                    onChange={(e) =>
                      updateVariant(i, {
                        sizes: e.target.value.split(',').map((s) => s.trim()),
                      })
                    }
                    className="w-full bg-bg border border-border px-3 py-2 text-sm"
                  />
                </Field>
                {variants.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setVariants((curr) => curr.filter((_, idx) => idx !== i))}
                    className="text-[10px] tracking-widest uppercase text-accent hover:underline sm:col-span-2 text-left"
                  >
                    Remove colour
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setVariants((curr) => [...curr, { ...EMPTY_VARIANT }])}
              className="border border-dashed border-border text-[10px] tracking-widest uppercase px-4 py-2 hover:border-ink"
            >
              + Add colour
            </button>
          </div>
        </Section>
      ) : null}

      {error ? (
        <div className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        {/* Belt-and-suspenders: type="submit" hooks the form onSubmit on
            most runtimes; onClick is the fallback when Cloudflare Pages
            doesn't hydrate the form-level handler in time. */}
        <button
          type="submit"
          disabled={submitting}
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="bg-ink text-bg text-sm tracking-widest uppercase px-6 py-3 hover:bg-accent transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[10px] tracking-widest uppercase text-muted mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="block text-[10px] tracking-widest uppercase text-muted mb-1.5">
        {label} {required ? <span className="text-accent">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[10px] text-muted mt-1">{hint}</span> : null}
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-ink"
      />
      <span>{label}</span>
    </label>
  );
}
