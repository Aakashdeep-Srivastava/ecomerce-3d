import type { ShopifyConfig } from '../config/types';

/**
 * Minimal Shopify Storefront API client.
 *
 * Only the slice of the Storefront API this experience needs: resolving
 * products (for live price / availability / variant id) and the Cart API
 * (create, add, update, remove) which yields a hosted `checkoutUrl`.
 *
 * The Storefront access token is a *public* token and is safe to ship to the
 * browser. Never put the Admin API token here.
 */

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  price: Money;
  imageUrl?: string;
  /** First / default variant id — what we add to the cart. */
  variantId?: string;
}

export interface CartLine {
  id: string;
  quantity: number;
  variantId: string;
  title: string;
  productTitle: string;
  price: Money;
  imageUrl?: string;
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: Money;
  lines: CartLine[];
}

/** Formats a Storefront Money value as a localized currency string. */
export function formatMoney(money: Money | undefined): string {
  if (!money) return '';
  const amount = Number(money.amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: money.currencyCode,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${money.amount} ${money.currencyCode}`;
  }
}

export class ShopifyClient {
  private endpoint: string;
  private token: string;

  constructor(cfg: ShopifyConfig) {
    this.endpoint = `https://${cfg.domain}/api/${cfg.apiVersion}/graphql.json`;
    this.token = cfg.storefrontToken;
  }

  private async request<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`Shopify request failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL error: ${json.errors[0].message}`);
    }
    if (!json.data) {
      throw new Error('Shopify response contained no data.');
    }
    return json.data;
  }

  /**
   * Fetch specific products by handle (used to enrich configured garment
   * slots). The Storefront API has no batch-by-handle query, so we fan out
   * and drop any handles that don't resolve.
   */
  async getProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
    const unique = [...new Set(handles.filter(Boolean))];
    if (unique.length === 0) return [];

    const results = await Promise.all(
      unique.map((handle) =>
        this.getProductByHandle(handle).catch(() => null),
      ),
    );
    return results.filter((p): p is ShopifyProduct => p !== null);
  }

  async getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
    const query = `
      query ProductByHandle($handle: String!) {
        product(handle: $handle) {
          id
          handle
          title
          description
          availableForSale
          priceRange { minVariantPrice { amount currencyCode } }
          featuredImage { url altText }
          variants(first: 1) { edges { node { id } } }
        }
      }
    `;
    const data = await this.request<{ product: RawProduct | null }>(query, {
      handle,
    });
    return data.product ? mapProduct(data.product) : null;
  }

  /** Fetch the first N products of a collection (or the storefront if no handle). */
  async getCollectionProducts(
    collectionHandle: string | undefined,
    first = 8,
  ): Promise<ShopifyProduct[]> {
    if (collectionHandle) {
      const query = `
        query CollectionProducts($handle: String!, $first: Int!) {
          collection(handle: $handle) {
            products(first: $first) { edges { node {
              id handle title description availableForSale
              priceRange { minVariantPrice { amount currencyCode } }
              featuredImage { url altText }
              variants(first: 1) { edges { node { id } } }
            } } }
          }
        }
      `;
      const data = await this.request<{
        collection: { products: Edges<RawProduct> } | null;
      }>(query, { handle: collectionHandle, first });
      return (data.collection?.products.edges ?? []).map((e) =>
        mapProduct(e.node),
      );
    }

    const query = `
      query Products($first: Int!) {
        products(first: $first) { edges { node {
          id handle title description availableForSale
          priceRange { minVariantPrice { amount currencyCode } }
          featuredImage { url altText }
          variants(first: 1) { edges { node { id } } }
        } } }
      }
    `;
    const data = await this.request<{ products: Edges<RawProduct> }>(query, {
      first,
    });
    return data.products.edges.map((e) => mapProduct(e.node));
  }

  // --- Cart API ---------------------------------------------------------

  private cartFields = `
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 50) { edges { node {
      id quantity
      merchandise { ... on ProductVariant {
        id title price { amount currencyCode }
        product { title featuredImage { url altText } }
      } }
    } } }
  `;

  async createCart(variantId: string, quantity = 1): Promise<Cart> {
    const query = `
      mutation CartCreate($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart { ${this.cartFields} }
          userErrors { message }
        }
      }
    `;
    const data = await this.request<{
      cartCreate: { cart: RawCart; userErrors: Array<{ message: string }> };
    }>(query, { lines: [{ merchandiseId: variantId, quantity }] });
    throwUserErrors(data.cartCreate.userErrors);
    return mapCart(data.cartCreate.cart);
  }

  async addLine(
    cartId: string,
    variantId: string,
    quantity = 1,
  ): Promise<Cart> {
    const query = `
      mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart { ${this.cartFields} }
          userErrors { message }
        }
      }
    `;
    const data = await this.request<{
      cartLinesAdd: { cart: RawCart; userErrors: Array<{ message: string }> };
    }>(query, {
      cartId,
      lines: [{ merchandiseId: variantId, quantity }],
    });
    throwUserErrors(data.cartLinesAdd.userErrors);
    return mapCart(data.cartLinesAdd.cart);
  }

  async updateLine(
    cartId: string,
    lineId: string,
    quantity: number,
  ): Promise<Cart> {
    const query = `
      mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart { ${this.cartFields} }
          userErrors { message }
        }
      }
    `;
    const data = await this.request<{
      cartLinesUpdate: {
        cart: RawCart;
        userErrors: Array<{ message: string }>;
      };
    }>(query, { cartId, lines: [{ id: lineId, quantity }] });
    throwUserErrors(data.cartLinesUpdate.userErrors);
    return mapCart(data.cartLinesUpdate.cart);
  }

  async removeLine(cartId: string, lineId: string): Promise<Cart> {
    const query = `
      mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart { ${this.cartFields} }
          userErrors { message }
        }
      }
    `;
    const data = await this.request<{
      cartLinesRemove: {
        cart: RawCart;
        userErrors: Array<{ message: string }>;
      };
    }>(query, { cartId, lineIds: [lineId] });
    throwUserErrors(data.cartLinesRemove.userErrors);
    return mapCart(data.cartLinesRemove.cart);
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const query = `
      query GetCart($cartId: ID!) {
        cart(id: $cartId) { ${this.cartFields} }
      }
    `;
    const data = await this.request<{ cart: RawCart | null }>(query, {
      cartId,
    });
    return data.cart ? mapCart(data.cart) : null;
  }
}

