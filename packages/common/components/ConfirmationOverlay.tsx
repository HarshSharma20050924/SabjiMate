import React, { useEffect } from 'react';

interface ConfirmationOverlayProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

// New sophisticated checkmark icon designed for animation
const AnimatedCheckmarkIcon: React.FC = () => (
    <svg className="w-24 h-24" viewBox="0 0 52 52">
        <circle 
            className="checkmark-circle" 
            cx="26" 
            cy="26" 
            r="25" 
            fill="none"
        />
        <path 
            className="checkmark-tick" 
            fill="none" 
            d="M14 27l8 8 16-16"
        />
    </svg>
);

const ConfirmationOverlay: React.FC<ConfirmationOverlayProps> = ({ show, message, onClose }) => {
  useEffect(() => {
    if (show) {
      // The total animation duration is 3 seconds.
      const timer = setTimeout(() => {
        onClose();
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) {
    return null;
  }

  return (
    <div className="confirmation-backdrop fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="confirmation-modal bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center border border-gray-200/50 w-full max-w-xs">
        <AnimatedCheckmarkIcon />
        <h2 className="mt-5 text-2xl font-bold text-gray-800">{message}</h2>
        <p className="mt-2 text-base text-gray-500">
          We'll keep an eye on the prices for you.
        </p>
      </div>
    </div>
  );
};

export default ConfirmationOverlay;