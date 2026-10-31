'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

import { EgyptFlag } from './egypt-flag';

/**
 * Top strip above the header. Rotates through three short messages every
 * `ROTATION_MS` with a brief fade-and-rise animation:
 *
 *   1. Brand identity  — 🇰🇼 Deda Women's Wear
 *   2. Craft line      — ✧ Elegant and distinctive abayas
 *   3. Purchase nudge  — ★ Reserve your Deda abaya today
 *
 * Kept at the same h-8 row the original static strip used so layout
 * above the header doesn't shift between renders.
 */

const ROTATION_MS = 5000;

export function AnnouncementBar({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const isAR = locale === 'ar';
  const items = [
    { key: 'brand', icon: <EgyptFlag className="w-5 h-auto shrink-0" />, text: dict.egyptAbayas },
    { key: 'local', icon: <SparkleIcon />, text: dict.freeShippingLocal },
    { key: 'intl', icon: <StarIcon />, text: dict.freeShippingIntl },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  const current = items[index]!;

  return (
    <div className="bg-bg-sand/60 border-b border-border/60 overflow-hidden">
      <div
        className={`max-w-page mx-auto px-6 lg:px-10 h-8 flex items-center justify-center text-[11px] tracking-[0.18em] uppercase text-ink-soft`}
      >
        {/* key={index} forces a remount each rotation so the entrance
            animation plays again. Tiny opacity + 4px rise — easy to miss,
            which is the point: a luxury strip shouldn't twitch. */}
        <div
          key={current.key}
          className={`flex items-center gap-2.5 animate-announcement ${
            isAR ? 'flex-row-reverse' : ''
          }`}
        >
          {current.icon}
          <span>{current.text}</span>
        </div>
      </div>
    </div>
  );
}

// 4-point sparkle — a subtle luxury flourish that reads at 14px and
// works in both LTR and RTL without directional weight.
function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="currentColor"
      className="shrink-0"
      aria-hidden="true"
    >
      <path d="M12 2 13.5 9.5 21 11l-7.5 1.5L12 20l-1.5-7.5L3 11l7.5-1.5L12 2z" />
    </svg>
  );
}

// 5-point outlined star — reads as premium / reserve without being
// heavy-handed. Same visual weight as the sparkle above.
function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6L12 17.2 6.7 20l1-6L3.4 9.9l6-.9L12 3.5Z" />
    </svg>
  );
}
