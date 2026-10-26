import type { ClientConfig } from '../types';

/**
 * Aavriti Boutique — the launch client.
 *
 * This is the reference config: copy this file to add a new client, change the
 * brand, theme, garments and socials, drop the new id into VITE_CLIENT, and
 * deploy. No component code changes required.
 */
export const aavriti: ClientConfig = {
  id: 'aavriti',
  brand: {
    name: 'Aavriti Boutique',
    tagline:
      'An immersive 3D boutique — rotate the rack to explore handcrafted garments in real-time.',
    logoSrc: '/aavriti-logo.png',
    backgroundSrc: '/boutique-bg.png',
    faviconSrc: '/favicon.svg',
    ogImageSrc: '/boutique-bg.png',
  },
  theme: {
    bgColor: '#f6f6f6',
    textPrimary: '#111111',
    textSecondary: '#777777',
    accentColor: '#000000',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    fontTitle: "'Oswald', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSans:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsHref:
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Oswald:wght@500;600;700&display=swap',
  },
  languageLabel: 'ENG',
  socials: [
    { label: 'FACEBOOK', href: 'https://facebook.com' },
    { label: 'INSTAGRAM', href: 'https://instagram.com' },
    { label: 'PINTEREST', href: 'https://pinterest.com' },
  ],
  garments: [
    {
      texture: '/garment.png',
      category: 'JACKET',
      name: 'RAINS',
      fabric: 'Waterproof Polyurethane',
      price: '₹ 2,499',
      description:
        'The classic long rain jacket of the Danish brand Rains, modeled on the legendary M-51 parka silhouette.',
    },
    {
      texture: '/yellow.png',
      category: 'KURTI',
      name: 'SUNFLOWER YELLOW',
      fabric: 'Pure Linen Cotton',
      price: '₹ 1,899',
      description:
        'Vibrant mustard yellow handcrafted tunic featuring fine threadwork and light breathable summer weave.',
    },
    {
      texture: '/red.png',
      category: 'ANARKALI',
      name: 'CRIMSON RED',
      fabric: 'Royal Chanderi Silk',
      price: '₹ 3,299',
      description:
        'Rich crimson red traditional flared gown crafted with subtle metallic embroidery and matching inner layer.',
    },
    {
      texture: '/black.png',
      category: 'KURTA',
      name: 'MIDNIGHT BLACK',
      fabric: 'Premium Raw Silk',
      price: '₹ 2,199',
      description:
        'Sleek obsidian black silhouette featuring structured tailored fit and minimal modern finish.',
    },
  ],
};
