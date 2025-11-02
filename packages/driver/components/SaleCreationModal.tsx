import React, { useState, useEffect } from 'react';
import { User, Vegetable, Language, UserWishlistItemDetail } from '@common/types';
import { getTodaysVegetables, recordSale } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import { addAction } from '../offline';

interface SaleCreationModalProps {
  user: User;
  wishlist: UserWishlistItemDetail[];
  onClose: () => void;
}

interface OrderLineItem {
    vegetable: Vegetable;
    quantity: string;
}

const quantityOptions = ['100g', '250g', '500g', '1kg'];

const SaleCreationModal: React.FC<SaleCreationModalProps> = ({ user, wishlist, onClose }) => {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVeggies = async () => {
      try {
        const veggiesData = await getTodaysVegetables();
        setVegetables(veggiesData);
      } catch (err) {
        setError('Could not load vegetable list.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchVeggies();
  }, []);
  
  const handleQuantityChange = (veg: Vegetable, quantity: string) => {
      setOrderItems(prev => {
          const existingIndex = prev.findIndex(item => item.vegetable.id === veg.id);
          if (existingIndex > -1) {
              if (quantity) {
                  const newItems = [...prev];
                  newItems[existingIndex] = { ...newItems[existingIndex], quantity };
                  return newItems;
              } else {
                  return prev.filter(item => item.vegetable.id !== veg.id);
              }
          } else if (quantity) {
              return [...prev, { vegetable: veg, quantity }];
          }
          return prev;
      });
  };
  
  const getQuantityForVeg = (vegId: number) => {
    return orderItems.find(item => item.vegetable.id === vegId)?.quantity || '';
  }
  
  const calculateTotal = () => {
      return orderItems.reduce((total, item) => {
          const { price } = item.vegetable;
          const quantityValue = parseFloat(item.quantity);
          const unit = item.quantity.replace(/[0-9.]/g, '');
          
          let multiplier = 0;
          if (unit === 'kg') multiplier = quantityValue;
          else if (unit === 'g') multiplier = quantityValue / 1000;
          return total + (price * multiplier);
      }, 0);
  };
  
  const totalBill = calculateTotal();
  
  const handleConfirmSale = async () => {
      setIsSaving(true);
      setError('');
      
      const saleItems = orderItems.map(item => {
          const { price, id, name } = item.vegetable;
          const quantityValue = parseFloat(item.quantity);
          const unit = item.quantity.replace(/[0-9.]/g, '');
          let multiplier = 0;
          if (unit === 'kg') multiplier = quantityValue;
          else if (unit === 'g') multiplier = quantityValue / 1000;

          return {
              vegetableId: id,
              vegetableName: name[Language.EN],
              quantity: item.quantity,
              price: price * multiplier,
          };
      });

      if (!navigator.onLine) {
          try {
              await addAction({
                  type: 'RECORD_SALE',
                  payload: { userId: user.phone, items: saleItems, total: totalBill, isUrgent: false }
              });
              alert('You are offline. Sale has been saved and will sync automatically when you are back online.');
              onClose();
          } catch (err) {
              setError('Failed to save sale offline. Please try again.');
          } finally {
              setIsSaving(false);
          }
          return;
      }

      try {
        await recordSale(user.phone, saleItems, totalBill);
        alert('Sale recorded successfully!');
        onClose();
      } catch (err: any) {
          setError(err.message || "Failed to record sale.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Create Sale for {user.name}</h2>
          <p className="text-sm text-gray-500">{user.address}</p>
        </header>

        <main className="p-6 flex-grow overflow-y-auto max-h-[60vh]">
          {wishlist && wishlist.length > 0 && (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-md shadow-sm">
                <p className="font-bold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.125L5 18V4z" /></svg>
                    Customer's Wishlist for Today:
                </p>
                <ul className="list-disc list-inside mt-2 ml-2 space-y-1 text-sm">
                    {wishlist.map((item, index) => (
                        <li key={index}><span className="font-semibold">{item.vegetableName}</span> - {item.quantity}</li>
                    ))}
                </ul>
            </div>
          )}
          {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-3">
              {vegetables.map(veg => (
                <div key={veg.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                        <p className="font-semibold">{veg.name.EN}</p>
                        <p className="text-sm text-green-600">₹{veg.price} / {veg.unit.EN}</p>
                    </div>
                    <div className="flex space-x-2">
                        {quantityOptions.map(q => (
                             <button
                                key={q}
                                onClick={() => handleQuantityChange(veg, getQuantityForVeg(veg.id) === q ? '' : q)}
                                className={`w-16 py-2 text-sm font-semibold rounded-md border-2 transition-colors ${getQuantityForVeg(veg.id) === q ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'}`}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
              ))}
            </div>
          )}
        </main>
        
        <footer className="bg-gray-100 p-6 rounded-b-lg border-t">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-lg font-medium text-gray-600">Total Bill</p>
                    <p className="text-4xl font-bold text-green-700">₹{totalBill.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleConfirmSale} 
                        disabled={isSaving || orderItems.length === 0}
                        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg disabled:bg-gray-400"
                    >
                        {isSaving ? 'Saving...' : 'Confirm Sale'}
                    </button>
                </div>
            </div>
            {error && <p className="text-red-500 text-right mt-2">{error}</p>}
        </footer>
      </div>
    </div>
  );
};

export default SaleCreationModal;
