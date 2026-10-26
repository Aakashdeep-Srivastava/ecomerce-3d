/**
 * White-label client configuration contract.
 *
 * Every client is one config object. A deployment selects its client at build
 * time via the `VITE_CLIENT` env var (see `config/index.ts`). Secrets such as
 * the Shopify Storefront token come from env vars, never committed per-client.
 */

/** Visual theme tokens applied to :root CSS variables at runtime. */
export interface ThemeConfig {
  bgColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  borderColor: string;
  /** Font family stack for display/title text. */
  fontTitle: string;
  /** Font family stack for body/UI text. */
  fontSans: string;
  /**
   * Optional Google Fonts href. When set it is injected into <head>.
   * Leave undefined if the client self-hosts or uses system fonts.
   */
  googleFontsHref?: string;
}

/** Brand identity for the client. */
export interface BrandConfig {
  /** Human name, used in <title>, alt text, aria labels. */
  name: string;
  /** Short tagline / meta description. */
  tagline: string;
  /** Path (public/) or absolute URL to the brand logo. */
  logoSrc: string;
  /** Path or URL to the sunlit interior / backdrop image. */
  backgroundSrc: string;
  /** Favicon path (public/). */
  faviconSrc: string;
  /** Optional Open Graph preview image. */
  ogImageSrc?: string;
}

/** One social link shown in the editorial footer. */
export interface SocialLink {
  label: string;
  href: string;
}

/**
 * A garment slot on the 3D rack. The rack has a fixed number of wings
 * (currently 4); each slot supplies the cutout texture plus display copy.
 * When Shopify is configured and `shopifyHandle` is set, live price,
 * title and checkout are layered on top of these static values.
 */
export interface GarmentSlot {
  /** Transparent cutout PNG for the cloth plane (required — drives the 3D look). */
  texture: string;
  category: string;
  name: string;
  fabric: string;
  /** Pre-formatted fallback price, e.g. "₹ 2,499". Used when Shopify is off. */
  price: string;
  description: string;
  /** Shopify product handle to link live data + add-to-cart. Optional. */
  shopifyHandle?: string;
}

/** Shopify Storefront API connection, resolved from env per deployment. */
export interface ShopifyConfig {
  /** myshopify domain, e.g. "my-store.myshopify.com". */
  domain: string;
  /** Public Storefront API access token (safe to expose client-side). */
  storefrontToken: string;
  /** Storefront API version, e.g. "2024-10". */
  apiVersion: string;
  /** Optional collection handle to source products from. */
  collectionHandle?: string;
}

export interface ClientConfig {
  /** Stable id, matches the filename in config/clients and VITE_CLIENT. */
  id: string;
  brand: BrandConfig;
  theme: ThemeConfig;
  /** Default UI language label shown in the selector (display only). */
  languageLabel: string;
  socials: SocialLink[];
  /** Fixed-length to match the rack's wings. */
  garments: GarmentSlot[];
  /** Resolved at runtime from env; undefined means "no live commerce". */
  shopify?: ShopifyConfig;
}
