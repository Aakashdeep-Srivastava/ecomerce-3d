import React from 'react';
import { ChevronLeft, ChevronRight, Plus, ChevronDown } from 'lucide-react';

export const products = [
  {
    category: "JACKET",
    name: "RAINS",
    fabric: "Waterproof Polyurethane",
    price: "₹ 2,499",
    description: "The classic long rain jacket of the Danish brand Rains, modeled on the legendary M-51 parka silhouette.",
  },
  {
    category: "KURTI",
    name: "SUNFLOWER YELLOW",
    fabric: "Pure Linen Cotton",
    price: "₹ 1,899",
    description: "Vibrant mustard yellow handcrafted tunic featuring fine threadwork and light breathable summer weave.",
  },
  {
    category: "ANARKALI",
    name: "CRIMSON RED",
    fabric: "Royal Chanderi Silk",
    price: "₹ 3,299",
    description: "Rich crimson red traditional flared gown crafted with subtle metallic embroidery and matching inner layer.",
  },
  {
    category: "KURTA",
    name: "MIDNIGHT BLACK",
    fabric: "Premium Raw Silk",
    price: "₹ 2,199",
    description: "Sleek obsidian black silhouette featuring structured tailored fit and minimal modern finish.",
  }
];

interface ProductInfoProps {
  activeIndex: number;
  totalItems?: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onAddToCart?: () => void;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({
  activeIndex,
  totalItems = 4,
  onRotateLeft,
  onRotateRight,
  onAddToCart
}) => {
  const product = products[activeIndex] || products[0];

  return (
    <>
      {/* Middle Left Editorial Info Block */}
      <div className="editorial-info-left" key={activeIndex}>
        <span className="editorial-category">{product.category}</span>
        <h1 className="editorial-title">{product.name}</h1>
        <p className="editorial-description">{product.description}</p>
        <div className="editorial-price">
          {product.price} <span className="em-dash">—</span>
        </div>
      </div>

      {/* Bottom Left Social Links */}
      <div className="editorial-social-community">
        <span className="social-label">SOCIAL COMMUNITY:</span>
        <div className="social-links">
          <a href="#facebook" onClick={(e) => e.preventDefault()}>FACEBOOK</a>
          <a href="#instagram" onClick={(e) => e.preventDefault()}>INSTAGRAM</a>
          <a href="#pinterest" onClick={(e) => e.preventDefault()}>PINTEREST</a>
        </div>
      </div>

      {/* Middle Right Carousel Nav & Add To Cart */}
      <div className="editorial-controls-right">
        {/* Carousel Slider Control: < — > */}
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

        {/* Add To Cart + Button */}
        <button className="editorial-add-cart-btn" onClick={onAddToCart}>
          <span>ADD TO CART</span>
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Bottom Right Language Selector */}
      <div className="editorial-lang-select">
        <span>ENG</span>
        <ChevronDown size={14} strokeWidth={2} />
      </div>
    </>
  );
};
