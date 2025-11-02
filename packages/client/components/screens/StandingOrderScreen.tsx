import React, { useState, useEffect, useCallback } from 'react';
import { Language, Vegetable, User, StandingOrderItem } from '../../../common/types';
import { getTodaysVegetables, getStandingOrder, updateStandingOrder } from '../../../common/api';
import LoadingSpinner from '../../../common/components/LoadingSpinner';

interface StandingOrderScreenProps {
  language: Language;
  user: User;
  onClose: () => void;
}

const quantityOptions = ['100g', '250g', '500g', '1kg'];

const StandingOrderScreen: React.FC<StandingOrderScreenProps> = ({ language, user, onClose }) => {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [standingOrder, setStandingOrder] = useState<StandingOrderItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [veggiesData, standingOrderData] = await Promise.all([
        getTodaysVegetables(user.city),
        getStandingOrder()
      ]);
      setVegetables(veggiesData);
      setStandingOrder(standingOrderData);
    } catch (error) {
      console.error("Failed to fetch data for standing order screen:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user.city]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateQuantity = (vegId: number, newQuantity: string) => {
    setStandingOrder(prevOrder => {
      const existingItemIndex = prevOrder.findIndex(item => item.vegetableId === vegId);
      if (existingItemIndex > -1) {
        if (!newQuantity) {
          return prevOrder.filter(item => item.vegetableId !== vegId);
        }
        const updatedOrder = [...prevOrder];
        updatedOrder[existingItemIndex] = { ...updatedOrder[existingItemIndex], quantity: newQuantity };
        return updatedOrder;
      } else if (newQuantity) {
        return [...prevOrder, { vegetableId: vegId, quantity: newQuantity }];
      }
      return prevOrder;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await updateStandingOrder(standingOrder);
        alert('Your Daily Essentials have been saved!');
        onClose();
    } catch (error) {
        console.error("Failed to save standing order:", error);
        alert('Failed to save your list. Please try again.');
    } finally {
        setIsSaving(false);
    }
  };

  const getQuantity = (vegId: number): string => {
    return standingOrder.find(item => item.vegetableId === vegId)?.quantity || '';
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 animate-slide-in-right-fast flex flex-col">
      <header className="flex items-center justify-between p-4 border-b bg-white sticky top-0">
        <h2 className="text-xl font-bold text-gray-800">My Daily Essentials</h2>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-800 font-semibold">Close</button>
      </header>
      
      <main className="flex-grow overflow-y-auto p-4">
        <p className="text-gray-600 text-center mb-6">Select the items and quantities you typically need. We'll add them to your daily list automatically.</p>
        
        {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-4 pb-24">
              {vegetables.map(veg => (
                <div key={veg.id} className="bg-white p-4 rounded-lg shadow-md relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{veg.name[language]}</h3>
                      <p className="text-green-600 font-semibold">₹{veg.price} / {veg.unit[language]}</p>
                    </div>
                  </div>
                   <div className="grid grid-cols-4 gap-2 mt-3">
                      {quantityOptions.map(option => (
                          <button
                              key={option}
                              onClick={() => updateQuantity(veg.id, getQuantity(veg.id) === option ? '' : option)}
                              className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${getQuantity(veg.id) === option ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'}`}
                          >
                              {option}
                          </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t sticky bottom-0">
        <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : `Save Essentials (${standingOrder.length} items)`}
        </button>
      </footer>
    </div>
  );
};

export default StandingOrderScreen;