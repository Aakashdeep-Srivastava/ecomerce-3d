import React, { useState } from 'react';
import { Search, Menu, X, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  cartCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount = 0 }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className="navbar-minimal">
        {/* Top Left Menu Icon */}
        <button className="menu-btn" aria-label="Toggle menu">
          <Menu size={22} strokeWidth={1.5} />
        </button>

        {/* Center Boutique Brand Logo */}
        <div className="navbar-brand-center">
          <a href="/" className="navbar-logo-link" aria-label="Aavriti Boutique Home">
            <img 
              src="/aavriti-logo.png" 
              alt="Aavriti Boutique Lotus Logo" 
              className="navbar-brand-logo" 
            />
          </a>
        </div>

        {/* Top Right Actions */}
        <div className="navbar-right">
          <button className="nav-icon-btn" aria-label="Search">
            <Search size={18} strokeWidth={1.75} />
          </button>
          
          <button className="nav-text-btn">
            ACCOUNT
          </button>

          <button 
            className="cart-text-btn" 
            onClick={() => setIsCartOpen(true)}
            aria-label="Shopping Cart"
          >
            <span>CART</span>
            <span className="cart-badge-pill">{cartCount}</span>
          </button>
        </div>
      </header>

      {/* Cart Drawer */}
      <div 
        className={`cart-overlay ${isCartOpen ? 'open' : ''}`}
        onClick={() => setIsCartOpen(false)}
      />
      <aside className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2 className="cart-title">Your Cart</h2>
          <button 
            className="close-btn" 
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>
        <div className="cart-empty">
          <ShoppingBag size={40} strokeWidth={1.5} />
          <p>Your cart is currently empty</p>
        </div>
      </aside>
    </>
  );
};