// --- Raw response shapes + mappers -------------------------------------

interface Edges<T> {
  edges: Array<{ node: T }>;
}

interface RawProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: Money };
  featuredImage?: { url: string; altText?: string } | null;
  variants: Edges<{ id: string }>;
}

interface RawCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: Money };
  lines: Edges<{
    id: string;
    quantity: number;
    merchandise: {
      id: string;
      title: string;
      price: Money;
      product: { title: string; featuredImage?: { url: string } | null };
    };
  }>;
}

function mapProduct(p: RawProduct): ShopifyProduct {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    availableForSale: p.availableForSale,
    price: p.priceRange.minVariantPrice,
    imageUrl: p.featuredImage?.url,
    variantId: p.variants.edges[0]?.node.id,
  };
}

function mapCart(c: RawCart): Cart {
  return {
    id: c.id,
    checkoutUrl: c.checkoutUrl,
    totalQuantity: c.totalQuantity,
    subtotal: c.cost.subtotalAmount,
    lines: c.lines.edges.map((e) => ({
      id: e.node.id,
      quantity: e.node.quantity,
      variantId: e.node.merchandise.id,
      title: e.node.merchandise.title,
      productTitle: e.node.merchandise.product.title,
      price: e.node.merchandise.price,
      imageUrl: e.node.merchandise.product.featuredImage?.url,
    })),
  };
}

function throwUserErrors(errors: Array<{ message: string }>): void {
  if (errors?.length) {
    throw new Error(errors.map((e) => e.message).join('; '));
  }
}
