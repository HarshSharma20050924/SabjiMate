import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Language, Vegetable, User, Coupon } from '../../../common/types';
import { translations } from '../../../common/constants';
import { getTodaysVegetables, placeUrgentOrder, verifyPayment, validateCoupon } from '../../../common/api';
import LoadingSpinner from '../../../common/components/LoadingSpinner';
import ConfirmationOverlay from '../../../common/components/ConfirmationOverlay';

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
            <div className="mt-3">
                {quantityInGrams > 0 ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <button onClick={() => onQuantityChange(quantityInGrams - QUANTITY_STEP_G)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-lg">-</button>
                            <span className="font-bold w-16 text-center">{formatGrams(quantityInGrams)}</span>
                            <button onClick={() => onQuantityChange(quantityInGrams + QUANTITY_STEP_G)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-lg">+</button>
                        </div>
                        <span className="font-bold text-green-700 text-lg">₹{itemPrice.toFixed(2)}</span>
                    </div>
                ) : (
                    <button onClick={() => onQuantityChange(QUANTITY_STEP_G)} className="w-full bg-green-100 text-green-700 font-bold py-2 rounded-lg hover:bg-green-200 transition-colors">
                        Add
                    </button>
                )}
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
        <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-800">{t.urgentOrderTitle}</h2>
                <button onClick={fetchVeggies} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"><RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} /></button>
            </div>
            <p className="text-gray-600 mt-1">{t.urgentOrderDesc}</p>
        </div>
        <div className="relative mb-6">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full text-lg pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" />
        </div>
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
                <div className="grid grid-cols-2 gap-4 pb-32">
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
                <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t">
                    <button onClick={onReview} disabled={itemCount === 0} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Review Order & Pay ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </button>
                </div>
            </>
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
    <div className="animate-slide-in-right-fast">
        <header className="flex items-center space-x-4 mb-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100"><BackIcon className="w-6 h-6 text-gray-700"/></button>
            <h2 className="text-2xl font-bold text-gray-800">Order Summary</h2>
        </header>
        <div className="space-y-4 pb-32">
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
        </div>
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-4 bg-white border-t">
            <button onClick={handlePlaceOrder} disabled={!paymentMethod || isPlacingOrder} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isPlacingOrder ? t.loading : `Place Order (₹${billDetails.grandTotal.toFixed(2)})`}
            </button>
        </div>
    </div>
);

// --- Main Component ---

