import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { config } from './config';
import { applyClientConfig } from './lib/theme';
import { CartProvider } from './lib/cart';

// White-label the document (CSS vars, fonts, favicon, SEO meta) before paint.
applyClientConfig(config);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
);
