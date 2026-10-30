'use client';

import { useEffect } from 'react';

import { useCart } from '@/lib/stores/cart';
import { useWishlist } from '@/lib/stores/wishlist';

/**
 * Zustand's persist middleware reads localStorage synchronously during the
 * first render. In Next.js that runs on the server too, where storage
 * doesn't exist — so we set skipHydration:true and call rehydrate() once
 * we know we're on the client. Mounted as a sibling of {children}.
 */
export function HydrateStores() {
  useEffect(() => {
    useCart.persist.rehydrate();
    useWishlist.persist.rehydrate();
  }, []);
  return null;
}
