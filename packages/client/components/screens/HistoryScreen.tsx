import React, { useState, useEffect, useCallback } from 'react';
import { Language, BillEntry, User, OrderItem } from '@common/types';
import { translations } from '@common/constants';
import { getBills, getTodaysVegetables } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import StarRating from '@common/components/StarRating';

const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
);
const EmptyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015.25 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5" /></svg>
);


interface HistoryScreenProps {
  language: Language;
  user: User;
  onReorder: (items: OrderItem[]) => void;
}

const getStatusStyles = (status: string) => {
    switch(status) {
        case 'PAID_ONLINE': return 'bg-green-100 text-green-800';
        case 'PAID_CASH': return 'bg-blue-100 text-blue-800';
        case 'UNPAID': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

interface HistoryBillItemProps { 
    bill: BillEntry; 
    onReorder: (bill: BillEntry) => void; 
    language: Language;
}

const HistoryBillItem: React.FC<HistoryBillItemProps> = ({ bill, onReorder, language }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[language];

  return (
    <div className="bg-white rounded-lg shadow-md mb-3 overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left p-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-700">{new Date(bill.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusStyles(bill.paymentStatus)}`}>
              {bill.paymentStatus.replace('_', ' ').toLowerCase()}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
            <span className="font-bold text-lg text-gray-800">Total: ₹{bill.total.toFixed(2)}</span>
            <div className="flex items-center space-x-2">
                {bill.batchReview && <StarRating rating={bill.batchReview.rating} size="sm" />}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
            <div className="mt-2 border-t pt-2">
            {bill.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm text-gray-600 py-1">
                    <span>{item.name} (x{String(item.quantity)})</span>
                    <span>₹{item.price.toFixed(2)}</span>
                </div>
            ))}
            </div>
            <button 
                onClick={() => onReorder(bill)}
                className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
                {t.reorderItems}
            </button>
        </div>
      )}
    </div>
  );
};


const HistoryScreen: React.FC<HistoryScreenProps> = ({ language, user, onReorder }) => {
  const t = translations[language];
  const [bills, setBills] = useState<BillEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const billsData = await getBills(user);
      setBills(billsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(error) {
      console.error("Failed to fetch bills:", error);
      setError("We couldn't load your order history. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleReorder = async (bill: BillEntry) => {
      try {
          const todaysVeggies = await getTodaysVegetables(user.city);
          const availableVeggieIds = new Set(todaysVeggies.map(v => v.id));

          const itemsToReorder: OrderItem[] = bill.items
            .filter(item => availableVeggieIds.has(item.vegetableId))
            .map(item => ({ id: item.vegetableId, quantity: String(item.quantity) }));
          
          if(itemsToReorder.length > 0) {
              onReorder(itemsToReorder);
          } else {
              alert(t.reorderUnavailable);
          }
          
      } catch (error) {
          console.error("Failed to check for available vegetables:", error);
          alert(t.reorderError);
      }
  };

  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="text-center p-8 my-8 bg-gray-50 rounded-lg">
                <div className="mx-auto w-16 h-16 text-red-500"><ErrorIcon /></div>
                <h3 className="mt-4 text-xl font-semibold text-gray-800">Something Went Wrong</h3>
                <p className="mt-2 text-gray-600">{error}</p>
                <div className="mt-6">
                    <button onClick={fetchBills} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700">
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    
    if (bills.length > 0) {
        return (
            <div className="space-y-3">
                {bills.map((bill) => (
                    <HistoryBillItem 
                        key={bill.id} 
                        bill={bill} 
                        onReorder={handleReorder} 
                        language={language}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="text-center p-8 my-8 bg-gray-50 rounded-lg">
            <div className="mx-auto w-16 h-16 text-gray-400"><EmptyIcon /></div>
            <h3 className="mt-4 text-xl font-semibold text-gray-700">No Past Orders</h3>
            <p className="mt-2 text-gray-500">You haven't placed any orders yet. Your history will show up here.</p>
        </div>
    );
  };


  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{t.orderHistory}</h2>
      </div>
      
      {renderContent()}

    </div>
  );
};

export default HistoryScreen;