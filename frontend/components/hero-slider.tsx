'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { isLocalUpload } from '@/lib/image';
import type { Locale } from '@/lib/i18n/config';

type Slide = {
  url: string;
  altAr: string;
  altEn: string;
};

type Props = {
  slides: Slide[];
  locale: Locale;
  /** Where the photo-credit badge sits inside the slider. Anchored to
   *  the bottom; left/right flips based on locale. */
  badge?: { ar: string; en: string };
  /** Milliseconds between auto-advances. 0 disables auto-play. */
  intervalMs?: number;
};

/**
 * Auto-rotating crossfade slider used by the homepage hero. Stays
 * restrained on motion — a quiet zoom-out on entrance + a 1s opacity
 * crossfade — to match the Gulf minimal pacing we benchmarked. Manual
 * dots let visitors override the rotation without taking over the hero.
 */
export function HeroSlider({
  slides,
  locale,
  badge,
  intervalMs = 3000,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const isAR = locale === 'ar';

  useEffect(() => {
    if (intervalMs <= 0 || paused || slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs, paused, slides.length]);

  if (slides.length === 0) return null;
  const current = slides[index];

  return (
    <div
      className="relative img-zoom aspect-[4/5] lg:aspect-[5/6] bg-bg-sand overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={current.url}
            alt={isAR ? current.altAr : current.altEn}
            fill
            priority={index === 0}
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
            unoptimized={isLocalUpload(current.url)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Photographer credit / studio badge. */}
      {badge ? (
        <div
          className={`absolute bottom-6 ${
            isAR ? 'right-6' : 'left-6'
          } bg-bg/90 backdrop-blur px-4 py-3 text-xs tracking-widest uppercase`}
        >
          {isAR ? badge.ar : badge.en}
        </div>
      ) : null}

      {/* Manual dots — anchored opposite the badge so they don't fight
          for space when both are visible. */}
      {slides.length > 1 ? (
        <div
          className={`absolute bottom-7 ${
            isAR ? 'left-6' : 'right-6'
          } flex items-center gap-1.5`}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-[2px] transition-all duration-500 ${
                i === index
                  ? 'w-9 bg-accent'
                  : 'w-4 bg-ink/30 hover:bg-ink/60'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
