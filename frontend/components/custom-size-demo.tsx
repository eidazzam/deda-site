'use client';

import { useState } from 'react';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  dict: Dictionary;
  locale: Locale;
};

/**
 * Demo / preview of the Custom Size flow that ships on the real product
 * page. Lives on the Coming Soon shop page so visitors can see how the
 * "type your own size" experience feels before the real product catalog
 * lands. Nothing here is persisted — the chip just shows what the
 * customer would do on a real product page.
 */
export function CustomSizeDemo({ dict, locale }: Props) {
  const isAR = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const apply = () => {
    const v = value.trim();
    if (!v) return;
    setConfirmed(`${isAR ? 'مقاس خاص' : 'Custom'} · ${v}`);
    setOpen(false);
  };

  return (
    <>
      {/* The dashed chip — clickable. Tap toggles the inline form open. */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (confirmed) setConfirmed(null);
        }}
        className={`h-10 px-3 grid place-items-center text-sm border border-dashed transition-colors ${
          open || confirmed
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-accent text-accent hover:bg-accent/5'
        }`}
      >
        + {dict.customSize}
      </button>

      {/* Inline input + Apply — one row, mirrors the product page UX. */}
      {open ? (
        <div className="w-full mt-4">
          <div className="flex items-stretch gap-2 max-w-sm mx-auto">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') apply();
              }}
              autoFocus
              className="flex-1 bg-bg border border-border px-3 py-2.5 text-sm focus:border-ink outline-none"
              placeholder={isAR ? 'اكتبي مقاسك' : 'Enter your size'}
            />
            <button
              type="button"
              onClick={apply}
              disabled={!value.trim()}
              className="bg-ink text-bg text-[10px] tracking-widest uppercase px-5 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAR ? 'تأكيد' : 'Apply'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Confirmation chip — shows the value the customer typed. Stays
          visible until she taps the Custom button again. */}
      {confirmed && !open ? (
        <div className="w-full mt-4 flex justify-center">
          <div className="inline-flex items-center gap-2 text-xs text-ink-soft bg-accent/10 border border-accent/30 px-3 py-2">
            <span className="text-accent font-medium">
              {isAR ? 'مقاسك:' : 'Your size:'}
            </span>
            <span>{confirmed}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
