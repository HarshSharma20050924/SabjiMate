
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Language, BillEntry, User, OrderItem } from '../../../common/types';
import { translations } from '../../../common/constants';
import { getBills, createPaymentOrder, verifyPayment, getTodaysVegetables } from '../../../common/api';
import LoadingSpinner from '../../../common/components/LoadingSpinner';
import ConfirmationOverlay from '../../../common/components/ConfirmationOverlay';
import StarRating from '../../../common/components/StarRating';

const BatchRatingModal = lazy(() => import('../BatchRatingModal'));

const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
);
const EmptyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015.25 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5" /></svg>
);


interface BillsScreenProps {
  language: Language;
  user: User;
  isTruckLive: boolean;
  onTrackNow: () => void;
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

const ExpandableBillItem: React.FC<{ 
    bill: BillEntry; 
    onReorderClick: (bill: BillEntry) => void; 
    language: Language;
}> = ({ bill, onReorderClick, language }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[language];

  return (
    <div className="bg-white rounded-lg shadow-md mb-3 overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left p-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-700">{new Date(bill.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase ${getStatusStyles(bill.paymentStatus)}`}>
              {bill.paymentStatus.replace('_', ' ')}
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
        <div className="px-4 pb-4 animate-zoom-in" style={{animationDuration: '0.3s'}}>
            <div className="mt-2 border-t pt-2 space-y-2">
            {bill.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm text-gray-600 py-1">
                    <span>{item.name} (x{String(item.quantity)})</span>
                    <span>₹{item.price.toFixed(2)}</span>
                </div>
            ))}
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onReorderClick(bill); }}
                className="w-full mt-4 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
                {t.reorderItems}
            </button>
        </div>
      )}
    </div>
  );
};


const LiveDeliveryBanner: React.FC<{onClick: () => void}> = ({ onClick }) => (
    <div 
        onClick={onClick} 
        className="mb-4 bg-blue-100 border-2 border-blue-300 text-blue-800 p-3 flex justify-between items-center cursor-pointer z-10 animate-pulse-bg rounded-lg"
        style={{ animationDuration: '3s' }}
    >
        <p className="font-semibold text-sm">A delivery is on the way!</p>
        <span className="font-bold text-sm flex items-center">
            Track now 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
        </span>
    </div>
);


const BillsScreen: React.FC<BillsScreenProps> = ({ language, user, isTruckLive, onTrackNow, onReorder }) => {
  const t = translations[language];
  const [bills, setBills] = useState<BillEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [confirmation, setConfirmation] = useState({ show: false, message: '' });
  const [cashRecorded, setCashRecorded] = useState(false);
  const [ratingModalSaleId, setRatingModalSaleId] = useState<number | null>(null);

  const fetchBills = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const billsData = await getBills(user);
      const sortedBills = billsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBills(sortedBills);

      // Check if the latest bill needs a rating
      if (sortedBills.length > 0) {
        const latestBill = sortedBills[0];
        const todayStr = new Date().toISOString().split('T')[0];
        const dismissedKey = `rating-dismissed-${latestBill.id}`;

        // Only show if: same day, no review yet, and NOT dismissed in this session
        if (latestBill.date === todayStr && !latestBill.batchReview && !sessionStorage.getItem(dismissedKey)) {
          setRatingModalSaleId(latestBill.id);
        }
      }

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

  const unpaidBills = bills.filter(bill => bill.paymentStatus === 'UNPAID');
  const unpaidBalance = unpaidBills.reduce((acc, bill) => acc + bill.total, 0);

  const handlePayNow = async () => {
      setIsPaying(true);
      try {
          const order = await createPaymentOrder(unpaidBalance);
          const options = {
              key: order.keyId,
              amount: order.amount,
              currency: order.currency,
              name: "सब्ज़ीMATE",
              description: "Bill Payment",
              image: "/logo.svg",
              order_id: order.id,
              handler: async function (response: any) {
                  try {
                      await verifyPayment({
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                      });
                      setConfirmation({ show: true, message: t.paymentSuccess });
                  } catch (verifyError) {
                      console.error("Payment verification failed", verifyError);
                      alert("Payment verification failed. Please contact support.");
                  }
              },
              prefill: { name: user.name, contact: user.phone },
              theme: { color: "#059669" },
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
      } catch (error) {
          console.error("Payment failed", error);
          alert("Payment failed. Please try again.");
      } finally {
          setIsPaying(false);
      }
  };
  
  const handleRecordCashPayment = () => {
      alert("This is for your records. Your driver will officially confirm the cash payment.");
      setCashRecorded(true);
  };

  const handleConfirmationClose = () => {
      setConfirmation({ show: false, message: '' });
      fetchBills(); // Refetch bills after the confirmation overlay closes
  };

  const handleCloseRatingModal = () => {
    if (ratingModalSaleId) {
        // Crucial: Set session storage to prevent reopening on next fetch/render
        sessionStorage.setItem(`rating-dismissed-${ratingModalSaleId}`, 'true');
    }
    setRatingModalSaleId(null);
  };
  
  const handleSubmitRatingSuccess = () => {
      setRatingModalSaleId(null);
      fetchBills(); // Refetch to update the UI with the new rating
  };


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

      return (
        <>
            <div className="bg-white p-4 rounded-lg shadow-lg mb-6 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Unpaid Balance</span>
                <span className="text-4xl font-extrabold text-red-700">₹{unpaidBalance.toFixed(2)}</span>
                </div>
                <div className="flex space-x-2 mt-4">
                    <button 
                        onClick={handlePayNow}
                        disabled={isPaying || unpaidBalance === 0 || confirmation.show}
                        className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isPaying ? t.loading : t.payNow}
                    </button>
                    <button 
                        onClick={handleRecordCashPayment}
                        disabled={unpaidBalance === 0 || cashRecorded}
                        className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {cashRecorded ? 'Cash Payment Noted' : 'Record Cash Payment'}
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {bills.length > 0 ? bills.map((bill) => (
                    <ExpandableBillItem
                        key={bill.id}
                        bill={bill}
                        onReorderClick={handleReorder}
                        language={language}
                    />
                )) : (
                    <div className="text-center p-8 my-8 bg-gray-50 rounded-lg">
                        <div className="mx-auto w-16 h-16 text-gray-400"><EmptyIcon /></div>
                        <h3 className="mt-4 text-xl font-semibold text-gray-800">No Orders Yet</h3>
                        <p className="mt-2 text-gray-600">Your past orders will appear here once you've made a purchase.</p>
                    </div>
                )}
            </div>
        </>
      );
  }

  return (
    <div className="p-4">
      <ConfirmationOverlay show={confirmation.show} message={confirmation.message} onClose={handleConfirmationClose} />
      {isTruckLive && <LiveDeliveryBanner onClick={onTrackNow} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{t.billsTitle}</h2>
        <button onClick={fetchBills} disabled={isLoading} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 disabled:text-gray-400">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
      
      {renderContent()}

      {ratingModalSaleId && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]"><LoadingSpinner /></div>}>
            <BatchRatingModal
                language={language}
                show={!!ratingModalSaleId}
                onClose={handleCloseRatingModal}
                onSubmitSuccess={handleSubmitRatingSuccess}
                saleId={ratingModalSaleId}
            />
        </Suspense>
      )}
    </div>
  );
};

export default BillsScreen;
