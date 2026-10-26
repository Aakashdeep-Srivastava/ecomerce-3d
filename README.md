# 3D Boutique — White-Label Immersive Storefront

An immersive, single-screen 3D boutique experience: a rotating garment rack
with a hand-written GPU cloth shader (wind, billow, hem flutter), editorial
overlay UI, and an optional live Shopify checkout.

Built to be **re-skinned per client from a single config file** — no component
changes needed to launch a new boutique.

Stack: **Vite · React 19 · TypeScript · react-three-fiber / Three.js · Shopify Storefront API**

---

## Launching a new client

Each client is **one config file** + **one deployment**.

1. Copy `src/config/clients/aavriti.ts` → `src/config/clients/<client>.ts`.
2. Edit the brand, theme (colors + fonts), socials, and the 4 garment slots
   (cutout PNG texture + copy, and optionally a Shopify product handle).
3. Register it in `src/config/index.ts` under its `id`.
4. Set `VITE_CLIENT=<client>` on the deployment (Vercel env var).
5. Deploy. Done.

Everything white-labels at runtime: CSS variables, fonts, favicon, `<title>`,
and Open Graph meta are applied from the config by `applyClientConfig()`.

## Commerce (optional, graceful fallback)

If Shopify env vars are present, products are enriched with **live price /
availability**, "Add to cart" uses the **Shopify Cart API**, and checkout opens
the **hosted Shopify checkout**. If they're absent, the app runs in a polished
**demo cart** mode (checkout disabled, clearly labeled) — so a client site works
before commerce is wired up.

Set these per deployment (see `.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `VITE_CLIENT` | no (defaults to `aavriti`) | Which client config to build |
| `VITE_SHOPIFY_DOMAIN` | for live commerce | `your-store.myshopify.com` |
| `VITE_SHOPIFY_STOREFRONT_TOKEN` | for live commerce | Public Storefront API token (safe client-side) |
| `VITE_SHOPIFY_API_VERSION` | no (defaults to `2024-10`) | Storefront API version |
| `VITE_SHOPIFY_COLLECTION_HANDLE` | no | Source products from a collection |

To link garment slots to real products, set `shopifyHandle` on each garment in
the client config.

## Architecture

```
src/
  config/
    types.ts            Config contract (ClientConfig, GarmentSlot, ...)
    index.ts            Client registry + env resolution (config, hasLiveCommerce)
    clients/aavriti.ts  Reference client config
  lib/
    shopify.ts          Storefront API client (products + Cart API)
    cart.tsx            CartProvider / useCart — Shopify or demo fallback
    theme.ts            applyClientConfig — CSS vars, fonts, favicon, SEO meta
    useIsMobile.ts      Shared responsive hook
  components/
    Scene.tsx           3D rack + GPU cloth shader (lazy-loaded)
    ProductInfo.tsx     Editorial copy, price, add-to-cart
    Navbar.tsx          Brand + cart entry
    CartDrawer.tsx      Line items, quantity, checkout
    ErrorBoundary.tsx   WebGL failure fallback
```

Performance: the Three.js scene is **code-split** and lazy-loaded, so the shell
and background paint first (~77 KB gzip initial JS vs ~247 KB for the deferred
3D chunk). Device pixel ratio is clamped to 2 and shader materials are disposed
on unmount.

## Shopify theme port

`shopify/` contains a standalone Shopify Liquid (OS 2.0) port of the same
experience for merchants who want it embedded in a Shopify theme directly. See
`shopify/README_SHOPIFY.md`.

## Scripts

```bash
npm run dev       # local dev server
npm run build     # type-check + production build
npm run preview   # serve the production build
npm run lint      # oxlint
```
