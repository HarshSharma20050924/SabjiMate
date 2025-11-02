import React, { useState } from 'react';
import { Language, Vegetable } from '../../common/types';
import { translations } from '../../common/constants';
import { calculateItemPrice } from '../../common/utils';
import StarRating from '../../common/components/StarRating';

interface VegetableDetailModalProps {
  vegetable: Vegetable;
  language: Language;
  initialQuantity: string;
  onClose: () => void;
  onQuantityChange: (id: number, quantity: string) => void;
  isLocked?: boolean;
}

const quantityOptions = ['100g', '250g', '500g', '1kg'];

const VegetableDetailModal: React.FC<VegetableDetailModalProps> = ({ vegetable, language, initialQuantity, onClose, onQuantityChange, isLocked = false }) => {
  const t = translations[language];
  const [quantity, setQuantity] = useState(initialQuantity);
  const calculatedPrice = calculateItemPrice(vegetable.price, quantity);

  const handleUpdate = () => {
    if (isLocked) return;
    onQuantityChange(vegetable.id, quantity);
    onClose();
  };
  
  const handleQuantitySelect = (option: string) => {
    if (isLocked) return;
    // Toggle behavior: if the same option is clicked again, deselect it.
    setQuantity(prev => (prev === option ? '' : option));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={vegetable.image} alt={vegetable.name[language]} className="w-full h-48 object-cover" loading="lazy" />
          <button onClick={onClose} className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 shadow-md hover:bg-opacity-75 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{vegetable.name[language]}</h2>
               {vegetable.averageRating && vegetable.ratingCount ? (
                    <div className="mt-2">
                        <StarRating rating={vegetable.averageRating} count={vegetable.ratingCount} size="md" />
                    </div>
                ) : null}
              <div className="flex items-baseline space-x-2 my-2">
                <p className="text-gray-500 font-semibold line-through">
                    ₹{vegetable.marketPrice}
                </p>
                <p className="text-green-600 font-bold text-2xl">
                    ₹{vegetable.price}
                </p>
                <p className="text-gray-700 font-semibold">
                    / {vegetable.unit[language]}
                </p>
              </div>
            </div>
            {calculatedPrice !== null && (
                <div className="text-right">
                    <p className="text-sm text-gray-500">Price</p>
                    <p className="text-3xl font-bold text-orange-600">
                        ₹{calculatedPrice.toFixed(2)}
                    </p>
                </div>
            )}
          </div>


          {vegetable.description && (
            <p className="text-gray-600 my-4 text-base">
                {vegetable.description}
            </p>
          )}
          
          <div className="grid grid-cols-4 gap-2 my-6">
              {quantityOptions.map(option => (
                  <button
                      key={option}
                      onClick={() => handleQuantitySelect(option)}
                      className={`py-3 px-1 text-md font-semibold rounded-lg border-2 transition-colors ${quantity === option ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'} disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:border-gray-300`}
                      disabled={isLocked}
                  >
                      {option}
                  </button>
              ))}
          </div>
          {isLocked && <p className="text-center text-sm text-yellow-800 bg-yellow-100 p-2 rounded-md mb-4">Today's list is locked and cannot be modified.</p>}
          <button onClick={handleUpdate} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={isLocked}>
            {quantity && !isLocked ? `${t.updateOrder} (${quantity})` : t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(VegetableDetailModal);
