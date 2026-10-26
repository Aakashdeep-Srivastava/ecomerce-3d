import React from 'react';
import { ChevronLeft, ChevronRight, Plus, ChevronDown, Check } from 'lucide-react';
import { config } from '../config';
import { useCart } from '../lib/cart';

interface ProductInfoProps {
  activeIndex: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({
  activeIndex,
  onRotateLeft,
  onRotateRight,
}) => {
  const { garments, addToCart, busy } = useCart();
  const totalItems = garments.length;
  const product = garments[activeIndex] ?? garments[0];
  const [justAdded, setJustAdded] = React.useState(false);

  if (!product) return null;

  const soldOut = !product.available;

  const handleAdd = async () => {
    if (soldOut || busy) return;
    await addToCart(activeIndex);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <>
      {/* Middle Left Editorial Info Block */}
      <div className="editorial-info-left" key={activeIndex}>
        <span className="editorial-category">{product.category}</span>
        <h1 className="editorial-title">{product.name}</h1>
        <p className="editorial-description">{product.description}</p>
        <div className="editorial-price">
          {product.displayPrice} <span className="em-dash">—</span>
          <span className="editorial-fabric">{product.fabric}</span>
        </div>
      </div>

      {/* Bottom Left Social Links (from client config) */}
      <div className="editorial-social-community">
        <span className="social-label">SOCIAL COMMUNITY:</span>
        <div className="social-links">
          {config.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Middle Right Carousel Nav & Add To Cart */}
      <div className="editorial-controls-right">
        <div className="editorial-slider-nav">
          <button className="slider-arrow" onClick={onRotateLeft} aria-label="Previous garment">
            <ChevronLeft size={16} strokeWidth={2} />
          </button>

          <div className="slider-track-line">
            <div
              className="slider-track-fill"
              style={{ width: `${((activeIndex + 1) / totalItems) * 100}%` }}
            />
          </div>

          <button className="slider-arrow" onClick={onRotateRight} aria-label="Next garment">
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        <button
          className="editorial-add-cart-btn"
          onClick={handleAdd}
          disabled={soldOut || busy}
          aria-label={soldOut ? 'Sold out' : `Add ${product.name} to cart`}
        >
          <span>{soldOut ? 'SOLD OUT' : justAdded ? 'ADDED' : 'ADD TO CART'}</span>
          {soldOut ? null : justAdded ? (
            <Check size={18} strokeWidth={2} />
          ) : (
            <Plus size={18} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Bottom Right Language Selector */}
      <div className="editorial-lang-select">
        <span>{config.languageLabel}</span>
        <ChevronDown size={14} strokeWidth={2} />
      </div>
    </>
  );
};
