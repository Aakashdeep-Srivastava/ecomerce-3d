import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { ProductInfo } from './components/ProductInfo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { config } from './config';

// Code-split the Three.js scene: the heavy 3D bundle loads after the shell
// paints, so first contentful paint isn't blocked by WebGL libraries.
const Scene = lazy(() =>
  import('./components/Scene').then((m) => ({ default: m.Scene })),
);

// The rack has a fixed number of wings; each quarter-turn presents the next.
const WINGS = config.garments.length;
const QUARTER_TURN = Math.PI / 2;

/** Map a continuous Y-rotation to the 0..WINGS-1 garment currently facing front. */
function rotationToIndex(rotationY: number): number {
  const steps = Math.round(-rotationY / QUARTER_TURN);
  return ((steps % WINGS) + WINGS * 2) % WINGS;
}

const textures = config.garments.map((g) => g.texture);

export const App: React.FC = () => {
  const [targetRotationY, setTargetRotationY] = useState(0);
  const activeIndex = rotationToIndex(targetRotationY);

  const handleRotateLeft = () =>
    setTargetRotationY((prev) => prev + QUARTER_TURN);
  const handleRotateRight = () =>
    setTargetRotationY((prev) => prev - QUARTER_TURN);

  // Keyboard navigation (Left / Right arrows).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleRotateLeft();
      else if (e.key === 'ArrowRight') handleRotateRight();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Swipe / drag navigation for touch and mouse.
  const pointerStartX = useRef<number | null>(null);
  const pointerMoved = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
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
    if (Math.abs(diffX) > 35 && pointerMoved.current) {
      if (diffX > 0) handleRotateRight();
      else handleRotateLeft();
    }
    pointerStartX.current = null;
    pointerMoved.current = false;
  };

  const resetPointer = () => {
    pointerStartX.current = null;
    pointerMoved.current = false;
  };

  return (
    <main
      className="boutique-main-section"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetPointer}
    >
      {/* Boutique Interior Background Layer */}
      <div className="boutique-bg-wrapper">
        <img
          src={config.brand.backgroundSrc}
          alt=""
          className="boutique-bg-image"
          fetchPriority="high"
        />
        <div className="boutique-bg-overlay" />
      </div>

      {/* 3D Three.js Canvas Layer */}
      <ErrorBoundary>
        <Suspense fallback={<div className="scene-loading" aria-hidden="true" />}>
          <Scene targetRotationY={targetRotationY} textures={textures} />
        </Suspense>
      </ErrorBoundary>

      {/* UI Overlay Layer */}
      <div className="ui-layer">
        <Navbar />
        <ProductInfo
          activeIndex={activeIndex}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
        />
      </div>
    </main>
  );
};

export default App;
