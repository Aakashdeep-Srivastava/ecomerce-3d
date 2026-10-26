import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RotationControlsProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

export const RotationControls: React.FC<RotationControlsProps> = ({
  onRotateLeft,
  onRotateRight,
}) => {
  return (
    <div className="rotation-controls">
      <button 
        className="rotate-btn left" 
        onClick={onRotateLeft}
        aria-label="Rotate Left"
        title="Rotate Left (90°)"
      >
        <ChevronLeft size={24} strokeWidth={2.5} />
      </button>
      
      <button 
        className="rotate-btn right" 
        onClick={onRotateRight}
        aria-label="Rotate Right"
        title="Rotate Right (90°)"
      >
        <ChevronRight size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
};
