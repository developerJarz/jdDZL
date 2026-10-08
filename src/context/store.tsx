"use client";

// Client-side cart + wishlist. The reference persists these server-side behind login
// (`/api/tokenized/v1/wishlist-*`, order APIs); until a backend is wired up they live in
// localStorage so the UI flows work end to end.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/components/admin/types";
import type { ImageAsset } from "@/types";

export interface CartLine {
  id?: string;
  slug: string;
  name: string;
  image: ImageAsset | null;
  price: number;
  regularPrice: number;
  qty: number;
  variant?: string;
  /** optional add-ons such as Dazzle Care plans */
  extras?: { label: string; price: number }[];
}

export interface WishItem {
  slug: string;
  name: string;
  image: ImageAsset | null;
  price: number;
}

interface StoreState {
  cart: CartLine[];
  wishlist: WishItem[];
  ready: boolean;
  cartCount: number;
  cartTotal: number;
  addToCart: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  updateQty: (slug: string, qty: number, variant?: string, id?: string) => void;
  removeFromCart: (slug: string, variant?: string, id?: string) => void;
  clearCart: () => void;
  toggleWishlist: (item: WishItem) => void;
  inWishlist: (slug: string) => boolean;
  toast: string | null;
}

const StoreContext = createContext<StoreState | null>(null);
const CART_KEY = "dz-cart";
const WISH_KEY = "dz-wishlist";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const sameLine = (l: CartLine, slug: string, variant?: string) =>
  l.slug === slug && (l.variant ?? "") === (variant ?? "");

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const signedIn = useRef(false);
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      try {
        const me = await api<{ user: unknown }>("auth/me");
        if (!alive) return;
        signedIn.current = !!me.user;
        if (me.user) {
          const saved = await api<{ items: WishItem[] }>("account/wishlist");
          if (alive) setWishlist(saved.items);
        } else setWishlist(load(WISH_KEY, []));
      } catch {
        /* Guest shopping remains available if account lookup fails. */
      }
    };
    void sync();
    window.addEventListener("dazzle:auth-changed", sync);
    return () => {
      alive = false;
      window.removeEventListener("dazzle:auth-changed", sync);
    };
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount */
    setCart(
      load<CartLine[]>(CART_KEY, []).map((l) => ({
        ...l,
        id: l.id || crypto.randomUUID(),
      })),
    );
    setWishlist(load(WISH_KEY, []));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      if (!signedIn.current)
        localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
    } catch {}
  }, [cart, wishlist, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const addToCart = useCallback<StoreState["addToCart"]>((line) => {
    setCart((c) => {
      const extraKey = (extras: CartLine["extras"]) =>
        (extras || [])
          .map((e) => e.label)
          .sort()
          .join("|");
      const existing = c.find(
        (l) =>
          sameLine(l, line.slug, line.variant) &&
          extraKey(l.extras) === extraKey(line.extras),
      );
      if (existing)
        return c.map((l) =>
          l === existing
            ? { ...l, qty: Math.min(50, l.qty + (line.qty ?? 1)) }
            : l,
        );
      return [
        ...c,
        {
          ...line,
          id: crypto.randomUUID(),
          qty: Math.max(1, Math.min(50, line.qty ?? 1)),
        },
      ];
    });
    setToast(`${line.name} added to cart`);
  }, []);

  const updateQty = useCallback(
    (slug: string, qty: number, variant?: string, id?: string) => {
      setCart((c) =>
        c.map((l) =>
          (id ? l.id === id : sameLine(l, slug, variant))
            ? { ...l, qty: Math.max(1, Math.min(50, qty)) }
            : l,
        ),
      );
    },
    [],
  );

  const removeFromCart = useCallback(
    (slug: string, variant?: string, id?: string) => {
      setCart((c) =>
        c.filter((l) => !(id ? l.id === id : sameLine(l, slug, variant))),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (item: WishItem) => {
      const has = wishlist.some((x) => x.slug === item.slug);
      const save = async () => {
        try {
          if (signedIn.current)
            await api("account/wishlist", {
              method: "POST",
              body: JSON.stringify({ slug: item.slug, saved: !has }),
            });
          setWishlist((w) =>
            has
              ? w.filter((x) => x.slug !== item.slug)
              : [...w.filter((x) => x.slug !== item.slug), item],
          );
          setToast(has ? "Removed from wishlist" : "Added to wishlist");
        } catch (err) {
          setToast((err as Error).message);
        }
      };
      void save();
    },
    [wishlist],
  );

  const value = useMemo<StoreState>(() => {
    const extrasTotal = (l: CartLine) =>
      (l.extras ?? []).reduce((s, e) => s + e.price, 0);
    return {
      cart,
      wishlist,
      ready,
      cartCount: cart.reduce((s, l) => s + l.qty, 0),
      cartTotal: cart.reduce(
        (s, l) => s + (l.price + extrasTotal(l)) * l.qty,
        0,
      ),
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      inWishlist: (slug: string) => wishlist.some((w) => w.slug === slug),
      toast,
    };
  }, [
    cart,
    wishlist,
    ready,
    toast,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    toggleWishlist,
  ]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
