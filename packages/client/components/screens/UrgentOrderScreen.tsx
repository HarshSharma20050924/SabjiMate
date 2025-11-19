import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Language, Vegetable, User, Coupon, Sale } from '../../../common/types';
import { translations } from '../../../common/constants';
import { getTodaysVegetables, placeUrgentOrder, verifyPayment, validateCoupon } from '../../../common/api';
import LoadingSpinner from '../../../common/components/LoadingSpinner';
import L from 'leaflet';

// --- ICONS ---
const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
);
const EmptyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-16 w-16"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.012-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" /></svg>
);
const RefreshIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
);
const BackIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
);
const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
);
const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
);


// --- CONFIGURATION ---
const DELIVERY_CHARGE = 20.0;
const GST_RATE = 0.05; // 5%
const QUANTITY_STEP_G = 250;


const formatGrams = (grams: number) => {
    if (grams < 1000) {
        return `${grams}g`;
    }
    return `${grams / 1000}kg`;
};

const calculatePrice = (pricePerKg: number, grams: number) => {
    return (pricePerKg / 1000) * grams;
};

// --- Sub-components moved out to prevent re-rendering issues ---

const VegetableItemCard: React.FC<{
    veg: Vegetable;
    quantityInGrams: number;
    onQuantityChange: (grams: number) => void;
    language: Language;
}> = ({ veg, quantityInGrams, onQuantityChange, language }) => {
    const itemPrice = calculatePrice(veg.price, quantityInGrams);

    return (
        <div className={`bg-white p-3 rounded-lg shadow-md transition-all duration-300 flex flex-col justify-between ${quantityInGrams > 0 ? 'border-2 border-green-500' : ''}`}>
            <div>
                <img src={veg.image} alt={veg.name[language]} className="w-full h-24 object-cover rounded-md mb-2" />
                <h3 className="font-bold text-gray-800 text-md">{veg.name[language]}</h3>
                <p className="text-sm text-gray-500">
                    <span className="line-through">₹{veg.marketPrice}</span> <span className="text-green-600 font-semibold">₹{veg.price} / {veg.unit[language]}</span>
                </p>
            </div>
            <div className="mt-3 h-20 flex flex-col justify-end">
                <div className="w-full">
                    {quantityInGrams > 0 ? (
                        <div className="flex items-center justify-between flex-nowrap">
                            <div className="flex items-center space-x-1">
                                <button onClick={() => onQuantityChange(quantityInGrams - QUANTITY_STEP_G)} className="w-7 h-7 bg-gray-200 rounded-full font-bold text-md flex items-center justify-center flex-shrink-0">-</button>
                                <span className="font-bold w-12 text-center text-sm">{formatGrams(quantityInGrams)}</span>
                                <button onClick={() => onQuantityChange(quantityInGrams + QUANTITY_STEP_G)} className="w-7 h-7 bg-gray-200 rounded-full font-bold text-md flex items-center justify-center flex-shrink-0">+</button>
                            </div>
                            <span className="font-semibold text-green-700 text-md ml-2 flex-shrink-0">₹{itemPrice.toFixed(2)}</span>
                        </div>
                    ) : (
                        <button onClick={() => onQuantityChange(QUANTITY_STEP_G)} className="w-full bg-green-100 text-green-700 font-bold py-2 rounded-lg hover:bg-green-200 transition-colors">
                            Add
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ListView: React.FC<{
    t: any;
    fetchVeggies: () => void;
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filteredVegetables: Vegetable[];
    order: Map<number, number>;
    handleQuantityChange: (vegId: number, grams: number) => void;
    itemCount: number;
    onReview: () => void;
}> = ({ t, fetchVeggies, isLoading, error, searchQuery, setSearchQuery, filteredVegetables, order, handleQuantityChange, itemCount, onReview }) => (
    <>
        <div className="text-center mb-6 flex-shrink-0">
            <div className="flex items-center justify-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-800">{t.urgentOrderTitle}</h2>
                <button onClick={fetchVeggies} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"><RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} /></button>
            </div>
            <p className="text-gray-600 mt-1">{t.urgentOrderDesc}</p>
        </div>
        <div className="relative mb-6 flex-shrink-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-lg pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" />
        </div>
        <div className="flex-grow overflow-y-auto pb-24">
            {isLoading ? <LoadingSpinner /> : error ? (
                <div className="text-center p-8 my-8 bg-gray-50 rounded-lg">
                    <div className="mx-auto w-16 h-16 text-red-500"><ErrorIcon /></div>
                    <h3 className="mt-4 text-xl font-semibold text-gray-800">Something Went Wrong</h3>
                    <p className="mt-2 text-gray-600">{error}</p>
                    <div className="mt-6">
                        <button onClick={fetchVeggies} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700">
                        Retry
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        {filteredVegetables.length > 0 ? filteredVegetables.map(veg => (
                            <VegetableItemCard
                                key={veg.id}
                                veg={veg}
                                quantityInGrams={order.get(veg.id) || 0}
                                onQuantityChange={(grams) => handleQuantityChange(veg.id, grams)}
                                language={Language.EN}
                            />
                        )) : (
                            <div className="col-span-2 text-center p-8 my-8 bg-gray-50 rounded-lg">
                                <div className="mx-auto w-16 h-16 text-gray-400"><EmptyIcon /></div>
                                <h3 className="mt-4 text-xl font-semibold text-gray-800">{t.noVeggiesFound}</h3>
                                <p className="mt-2 text-gray-600">No vegetables are available for urgent order right now.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
        {itemCount > 0 && (
             <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                <button onClick={onReview} disabled={itemCount === 0} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Review Order & Pay ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </button>
            </div>
        )}
    </>
);

const SummaryView: React.FC<{
    t: any;
    onBack: () => void;
    orderItems: { veg: Vegetable; quantityInGrams: number }[];
    billDetails: { subtotal: number; deliveryCharge: number; gst: number; grandTotal: number; discount: number };
    couponInput: string;
    setCouponInput: (c: string) => void;
    appliedCoupon: Coupon | null;
    couponError: string;
    isApplyingCoupon: boolean;
    handleApplyCoupon: () => void;
    handleRemoveCoupon: () => void;
    paymentMethod: 'ONLINE' | 'COD' | null;
    setPaymentMethod: (m: 'ONLINE' | 'COD') => void;
    isPlacingOrder: boolean;
    handlePlaceOrder: () => void;
}> = ({ t, onBack, orderItems, billDetails, couponInput, setCouponInput, appliedCoupon, couponError, isApplyingCoupon, handleApplyCoupon, handleRemoveCoupon, paymentMethod, setPaymentMethod, isPlacingOrder, handlePlaceOrder }) => (
    <div className="animate-slide-in-right-fast h-full flex flex-col">
        <header className="flex-shrink-0 flex items-center space-x-4 mb-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><BackIcon className="w-6 h-6 text-gray-700"/></button>
            <h2 className="text-2xl font-bold text-gray-800">Order Summary</h2>
        </header>
        <main className="flex-grow overflow-y-auto space-y-4 pr-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-bold text-lg mb-2 border-b pb-2">Your Items</h3>
                <ul className="space-y-2">
                    {orderItems.map(item => (
                        <li key={item.veg.id} className="flex justify-between items-center text-sm">
                            <div>
                                <p className="font-semibold text-gray-800">{item.veg.name[Language.EN]}</p>
                                <p className="text-gray-500">{formatGrams(item.quantityInGrams)}</p>
                            </div>
                            <p className="font-semibold text-gray-900">₹{calculatePrice(item.veg.price, item.quantityInGrams).toFixed(2)}</p>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="bg-white p-4 rounded-lg shadow-md space-y-2">
                <h3 className="font-bold text-lg mb-3">Apply Coupon</h3>
                {appliedCoupon ? (
                    <div className="flex justify-between items-center bg-green-100 p-2 rounded-lg">
                        <p className="text-sm font-semibold text-green-800">Code <span className="font-bold">{appliedCoupon.code}</span> applied!</p>
                        <button onClick={handleRemoveCoupon} className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                    </div>
                ) : (
                    <div>
                        <div className="flex space-x-2">
                            <input type="text" value={couponInput} onChange={e => setCouponInput(e.target.value)} placeholder="Enter coupon code" className="flex-grow px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm uppercase placeholder:normal-case"/>
                            <button onClick={handleApplyCoupon} disabled={isApplyingCoupon} className="bg-orange-500 text-white font-bold px-4 rounded-md disabled:bg-gray-400">{isApplyingCoupon ? '...' : 'Apply'}</button>
                        </div>
                        {couponError && <p className="text-red-600 text-xs mt-1">{couponError}</p>}
                    </div>
                )}
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md space-y-2">
                 <h3 className="font-bold text-lg mb-2 border-b pb-2">Bill Details</h3>
                 <div className="flex justify-between text-sm"><p className="text-gray-600">Item Total</p><p className="font-medium text-gray-800">₹{billDetails.subtotal.toFixed(2)}</p></div>
                 {billDetails.discount > 0 && (<div className="flex justify-between text-sm text-green-600"><p>Coupon Discount</p><p className="font-medium">- ₹{billDetails.discount.toFixed(2)}</p></div>)}
                 <div className="flex justify-between text-sm"><p className="text-gray-600">Delivery Fee</p><p className="font-medium text-gray-800">₹{billDetails.deliveryCharge.toFixed(2)}</p></div>
                 <div className="flex justify-between text-sm"><p className="text-gray-600">GST (5%)</p><p className="font-medium text-gray-800">₹{billDetails.gst.toFixed(2)}</p></div>
                 <div className="border-t my-2"></div>
                 <div className="flex justify-between font-bold text-lg"><p>Grand Total</p><p>₹{billDetails.grandTotal.toFixed(2)}</p></div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-bold text-lg mb-3">Select Payment Method</h3>
                <div className="space-y-3">
                    <button onClick={() => setPaymentMethod('ONLINE')} className={`w-full flex items-center justify-between p-3 border-2 rounded-lg text-left transition-colors ${paymentMethod === 'ONLINE' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                        <div><p className="font-semibold">Pay Online</p><p className="text-xs text-gray-500">UPI, Cards, Wallets</p></div><CreditCardIcon className="w-6 h-6 text-green-600"/>
                    </button>
                    <button onClick={() => setPaymentMethod('COD')} className={`w-full flex items-center justify-between p-3 border-2 rounded-lg text-left transition-colors ${paymentMethod === 'COD' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                        <div><p className="font-semibold">Cash on Delivery</p><p className="text-xs text-gray-500">Pay with cash at your doorstep</p></div><WalletIcon className="w-6 h-6 text-green-600"/>
                    </button>
                </div>
            </div>
        </main>
        <footer className="flex-shrink-0 pt-4">
            <button onClick={handlePlaceOrder} disabled={!paymentMethod || isPlacingOrder} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isPlacingOrder ? t.loading : `Place Order (₹${billDetails.grandTotal.toFixed(2)})`}
            </button>
        </footer>
    </div>
);

// --- NEW ORDER STATUS VIEW ---
const OrderStatusView: React.FC<{ order: Sale; user: User; onDone: () => void; }> = ({ order, user, onDone }) => {
    const [step, setStep] = useState(1);
    const [driverLocation, setDriverLocation] = useState<{ lat: number, lon: number } | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);

    const steps = [
        { title: 'Order Placed', details: 'We have received your order.' },
        { title: 'Assigning Driver', details: 'Finding the best delivery partner for you.' },
        { title: 'Driver Assigned', details: 'Ramesh is on his way!' },
        { title: 'Out for Delivery', details: 'Your vegetables are arriving soon.' },
        { title: 'Delivered', details: 'Enjoy your fresh vegetables!' },
    ];
    
    useEffect(() => {
        const timeouts = [
            setTimeout(() => setStep(2), 2000),
            setTimeout(() => setStep(3), 6000),
            setTimeout(() => setStep(4), 8000),
        ];
        return () => timeouts.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (step >= 4 && user.latitude && user.longitude) {
            const startLat = user.latitude + 0.02; // Start ~2.2km North
            const startLon = user.longitude;
            setDriverLocation({ lat: startLat, lon: startLon });

            const interval = setInterval(() => {
                setDriverLocation(prev => {
                    if (!prev) return null;
                    const newLat = prev.lat - 0.0002; // Move South
                    if (newLat <= user.latitude!) {
                        clearInterval(interval);
                        setStep(5);
                        return { lat: user.latitude!, lon: user.longitude! };
                    }
                    return { lat: newLat, lon: prev.lon };
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step, user.latitude, user.longitude]);
    
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current && driverLocation && user.latitude && user.longitude) {
            mapRef.current = L.map(mapContainerRef.current).setView([driverLocation.lat, driverLocation.lon], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
        }
    }, [driverLocation, user.latitude, user.longitude]);

    useEffect(() => {
        if (mapRef.current && driverLocation && user.latitude && user.longitude) {
            mapRef.current.eachLayer(layer => { if (layer instanceof L.Marker) mapRef.current?.removeLayer(layer); });
            const homeIcon = L.divIcon({ className: 'home-icon', html: '🏠', iconSize: [24, 24] });
            const driverIcon = L.divIcon({ className: 'driver-icon', html: '🚚', iconSize: [24, 24] });
            L.marker([user.latitude, user.longitude], { icon: homeIcon }).addTo(mapRef.current);
            L.marker([driverLocation.lat, driverLocation.lon], { icon: driverIcon }).addTo(mapRef.current);
            mapRef.current.panTo([driverLocation.lat, driverLocation.lon]);
        }
    }, [driverLocation, user.latitude, user.longitude]);

    return (
        <div className="p-4 animate-zoom-in flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">Order Status</h2>
            <div className="flex-grow space-y-4">
                {steps.map((s, index) => (
                    <div key={index} className={`flex items-start space-x-4 transition-opacity duration-500 ${step > index ? 'opacity-100' : 'opacity-30'}`}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step > index ? 'bg-green-600' : 'bg-gray-300'}`}>
                                {step > index + 1 || (step === index + 1 && index === 4) ? <span className="text-white font-bold">✓</span> : <span className="text-white font-bold">{index + 1}</span>}
                            </div>
                            {index < steps.length - 1 && <div className={`w-0.5 h-16 mt-1 ${step > index + 1 ? 'bg-green-600' : 'bg-gray-300'}`}></div>}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{s.title}</h3>
                            <p className="text-gray-600">{s.details}</p>
                            {index === 1 && step === 2 && <div className="mt-2"><LoadingSpinner/></div>}
                        </div>
                    </div>
                ))}
            </div>
            {step >= 4 && (
                <div className="my-4">
                    <div ref={mapContainerRef} className="w-full h-48 rounded-lg shadow-md border"></div>
                </div>
            )}
            <div className="flex-shrink-0 pt-4">
                <button onClick={onDone} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md">Done</button>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
interface UrgentOrderScreenProps {
  language: Language;
  user: User;
}

const UrgentOrderScreen: React.FC<UrgentOrderScreenProps> = ({ language, user }) => {
  const t = translations[language];
  
  const [view, setView] = useState<'list' | 'summary' | 'status'>('list');
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState<Map<number, number>>(new Map());

  // Summary State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD' | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Status State
  const [confirmedOrder, setConfirmedOrder] = useState<Sale | null>(null);

  const fetchVeggies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const veggiesData = await getTodaysVegetables(user.city);
      setVegetables(veggiesData);
    } catch (error) {
      console.error("Failed to fetch vegetables:", error);
      setError("Could not load vegetables. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user.city]);

  useEffect(() => {
    fetchVeggies();
  }, [fetchVeggies]);

  const handleQuantityChange = (vegId: number, grams: number) => {
    setOrder(prev => {
      const newOrder = new Map(prev);
      if (grams > 0) newOrder.set(vegId, grams);
      else newOrder.delete(vegId);
      return newOrder;
    });
  };

  const filteredVegetables = useMemo(() =>
    vegetables.filter(veg =>
      veg.name[language].toLowerCase().includes(searchQuery.toLowerCase()) ||
      veg.name[Language.HI].includes(searchQuery)
    ), [vegetables, searchQuery, language]);
    
  const orderItems = useMemo(() =>
    Array.from(order.entries()).map(([vegId, quantityInGrams]) => {
        const veg = vegetables.find(v => v.id === vegId);
        return { veg, quantityInGrams };
    }).filter(item => item.veg) as { veg: Vegetable; quantityInGrams: number }[],
  [order, vegetables]);
  
  const billDetails = useMemo(() => {
      const subtotal = orderItems.reduce((acc, item) => acc + calculatePrice(item.veg.price, item.quantityInGrams), 0);
      let discount = 0;
      if (appliedCoupon) {
          if (appliedCoupon.discountType === 'PERCENTAGE') discount = subtotal * (appliedCoupon.discountValue / 100);
          else discount = appliedCoupon.discountValue;
          discount = Math.min(discount, subtotal);
      }
      const totalAfterDiscount = subtotal - discount;
      const gst = (totalAfterDiscount + DELIVERY_CHARGE) * GST_RATE;
      const grandTotal = totalAfterDiscount + DELIVERY_CHARGE + gst;
      return { subtotal, deliveryCharge: DELIVERY_CHARGE, gst, grandTotal, discount };
  }, [orderItems, appliedCoupon]);

  const handleApplyCoupon = async () => {
      if (!couponInput) return;
      setIsApplyingCoupon(true);
      setCouponError('');
      try {
          const coupon = await validateCoupon(couponInput);
          if (coupon.minOrderValue && billDetails.subtotal < coupon.minOrderValue) {
               setCouponError(`Minimum order of ₹${coupon.minOrderValue} required.`);
               return;
          }
          setAppliedCoupon(coupon);
      } catch (err: any) {
          setCouponError(err.message || "Invalid coupon code.");
      } finally {
          setIsApplyingCoupon(false);
      }
  };
  
  const handleRemoveCoupon = () => {
      setAppliedCoupon(null);
      setCouponInput('');
  };

  const handlePlaceOrder = async () => {
      if (!paymentMethod) return;
      setIsPlacingOrder(true);
      const itemsPayload = orderItems.map(item => ({
          vegetableId: item.veg.id,
          vegetableName: item.veg.name[Language.EN],
          quantity: formatGrams(item.quantityInGrams),
          price: calculatePrice(item.veg.price, item.quantityInGrams)
      }));

      try {
          const result = await placeUrgentOrder(itemsPayload, billDetails.grandTotal, paymentMethod, appliedCoupon?.code);
          if (paymentMethod === 'COD') {
              setConfirmedOrder(result.sale);
              setView('status');
          } else if (paymentMethod === 'ONLINE' && result.razorpayOrder) {
                const options = {
                    key: result.keyId,
                    amount: result.razorpayOrder.amount,
                    currency: result.razorpayOrder.currency,
                    name: "सब्ज़ीMATE",
                    description: "Urgent Order Payment",
                    order_id: result.razorpayOrder.id,
                    handler: async (response: any) => {
                        await verifyPayment({ ...response, saleId: result.sale.id });
                        setConfirmedOrder(result.sale);
                        setView('status');
                    },
                    prefill: { name: user.name, contact: user.phone },
                    theme: { color: "#059669" },
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
                rzp.on('payment.failed', () => alert('Payment failed. Please try again.'));
          }
      } catch (err: any) {
          alert(`Order failed: ${err.message}`);
      } finally {
          setIsPlacingOrder(false);
      }
  };
  
  const handleDone = () => {
      setOrder(new Map());
      setAppliedCoupon(null);
      setCouponInput('');
      setPaymentMethod(null);
      setConfirmedOrder(null);
      setView('list');
  };

  const renderContent = () => {
    switch (view) {
        case 'list': return <ListView 
            t={t} fetchVeggies={fetchVeggies} isLoading={isLoading} error={error}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery} filteredVegetables={filteredVegetables}
            order={order} handleQuantityChange={handleQuantityChange} itemCount={orderItems.length}
            onReview={() => setView('summary')}
        />;
        case 'summary': return <SummaryView 
            t={t} onBack={() => setView('list')} orderItems={orderItems} billDetails={billDetails}
            couponInput={couponInput} setCouponInput={setCouponInput} appliedCoupon={appliedCoupon}
            couponError={couponError} isApplyingCoupon={isApplyingCoupon} handleApplyCoupon={handleApplyCoupon}
            handleRemoveCoupon={handleRemoveCoupon} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
            isPlacingOrder={isPlacingOrder} handlePlaceOrder={handlePlaceOrder}
        />;
        case 'status': return <OrderStatusView order={confirmedOrder!} user={user} onDone={handleDone} />;
        default: return null;
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
        {renderContent()}
    </div>
  );
};

export default UrgentOrderScreen;