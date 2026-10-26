import type { ClientConfig, ShopifyConfig } from './types';
import { aavriti } from './clients/aavriti';

export type { ClientConfig } from './types';

/**
 * Registry of all white-label clients. Add a new client by importing its
 * config file and adding it here under its id.
 */
const CLIENTS: Record<string, ClientConfig> = {
  aavriti,
};

const DEFAULT_CLIENT = 'aavriti';

/**
 * Resolve Shopify credentials from env. Returns undefined when not fully
 * configured, so the app gracefully falls back to static config products
 * instead of attempting (and failing) live calls.
 */
function resolveShopify(): ShopifyConfig | undefined {
  const domain = import.meta.env.VITE_SHOPIFY_DOMAIN as string | undefined;
  const storefrontToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as
    | string
    | undefined;

  if (!domain || !storefrontToken) return undefined;

  return {
    domain,
    storefrontToken,
    apiVersion:
      (import.meta.env.VITE_SHOPIFY_API_VERSION as string | undefined) ??
      '2024-10',
    collectionHandle: import.meta.env.VITE_SHOPIFY_COLLECTION_HANDLE as
      | string
      | undefined,
  };
}

function resolveClient(): ClientConfig {
  const requested =
    (import.meta.env.VITE_CLIENT as string | undefined) ?? DEFAULT_CLIENT;
  const base = CLIENTS[requested];

  if (!base) {
    console.warn(
      `[config] Unknown VITE_CLIENT "${requested}". Falling back to "${DEFAULT_CLIENT}". ` +
        `Known clients: ${Object.keys(CLIENTS).join(', ')}.`,
    );
    return { ...CLIENTS[DEFAULT_CLIENT], shopify: resolveShopify() };
  }

  return { ...base, shopify: resolveShopify() };
}

/** The active client config for this deployment. Resolved once at module load. */
export const config: ClientConfig = resolveClient();

/** True when live Shopify commerce is wired up for this deployment. */
export const hasLiveCommerce = Boolean(config.shopify);
