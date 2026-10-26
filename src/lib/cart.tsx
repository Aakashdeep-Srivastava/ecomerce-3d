import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { config, hasLiveCommerce } from '../config';
import type { GarmentSlot } from '../config/types';
import {
  ShopifyClient,
  formatMoney,
  type Cart,
  type ShopifyProduct,
} from './shopify';

const CART_ID_KEY = `cart:${config.id}`;

/** A garment slot merged with any live Shopify data for display. */
export interface DisplayGarment extends GarmentSlot {
  /** Formatted price — live when available, else the static config value. */
  displayPrice: string;
  available: boolean;
  variantId?: string;
  /** True when displayPrice came from Shopify rather than static config. */
  isLivePrice: boolean;
}

/** Backend-agnostic cart line for the drawer UI. */
export interface DisplayCartLine {
  id: string;
  title: string;
  quantity: number;
  priceLabel: string;
  imageUrl?: string;
}

export interface DisplayCart {
  lines: DisplayCartLine[];
  totalQuantity: number;
  subtotalLabel: string;
  /** Hosted Shopify checkout URL. Undefined in demo mode. */
  checkoutUrl?: string;
}

interface CartContextValue {
  garments: DisplayGarment[];
  cart: DisplayCart;
  /** Whether real commerce is active (Shopify). */
  isLive: boolean;
  /** A slot-level add-to-cart is in flight. */
  busy: boolean;
  error: string | null;
  addToCart: (garmentIndex: number) => Promise<void>;
  setLineQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: DisplayCart = {
  lines: [],
  totalQuantity: 0,
  subtotalLabel: '',
};

/** Parse a static price string like "₹ 2,499" into symbol + numeric value. */
function parseStaticPrice(price: string): { symbol: string; value: number } {
  const value = Number(price.replace(/[^0-9.]/g, '')) || 0;
  const symbol = price.replace(/[0-9.,\s]/g, '') || '';
  return { symbol, value };
}

function shopifyCartToDisplay(cart: Cart | null): DisplayCart {
  if (!cart) return EMPTY_CART;
  return {
    lines: cart.lines.map((l) => ({
      id: l.id,
      title: l.productTitle,
      quantity: l.quantity,
      priceLabel: formatMoney(l.price),
      imageUrl: l.imageUrl,
    })),
    totalQuantity: cart.totalQuantity,
    subtotalLabel: formatMoney(cart.subtotal),
    checkoutUrl: cart.checkoutUrl,
  };
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const client = useMemo(
    () => (config.shopify ? new ShopifyClient(config.shopify) : null),
    [],
  );

  // Live Shopify product data, keyed by handle.
  const [liveProducts, setLiveProducts] = useState<
    Record<string, ShopifyProduct>
  >({});
  const [shopifyCart, setShopifyCart] = useState<Cart | null>(null);

  // Demo cart: counts keyed by garment index (used only when not live).
  const [demoCounts, setDemoCounts] = useState<Record<number, number>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cartIdRef = useRef<string | null>(null);

  // On mount: enrich garments from Shopify and restore any persisted cart.
  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    (async () => {
      try {
        const handles = config.garments
          .map((g) => g.shopifyHandle)
          .filter((h): h is string => Boolean(h));
        if (handles.length) {
          const products = await client.getProductsByHandles(handles);
          if (cancelled) return;
          const byHandle: Record<string, ShopifyProduct> = {};
          for (const p of products) byHandle[p.handle] = p;
          setLiveProducts(byHandle);
        }

        const savedId =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(CART_ID_KEY)
            : null;
        if (savedId) {
          const restored = await client.getCart(savedId);
          if (cancelled) return;
          if (restored) {
            cartIdRef.current = restored.id;
            setShopifyCart(restored);
          } else {
            localStorage.removeItem(CART_ID_KEY);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[cart] Shopify init failed, using static data.', e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const garments = useMemo<DisplayGarment[]>(() => {
    return config.garments.map((slot) => {
      const live = slot.shopifyHandle
        ? liveProducts[slot.shopifyHandle]
        : undefined;
      if (live) {
        return {
          ...slot,
          displayPrice: formatMoney(live.price),
          available: live.availableForSale,
          variantId: live.variantId,
          isLivePrice: true,
        };
      }
      return {
        ...slot,
        displayPrice: slot.price,
        available: true,
        variantId: undefined,
        isLivePrice: false,
      };
    });
  }, [liveProducts]);

  const addToCart = useCallback(
    async (garmentIndex: number) => {
      setError(null);
      const garment = garments[garmentIndex];
      if (!garment) return;

      // Live path: requires a resolved variant id.
      if (client && garment.variantId) {
        setBusy(true);
        try {
          let next: Cart;
          if (cartIdRef.current) {
            next = await client.addLine(cartIdRef.current, garment.variantId);
          } else {
            next = await client.createCart(garment.variantId);
            cartIdRef.current = next.id;
            localStorage.setItem(CART_ID_KEY, next.id);
          }
          setShopifyCart(next);
        } catch (e) {
          setError(
            e instanceof Error ? e.message : 'Could not add to cart.',
          );
        } finally {
          setBusy(false);
        }
        return;
      }

      // Demo path: local-only quantity bump.
      setDemoCounts((prev) => ({
        ...prev,
        [garmentIndex]: (prev[garmentIndex] ?? 0) + 1,
      }));
    },
    [client, garments],
  );

  const setLineQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      if (client && cartIdRef.current) {
        setBusy(true);
        try {
          const next =
            quantity <= 0
              ? await client.removeLine(cartIdRef.current, lineId)
              : await client.updateLine(cartIdRef.current, lineId, quantity);
          setShopifyCart(next);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not update cart.');
        } finally {
          setBusy(false);
        }
        return;
      }
      // Demo path: lineId is the garment index as a string.
      const idx = Number(lineId);
      setDemoCounts((prev) => {
        const next = { ...prev };
        if (quantity <= 0) delete next[idx];
        else next[idx] = quantity;
        return next;
      });
    },
    [client],
  );

  const removeLine = useCallback(
    (lineId: string) => setLineQuantity(lineId, 0),
    [setLineQuantity],
  );

  // Build the display cart from whichever source is active.
  const cart = useMemo<DisplayCart>(() => {
    if (client) return shopifyCartToDisplay(shopifyCart);

    // Demo cart assembled from static config prices.
    const lines: DisplayCartLine[] = [];
    let totalQuantity = 0;
    let subtotalValue = 0;
    let symbol = '';
    for (const [idxStr, qty] of Object.entries(demoCounts)) {
      const idx = Number(idxStr);
      const g = garments[idx];
      if (!g || qty <= 0) continue;
      const { symbol: sym, value } = parseStaticPrice(g.price);
      symbol = symbol || sym;
      subtotalValue += value * qty;
      totalQuantity += qty;
      lines.push({
        id: idxStr,
        title: g.name,
        quantity: qty,
        priceLabel: g.price,
        imageUrl: g.texture,
      });
    }
    return {
      lines,
      totalQuantity,
      subtotalLabel: lines.length
        ? `${symbol} ${subtotalValue.toLocaleString()}`.trim()
        : '',
      checkoutUrl: undefined,
    };
  }, [client, shopifyCart, demoCounts, garments]);

  const value: CartContextValue = {
    garments,
    cart,
    isLive: hasLiveCommerce,
    busy,
    error,
    addToCart,
    setLineQuantity,
    removeLine,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
