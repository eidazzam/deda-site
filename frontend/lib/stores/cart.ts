'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CartItem = {
  productSlug: string;
  productNameEn: string;
  productNameAr: string;
  colorNameEn: string;
  colorNameAr: string;
  colorHex: string;
  size: string;
  unitPrice: number;
  quantity: number;
  image: string | null;
};

type CartState = {
  items: CartItem[];
  // UI state — the side drawer's open/close lives in the same store so
  // calling add() can auto-open the drawer without the caller having to
  // know how the Shell wires things up.
  isOpen: boolean;
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  remove: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

export const keyOf = (item: Pick<CartItem, 'productSlug' | 'colorNameEn' | 'size'>) =>
  `${item.productSlug}::${item.colorNameEn}::${item.size}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (input) =>
        set((s) => {
          const incoming: CartItem = { ...input, quantity: input.quantity ?? 1 };
          const key = keyOf(incoming);
          const existing = s.items.find((it) => keyOf(it) === key);
          const items = existing
            ? s.items.map((it) =>
                keyOf(it) === key
                  ? { ...it, quantity: it.quantity + incoming.quantity }
                  : it,
              )
            : [...s.items, incoming];
          // Auto-open the drawer so the visitor lands directly in the
          // mini-checkout flow.
          return { items, isOpen: true };
        }),
      remove: (key) =>
        set((s) => ({ items: s.items.filter((it) => keyOf(it) !== key) })),
      updateQty: (key, qty) =>
        set((s) => {
          if (qty <= 0) {
            return { items: s.items.filter((it) => keyOf(it) !== key) };
          }
          return {
            items: s.items.map((it) =>
              keyOf(it) === key ? { ...it, quantity: qty } : it,
            ),
          };
        }),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: 'deda-cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      // Only persist the items themselves. The drawer's open/close
      // state is ephemeral UI — it should never be remembered across
      // reloads (otherwise the drawer pops open on every page load).
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// Selectors so components can subscribe to slices without re-rendering on
// unrelated changes.
export const selectCartCount = (s: CartState) =>
  s.items.reduce((n, it) => n + it.quantity, 0);

export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
