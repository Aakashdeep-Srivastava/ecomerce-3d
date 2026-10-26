import React, { useState } from 'react';
import { config } from '../config';
import { useCart } from '../lib/cart';
import { CartDrawer } from './CartDrawer';

export const Navbar: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart, isLive } = useCart();

  const accountUrl =
    isLive && config.shopify ? `https://${config.shopify.domain}/account` : null;

  return (
    <>
      <header className="navbar-minimal">
        {/* Center Boutique Brand Logo */}
        <div className="navbar-brand-center">
          <a href="/" className="navbar-logo-link" aria-label={`${config.brand.name} Home`}>
            <img
              src={config.brand.logoSrc}
              alt={config.brand.name}
              className="navbar-brand-logo"
            />
          </a>
        </div>

        {/* Top Right Actions */}
        <div className="navbar-right">
          {accountUrl && (
            <a className="nav-text-btn" href={accountUrl}>
              ACCOUNT
            </a>
          )}

          <button
            className="cart-text-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Shopping cart, ${cart.totalQuantity} item${cart.totalQuantity === 1 ? '' : 's'}`}
          >
            <span>CART</span>
            <span className="cart-badge-pill">{cart.totalQuantity}</span>
          </button>
        </div>
      </header>

      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
};
