'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type WishlistState = {
  slugs: string[];
  toggle: (slug: string) => boolean; // returns the new isWishlisted state
  has: (slug: string) => boolean;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) => {
        const exists = get().slugs.includes(slug);
        set({
          slugs: exists
            ? get().slugs.filter((s) => s !== slug)
            : [...get().slugs, slug],
        });
        return !exists;
      },
      has: (slug) => get().slugs.includes(slug),
      clear: () => set({ slugs: [] }),
    }),
    {
      name: 'deda-wishlist',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
