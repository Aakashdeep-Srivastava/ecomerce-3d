import React, { useEffect, useRef } from 'react';
import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../lib/cart';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ open, onClose }) => {
  const { cart, isLive, busy, error, setLineQuantity, removeLine } = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape; move focus into the drawer when it opens (a11y).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isEmpty = cart.lines.length === 0;

  return (
    <>
      <div
        className={`cart-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className={`cart-drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!open}
      >
        <div className="cart-header">
          <h2 className="cart-title">Your Cart</h2>
          <button
            ref={closeBtnRef}
            className="close-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {isEmpty ? (
          <div className="cart-empty">
            <ShoppingBag size={40} strokeWidth={1.5} />
            <p>Your cart is currently empty</p>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.lines.map((line) => (
                <li key={line.id} className="cart-line">
                  {line.imageUrl ? (
                    <img
                      className="cart-line-img"
                      src={line.imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="cart-line-img cart-line-img--placeholder" />
                  )}
                  <div className="cart-line-body">
                    <span className="cart-line-title">{line.title}</span>
                    <span className="cart-line-price">{line.priceLabel}</span>
                    <div className="cart-qty">
                      <button
                        aria-label="Decrease quantity"
                        disabled={busy}
                        onClick={() =>
                          setLineQuantity(line.id, line.quantity - 1)
                        }
                      >
                        <Minus size={13} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        disabled={busy}
                        onClick={() =>
                          setLineQuantity(line.id, line.quantity + 1)
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <button
                    className="cart-line-remove"
                    aria-label={`Remove ${line.title}`}
                    disabled={busy}
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="cart-footer">
              {error && <p className="cart-error" role="alert">{error}</p>}
              <div className="cart-subtotal">
                <span>Subtotal</span>
                <span>{cart.subtotalLabel}</span>
              </div>
              {isLive && cart.checkoutUrl ? (
                <a
                  className="cart-checkout-btn"
                  href={cart.checkoutUrl}
                  aria-disabled={busy}
                >
                  CHECKOUT
                </a>
              ) : (
                <button className="cart-checkout-btn" disabled title="Demo mode — connect Shopify to enable checkout">
                  CHECKOUT (DEMO)
                </button>
              )}
              {!isLive && (
                <p className="cart-demo-note">
                  Demo cart — add a Shopify store to this deployment to enable
                  real checkout.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
};
