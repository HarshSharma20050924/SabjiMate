import React, { useState, useRef } from 'react';
import { Vegetable, Language } from '@common/types';
import { calculateItemPrice } from '@common/utils';
import StarRating from '@common/components/StarRating';

interface VegetableCardProps {
  vegetable: Vegetable;
  language: Language;
  onClick: () => void;
  onQuickAdd: (startElement: HTMLElement, imageUrl: string) => void;
  quantity?: string;
  isLocked?: boolean;
}

const VegetableCard: React.FC<VegetableCardProps> = ({ vegetable, language, onClick, onQuickAdd, quantity, isLocked = false }) => {
  
  const [showAdded, setShowAdded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const savings = vegetable.marketPrice - vegetable.price;
  const calculatedPrice = quantity ? calculateItemPrice(vegetable.price, quantity) : null;

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked || showAdded || !imageRef.current) return;
    
    onQuickAdd(imageRef.current, vegetable.image);
    
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1200);
  };
  
  const handleCardClick = () => {
    if (isLocked) return;
    onClick();
  }

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (isLocked) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const cardClasses = `
    rounded-lg shadow-md overflow-hidden transition-all duration-300 
    w-full text-left relative flex flex-col
    border-4 ${quantity ? 'border-green-500 bg-green-50' : 'border-transparent bg-white'}
    ${isLocked ? 'cursor-not-allowed opacity-75' : 'transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}
  `;

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={cardClasses}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-disabled={isLocked}
      aria-label={`View details for ${vegetable.name[language]}`}
    >
      <div className="relative">
        <img ref={imageRef} src={vegetable.image} alt={vegetable.name[language]} className="w-full h-32 object-cover" loading="lazy" />
        
        {showAdded && (
            <div className="absolute inset-0 bg-green-900 bg-opacity-70 flex items-center justify-center rounded-t-lg animate-zoom-in pointer-events-none">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
        )}

        {!quantity && !showAdded && (
          <button 
            onClick={handleQuickAddClick}
            className={`absolute top-2 right-2 flex items-center justify-center bg-green-600 text-white rounded-full w-8 h-8 shadow-lg z-10 ${!isLocked && 'transform hover:scale-110 transition-transform'} disabled:bg-gray-400`}
            aria-label={`Quick Add ${vegetable.name[language]}`}
            disabled={isLocked}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {savings > 0 && (
            <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg z-10">
                SAVE ₹{savings.toFixed(0)}
            </div>
        )}
      </div>

      <div className="p-3 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-md font-bold text-gray-800 truncate">{vegetable.name[language]}</h3>
           <div className="flex items-center space-x-2 mt-1">
                {vegetable.averageRating && vegetable.ratingCount ? (
                    <StarRating rating={vegetable.averageRating} count={vegetable.ratingCount} size="sm" />
                ) : (
                    <div className="h-5" /> 
                )}
           </div>
          <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-gray-500 text-sm line-through">
                ₹{vegetable.marketPrice}
              </p>
              <p className="text-green-600 font-bold text-xl">
                ₹{vegetable.price}
              </p>
              <p className="text-gray-600 text-sm">
                  / {vegetable.unit[language]}
              </p>
          </div>
        </div>
        <div className="mt-2 h-10 flex items-center justify-between">
            {quantity && !showAdded ? (
                <span className="text-md font-bold bg-green-100 text-green-800 px-3 py-1 rounded-full">{quantity}</span>
            ) : showAdded ? (
                 <div className="bg-green-600 text-white text-sm font-bold px-3 py-1.5 rounded-full animate-zoom-in flex items-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span>Added!</span>
                 </div>
            ) : vegetable.offerTag ? (
                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{vegetable.offerTag}</span>
            ) : <div />}
          
          {calculatedPrice !== null && (
            <p className="text-xl font-bold text-green-600 ml-auto">
                ₹{calculatedPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(VegetableCard);
