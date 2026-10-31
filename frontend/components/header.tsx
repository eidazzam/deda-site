'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useCart, selectCartCount } from '@/lib/stores/cart';
import { useWishlist } from '@/lib/stores/wishlist';
import { otherLocale, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

import { AnnouncementBar } from './announcement-bar';
import {
  BagIcon,
  GlobeIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
} from './icon';

type HeaderProps = {
  locale: Locale;
  dict: Dictionary;
  onCartClick: () => void;
  onMenuClick: () => void;
};

export function Header({ locale, dict, onCartClick, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const isAR = locale === 'ar';
  const localePrefix = `/${locale}`;
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const cartCount = useCart(selectCartCount);
  const wishlistCount = useWishlist((s) => s.slugs.length);

  // Build the equivalent URL in the other language by swapping the locale
  // segment. Falls back to /{other} if the path doesn't start with /{locale}.
  const otherHref = pathname.startsWith(localePrefix)
    ? `/${otherLocale(locale)}${pathname.slice(localePrefix.length) || '/'}`
    : `/${otherLocale(locale)}`;

  // Deda ships without categories — the storefront is a flat
  // product grid. Nav keeps just Home + Shop (all products) + About
  // so the top bar reads as a brand, not a menu.
  const nav = [
    { href: localePrefix, label: dict.home },
    { href: `${localePrefix}/shop/all`, label: dict.shopCollection },
    { href: `${localePrefix}/about`, label: dict.about },
  ];

  return (
    <header className="bg-bg border-b border-border">
      {/* Top strip — rotates between the Egypt identity line and the two
          shipping promos. Scrolls away with the banner; only the nav row
          below stays pinned to the top. */}
      <AnnouncementBar locale={locale} dict={dict} />

      {/* The full-width hero banner was retired — it depended on a
          /brand/hero-banner.jpg that never shipped, so it rendered as a
          solid black bar in production. The brand mark now lives inline
          in the sticky nav strip below. */}

      {/* Sticky nav strip — the row that survives scroll. The brand logo
          sits on the start edge, nav in the middle, actions on the end. */}
      <div className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-10">
        {/* Nav + actions row. Logo lives in the banner above, so this row
            is a clean single strip: hamburger on mobile, categories on
            desktop, actions cluster on the far side. */}
        <div className="flex items-center justify-between h-16 md:h-20 gap-3 lg:gap-5">
          {/* Hamburger — visible only below xl, where the inline nav is hidden */}
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="xl:hidden p-2 -ml-2 hover:text-accent transition-colors"
          >
            <MenuIcon className="w-6 h-6" />
          </button>

          {/* Brand logo — click returns to the home page in the current
              locale. The source /brand/logo.png is a 1600x926 JPEG
              with the DEDA mark centred over a solid black background
              (plus partial mirror repeats on the far left/right).
              We size the container to the mark's own aspect ratio
              (~1.3) and use `object-cover` + a scale transform to
              zoom past the padding onto the mark itself. The box
              keeps `bg-ink` so the mark's own black background reads
              as one continuous dark card. Drop the hack and switch to
              `object-contain` once a transparent-background logo
              file lands under /brand/. */}
          <Link
            href={localePrefix}
            aria-label={dict.brand}
            className="shrink-0"
          >
            <div className="relative h-11 md:h-14 w-16 md:w-20 overflow-hidden bg-ink">
              <Image
                src="/brand/logo.png"
                alt={dict.brand}
                fill
                priority
                sizes="80px"
                className="object-cover"
                style={{
                  objectPosition: 'center',
                  transform: 'scale(1.9)',
                }}
              />
            </div>
          </Link>

          <nav className="hidden xl:flex items-center gap-4 xl:gap-7 text-xs xl:text-sm tracking-wide">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="link-underline whitespace-nowrap">
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Actions cluster — search + locale + wishlist + bag. */}
          <div className="flex items-center gap-1.5 md:gap-2.5 lg:gap-3">
            <div
              className={`relative hidden xl:flex items-center transition-all duration-300 ${
                searchFocused ? 'xl:w-72' : 'xl:w-52'
              }`}
            >
              <SearchIcon
                className={`absolute ${
                  isAR ? 'right-3' : 'left-3'
                } w-4 h-4 text-muted pointer-events-none`}
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchValue.trim()) {
                    window.location.href = `${localePrefix}/shop/all?search=${encodeURIComponent(
                      searchValue.trim(),
                    )}`;
                  }
                }}
                placeholder={dict.search}
                className={`w-full bg-subtle/60 ${
                  isAR ? 'pr-9 pl-3' : 'pl-9 pr-3'
                } py-2 text-sm border border-transparent focus:border-border focus:bg-bg transition-all rounded-sm outline-none`}
              />
            </div>

            <Link
              href={otherHref}
              className="flex items-center gap-1.5 text-xs tracking-widest uppercase hover:text-accent transition-colors"
              prefetch={false}
            >
              <GlobeIcon className="w-4 h-4" />
              <span>{isAR ? 'EN' : 'AR'}</span>
            </Link>

            <Link
              href={`${localePrefix}/wishlist`}
              className="relative p-2 hover:text-accent transition-colors"
              aria-label={dict.wishlist}
            >
              <HeartIcon className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span
                  className={`absolute top-0 ${
                    isAR ? 'left-0' : 'right-0'
                  } bg-accent text-bg text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium`}
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={onCartClick}
              className="relative p-2 hover:text-accent transition-colors"
              aria-label={dict.cart}
            >
              <BagIcon className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  className={`absolute top-0 ${
                    isAR ? 'left-0' : 'right-0'
                  } bg-accent text-bg text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium`}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile + tablet search row — the actions cluster below lg is
            too tight to host a useful search input alongside the cart /
            wishlist icons, so we render the bar as a full-width second
            row below the main header. Hidden at lg+ where the inline
            search inside the actions cluster takes over. */}
        <div className="xl:hidden pb-3 pt-1">
          <div className="relative">
            <SearchIcon
              className={`absolute top-1/2 -translate-y-1/2 ${
                isAR ? 'right-3' : 'left-3'
              } w-4 h-4 text-muted pointer-events-none`}
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchValue.trim()) {
                  window.location.href = `${localePrefix}/shop/all?search=${encodeURIComponent(
                    searchValue.trim(),
                  )}`;
                }
              }}
              placeholder={dict.search}
              className={`w-full bg-subtle/60 ${
                isAR ? 'pr-9 pl-3' : 'pl-9 pr-3'
              } py-2 text-sm border border-transparent focus:border-border focus:bg-bg transition-all rounded-sm outline-none`}
            />
          </div>
        </div>
      </div>
      </div>
    </header>
  );
}

// MobileBottomNav was removed — the hamburger + MobileMenu now hold
// everything that used to live in the bottom bar, and the cart/wishlist
// icons stay reachable at the top of the screen.
