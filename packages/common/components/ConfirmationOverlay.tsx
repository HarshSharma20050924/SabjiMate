import React, { useEffect } from 'react';

interface ConfirmationOverlayProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

const ConfirmationTickIcon: React.FC = () => (
    <svg className="w-24 h-24 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ConfirmationOverlay: React.FC<ConfirmationOverlayProps> = ({ show, message, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500); // Overlay visible for 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center animate-zoom-in text-center">
        <ConfirmationTickIcon />
        <p className="mt-4 text-xl font-bold text-gray-800 max-w-xs">{message}</p>
      </div>
    </div>
  );
};

export default ConfirmationOverlay;