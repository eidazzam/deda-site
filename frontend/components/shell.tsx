'use client';

import { useState } from 'react';

import { CartDrawer } from './cart-drawer';
import { Footer } from './footer';
import { Header } from './header';
import { MobileMenu } from './mobile-menu';

import type { SiteConfig } from '@/lib/api/types';
import { useCart } from '@/lib/stores/cart';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Application shell shared by every locale-scoped page.
 *
 * Drawer open/close state lives in the cart Zustand store so any action
 * (add-to-cart from a product page, the bag icon in the header, etc.)
 * can pop the drawer without prop-drilling. The mobile-menu's own
 * open/close stays local since it only opens from the hamburger button
 * inside the header.
 */
export function Shell({
  locale,
  dict,
  config,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  config?: SiteConfig | null;
  children: React.ReactNode;
}) {
  const cartOpen = useCart((s) => s.isOpen);
  const openCart = useCart((s) => s.open);
  const closeCart = useCart((s) => s.close);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Header
        locale={locale}
        dict={dict}
        onCartClick={openCart}
        onMenuClick={() => setMenuOpen(true)}
      />
      <main className="min-h-[60vh]">{children}</main>
      <Footer locale={locale} dict={dict} config={config} />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        locale={locale}
        dict={dict}
      />
      <CartDrawer open={cartOpen} onClose={closeCart} locale={locale} dict={dict} />
    </>
  );
}
