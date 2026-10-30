'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useCart, selectCartCount } from '@/lib/stores/cart';
import { useWishlist } from '@/lib/stores/wishlist';
import { otherLocale, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

import { BagIcon, CloseIcon, GlobeIcon, HeartIcon } from './icon';

type Props = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  dict: Dictionary;
};

/**
 * Mobile-only side menu opened by the hamburger button in the header.
 * Carries the same set of links the desktop header shows along the top
 * row — categories, language toggle, wishlist, cart — so phone visitors
 * don't lose anything that's on the desktop nav.
 */
export function MobileMenu({ open, onClose, locale, dict }: Props) {
  const pathname = usePathname();
  const isAR = locale === 'ar';
  const localePrefix = `/${locale}`;

  const cartCount = useCart(selectCartCount);
  const openCart = useCart((s) => s.open);
  const wishlistCount = useWishlist((s) => s.slugs.length);

  // Swap the locale segment, preserving the path the visitor was on.
  const otherHref = pathname.startsWith(localePrefix)
    ? `/${otherLocale(locale)}${pathname.slice(localePrefix.length) || '/'}`
    : `/${otherLocale(locale)}`;

  // Flat catalogue — no category breakdown, so the drawer mirrors
  // the three-link top nav plus wishlist/cart quick-access below.
  const categories = [
    { href: localePrefix, label: dict.home },
    { href: `${localePrefix}/shop/all`, label: dict.shopCollection },
    { href: `${localePrefix}/about`, label: dict.about },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 lg:hidden"
            aria-hidden="true"
          />

          {/* Slides from the start side of the document (left in LTR,
              right in RTL) — opposite of the cart drawer so the two
              don't fight for the same edge. */}
          <motion.nav
            key="menu-drawer"
            initial={{ x: isAR ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isAR ? '100%' : '-100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            className={`fixed top-0 ${
              isAR ? 'right-0' : 'left-0'
            } h-full w-full sm:w-80 bg-bg z-50 flex flex-col shadow-2xl lg:hidden`}
            aria-label="Menu"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-xs tracking-widest uppercase text-muted">
                {isAR ? 'القائمة' : 'Menu'}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:text-accent transition-colors"
                aria-label="Close menu"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Category links */}
              <ul className="py-2">
                {categories.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      onClick={onClose}
                      className="block px-6 py-4 text-lg hover:bg-subtle hover:text-accent transition-colors border-b border-border/60"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Wishlist + Cart quick-access */}
              <ul className="py-2">
                <li>
                  <Link
                    href={`${localePrefix}/wishlist`}
                    onClick={onClose}
                    className={`flex items-center justify-between px-6 py-4 hover:bg-subtle transition-colors border-b border-border/60 ${
                      isAR ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <HeartIcon className="w-5 h-5" />
                      <span>{dict.wishlist}</span>
                    </span>
                    {wishlistCount > 0 ? (
                      <span className="bg-accent text-bg text-[10px] min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center font-medium">
                        {wishlistCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openCart();
                    }}
                    className={`w-full flex items-center justify-between px-6 py-4 hover:bg-subtle transition-colors border-b border-border/60 ${
                      isAR ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <BagIcon className="w-5 h-5" />
                      <span>{dict.cart}</span>
                    </span>
                    {cartCount > 0 ? (
                      <span className="bg-accent text-bg text-[10px] min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center font-medium">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              </ul>
            </div>

            {/* Language toggle at the bottom — same row as the desktop
                globe button, just larger for thumb-friendly tap. */}
            <div className="border-t border-border p-5">
              <Link
                href={otherHref}
                onClick={onClose}
                prefetch={false}
                className={`flex items-center justify-center gap-3 text-sm tracking-widest uppercase border border-border py-3 hover:border-ink transition-colors ${
                  isAR ? 'flex-row-reverse' : ''
                }`}
              >
                <GlobeIcon className="w-4 h-4" />
                <span>{isAR ? 'English' : 'العربية'}</span>
              </Link>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
