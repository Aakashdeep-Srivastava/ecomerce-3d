import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Scene } from './components/Scene';
import { ProductInfo } from './components/ProductInfo';

export const App: React.FC = () => {
  const [targetRotationY, setTargetRotationY] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  // Calculate activeIndex here to pass it to ProductInfo
  const activeIndex = (((Math.round(-targetRotationY / (Math.PI / 2))) % 4) + 6) % 4;

  const handleRotateLeft = () => {
    setTargetRotationY((prev) => prev + Math.PI / 2);
  };

  const handleRotateRight = () => {
    setTargetRotationY((prev) => prev - Math.PI / 2);
  };

  const handleAddToCart = () => {
    setCartCount((prev) => prev + 1);
  };

  // Keyboard shortcut listener for Left and Right Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleRotateLeft();
      } else if (e.key === 'ArrowRight') {
        handleRotateRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Swipe / Drag Gestures for both touch and desktop mouse
  const pointerStartX = React.useRef<number | null>(null);
  const pointerMoved = React.useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Avoid triggering drag navigation when clicking buttons or interactive links
    if ((e.target as HTMLElement).closest('button, a, input, select')) return;
    pointerStartX.current = e.clientX;
    pointerMoved.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    if (Math.abs(e.clientX - pointerStartX.current) > 8) {
      pointerMoved.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const diffX = pointerStartX.current - e.clientX;

    // Threshold of 35px for slide gesture
    if (Math.abs(diffX) > 35 && pointerMoved.current) {
      if (diffX > 0) {
        handleRotateRight(); // Dragged left -> next garment
      } else {
        handleRotateLeft();  // Dragged right -> prev garment
      }
    }
    pointerStartX.current = null;
    pointerMoved.current = false;
  };

  return (
    <main 
      className="boutique-main-section"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStartX.current = null;
        pointerMoved.current = false;
      }}
    >
      {/* Sunlit Minimalist Boutique Interior Background Layer */}
      <div className="boutique-bg-wrapper">
        <img 
          src="/boutique-bg.png" 
          alt="Sunlit Minimalist Boutique Interior" 
          className="boutique-bg-image" 
        />
        <div className="boutique-bg-overlay" />
      </div>

      {/* 3D Three.js Canvas Layer */}
      <Scene targetRotationY={targetRotationY} />

      {/* UI Overlay Layer */}
      <div className="ui-layer">
        <Navbar cartCount={cartCount} />
        <ProductInfo 
          activeIndex={activeIndex} 
          onRotateLeft={handleRotateLeft} 
          onRotateRight={handleRotateRight} 
          onAddToCart={handleAddToCart}
        />
      </div>
    </main>
  );
};

export default App;