const UrgentOrderScreen: React.FC<{ language: Language; user: User }> = ({ language, user }) => {
    const t = translations[language];
    const [view, setView] = useState<'list' | 'summary'>('list');
    const [vegetables, setVegetables] = useState<Vegetable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [order, setOrder] = useState<Map<number, number>>(new Map()); // vegId -> quantity in grams
    const [confirmation, setConfirmation] = useState({ show: false, message: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD' | null>(null);
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponError, setCouponError] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const fetchVeggies = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const veggiesData = await getTodaysVegetables(user.city);
            setVegetables(veggiesData);
        } catch (error) { 
            console.error("Failed to fetch vegetables:", error);
            setError("Could not load available vegetables. Please try again.");
        }
        finally { setIsLoading(false); }
    }, [user.city]);

    useEffect(() => { fetchVeggies(); }, [fetchVeggies]);
    
    const handleQuantityChange = (vegId: number, grams: number) => {
        setOrder(prev => {
            const newOrder = new Map(prev);
            if (grams > 0) {
                newOrder.set(vegId, grams);
            } else {
                newOrder.delete(vegId);
            }
            return newOrder;
        });
    };

    const orderItems = useMemo(() => Array.from(order.entries()).map(([vegId, quantityInGrams]) => ({
        veg: vegetables.find(v => v.id === vegId)!,
        quantityInGrams
    })).filter(item => item.veg), [order, vegetables]);

    const billDetails = useMemo(() => {
        const subtotal = orderItems.reduce((total, item) => total + calculatePrice(item.veg.price, item.quantityInGrams), 0);
        let discount = 0;
        if (appliedCoupon) {
            if (!appliedCoupon.minOrderValue || subtotal >= appliedCoupon.minOrderValue) {
                discount = appliedCoupon.discountType === 'PERCENTAGE' ? subtotal * (appliedCoupon.discountValue / 100) : appliedCoupon.discountValue;
                discount = Math.min(discount, subtotal);
            }
        }
        const totalAfterDiscount = subtotal - discount;
        const gst = (totalAfterDiscount + DELIVERY_CHARGE) * GST_RATE;
        const grandTotal = totalAfterDiscount + DELIVERY_CHARGE + gst;
        return { subtotal, deliveryCharge: DELIVERY_CHARGE, gst, grandTotal, discount };
    }, [orderItems, appliedCoupon]);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setIsApplyingCoupon(true);
        setCouponError('');
        try {
            const coupon = await validateCoupon(couponInput.toUpperCase());
            if (coupon.minOrderValue && billDetails.subtotal < coupon.minOrderValue) {
                throw new Error(`Minimum order of ₹${coupon.minOrderValue} required.`);
            }
            setAppliedCoupon(coupon);
            setCouponInput('');
        } catch (err: any) { setCouponError(err.message); setAppliedCoupon(null); }
        finally { setIsApplyingCoupon(false); }
    };

    const handleRemoveCoupon = () => { setAppliedCoupon(null); setCouponError(''); };

    const handlePlaceOrder = async () => {
        if (!paymentMethod) { alert("Please select a payment method."); return; }
        setIsPlacingOrder(true);
        const orderPayload = orderItems.map(item => ({
            vegetableId: item.veg.id,
            vegetableName: item.veg.name[language],
            quantity: formatGrams(item.quantityInGrams),
            price: calculatePrice(item.veg.price, item.quantityInGrams),
        }));
        try {
            const commonPayload = [orderPayload, billDetails.grandTotal, paymentMethod, appliedCoupon?.code] as const;
            if (paymentMethod === 'COD') {
                await placeUrgentOrder(...commonPayload);
                setConfirmation({ show: true, message: 'Order Placed! Pay on delivery.' });
                setOrder(new Map()); setView('list');
            } else {
                const { sale, razorpayOrder, keyId } = await placeUrgentOrder(...commonPayload);
                const options = {
                    key: keyId, amount: razorpayOrder.amount, currency: razorpayOrder.currency, name: "सब्ज़ीMATE",
                    description: "Urgent Order Payment", order_id: razorpayOrder.id,
                    handler: async (response: any) => {
                        try {
                            await verifyPayment({ ...response }, sale.id);
                            setConfirmation({ show: true, message: t.paymentSuccess });
                            setOrder(new Map()); setView('list');
                        } catch { alert("Payment verification failed. Please contact support."); }
                    },
                    prefill: { name: user.name, contact: user.phone }, theme: { color: "#059669" },
                };
                new (window as any).Razorpay(options).open();
            }
        } catch (error) { alert((error as Error).message || 'Failed to place order.'); }
        finally { setIsPlacingOrder(false); }
    };
    
    const filteredVegetables = useMemo(() => vegetables.filter(veg =>
        searchQuery === '' ||
        veg.name[Language.EN].toLowerCase().includes(searchQuery.toLowerCase()) ||
        veg.name[Language.HI].includes(searchQuery)
    ), [vegetables, searchQuery]);

    return (
        <div className="p-4">
            <ConfirmationOverlay show={confirmation.show} message={confirmation.message} onClose={() => setConfirmation({ show: false, message: '' })} />
            {view === 'list' ? (
                <ListView
                    t={t}
                    fetchVeggies={fetchVeggies}
                    isLoading={isLoading}
                    error={error}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    filteredVegetables={filteredVegetables}
                    order={order}
                    handleQuantityChange={handleQuantityChange}
                    itemCount={order.size}
                    onReview={() => setView('summary')}
                />
            ) : (
                <SummaryView
                    t={t}
                    onBack={() => setView('list')}
                    orderItems={orderItems}
                    billDetails={billDetails}
                    couponInput={couponInput}
                    setCouponInput={setCouponInput}
                    appliedCoupon={appliedCoupon}
                    couponError={couponError}
                    isApplyingCoupon={isApplyingCoupon}
                    handleApplyCoupon={handleApplyCoupon}
                    handleRemoveCoupon={handleRemoveCoupon}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    isPlacingOrder={isPlacingOrder}
                    handlePlaceOrder={handlePlaceOrder}
                />
            )}
        </div>
    );
};

export default UrgentOrderScreen;