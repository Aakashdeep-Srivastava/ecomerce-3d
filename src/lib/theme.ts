import type { ClientConfig } from '../config/types';

/**
 * Applies a client config to the live document: CSS variables, fonts, favicon
 * and SEO/OG meta. Called once at startup so the single-screen experience is
 * fully white-labeled without touching component code or the static HTML.
 */
export function applyClientConfig(config: ClientConfig): void {
  if (typeof document === 'undefined') return;
  const { theme, brand } = config;
  const root = document.documentElement;

  root.style.setProperty('--bg-color', theme.bgColor);
  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--accent-color', theme.accentColor);
  root.style.setProperty('--border-color', theme.borderColor);
  root.style.setProperty('--font-title', theme.fontTitle);
  root.style.setProperty('--font-sans', theme.fontSans);

  if (theme.googleFontsHref) {
    ensureLink('client-fonts', {
      rel: 'stylesheet',
      href: theme.googleFontsHref,
    });
  }

  ensureLink('dynamic-favicon', {
    rel: 'icon',
    href: brand.faviconSrc,
  });

  document.title = brand.name;
  setMeta('description', brand.tagline);
  setMeta('og:title', brand.name, 'property');
  setMeta('og:description', brand.tagline, 'property');
  setMeta('og:type', 'website', 'property');
  if (brand.ogImageSrc) setMeta('og:image', brand.ogImageSrc, 'property');
  setMeta('twitter:card', 'summary_large_image');
}

function ensureLink(id: string, attrs: Record<string, string>): void {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    document.head.appendChild(link);
  }
  for (const [k, v] of Object.entries(attrs)) link.setAttribute(k, v);
}

function setMeta(
  name: string,
  content: string,
  attr: 'name' | 'property' = 'name',
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${name}"]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
