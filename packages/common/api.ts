import {
  User,
  Vegetable,
  BillEntry,
  OrderItem,
  VoiceOrderPayload,
  WishlistItem,
  StandingOrderItem,
  Sale,
  UserWithBill,
  AggregatedWishlistItem,
  DeliveryArea,
  LocationPrice,
  ParsedOrderItem,
  Recipe,
  VegetableAdminPayload,
  UserWishlist,
  Coupon,
  ChatMessage,
} from './types';

let accessToken: string | null = null;
let refreshToken: string | null = null;

// This event is used to signal the AuthContext to perform a logout
const forceLogoutEvent = new Event('force-logout');

export const setAuthTokens = (newAccessToken: string | null, newRefreshToken: string | null) => {
  accessToken = newAccessToken;
  refreshToken = newRefreshToken;
  if (newAccessToken && newRefreshToken) {
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

const getHeaders = (includeContentType = true) => {
  const headers: HeadersInit = {};
  const token = accessToken || localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// A wrapper for all fetch requests that handles token refreshing
const apiFetch = async (url: string, options: RequestInit): Promise<Response> => {
    // We need to clone the options to safely modify headers for the retry attempt
    const optionsClone = JSON.parse(JSON.stringify(options));
    
    let response = await fetch(url, { ...options, headers: getHeaders(!options.body || !(options.body instanceof FormData)) });

    if (response.status === 401) {
        console.log('Received 401, attempting to refresh token...');
        const storedRefreshToken = refreshToken || localStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
            window.dispatchEvent(forceLogoutEvent);
            throw new Error('Session expired. Please log in again.');
        }

        try {
            const refreshResponse = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
            });

            if (!refreshResponse.ok) {
                throw new Error('Could not refresh token');
            }

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
            setAuthTokens(newAccessToken, newRefreshToken);

            console.log('Token refreshed successfully. Retrying original request...');
            // Retry the original request with the new token
            optionsClone.headers = getHeaders(!optionsClone.body || !(optionsClone.body instanceof FormData));
            response = await fetch(url, optionsClone);
        } catch (error) {
            console.error('Token refresh failed:', error);
            window.dispatchEvent(forceLogoutEvent);
            throw new Error('Session expired. Please log in again.');
        }
    }

    return response;
};

// Public endpoint for client to check wishlist lock status
export const getPublicWishlistLockStatus = async (): Promise<{ isLocked: boolean }> => {
    const response = await fetch('/api/settings/wishlist-lock'); // Public, no auth needed
    if (!response.ok) throw new Error('Failed to fetch public wishlist lock status');
    return response.json();
}


// --- Auth ---
export const sendOtp = async (phone: string): Promise<void> => {
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send OTP');
  }
};

export const verifyOtp = async (phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string; user: User }> => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'OTP verification failed');
  }
  return response.json();
};

export const loginUser = async (phone: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: User }> => {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
    }
    return response.json();
};

export const logoutUser = async (): Promise<void> => {
    const currentRefreshToken = refreshToken || localStorage.getItem('refreshToken');
    if (currentRefreshToken) {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });
    }
};

// --- User ---
export const updateUser = async (userData: User): Promise<User> => {
  const response = await apiFetch('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Failed to update user');
  return response.json();
};

// --- Vegetables ---
export const getTodaysVegetables = async (city?: string | null): Promise<Vegetable[]> => {
  const url = city ? `/api/vegetables?city=${encodeURIComponent(city)}` : '/api/vegetables';
  const response = await apiFetch(url, { method: 'GET' });
  if (!response.ok) throw new Error('Failed to fetch vegetables');
  return response.json();
};

// --- Delivery Confirmation ---
export const sendDeliveryConfirmation = async (choice: 'YES' | 'NO', user: User): Promise<void> => {
  await apiFetch('/api/deliveries/confirm', {
    method: 'POST',
    body: JSON.stringify({ choice }),
  });
};

// --- Wishlist ---
export const submitWishlist = async (items: WishlistItem[]): Promise<void> => {
    await apiFetch('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ items }),
    });
};

export const getMyTodaysWishlist = async (): Promise<WishlistItem[]> => {
    const response = await apiFetch('/api/wishlist', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch wishlist');
    return response.json();
}

// --- Standing Order ---
export const getStandingOrder = async (): Promise<StandingOrderItem[]> => {
    const response = await apiFetch('/api/standing-order', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch standing order');
    return response.json();
};

export const updateStandingOrder = async (items: StandingOrderItem[]): Promise<void> => {
    await apiFetch('/api/standing-order', {
        method: 'POST',
        body: JSON.stringify({ items }),
    });
};


// --- AI Services ---
export const getRecipeOfTheDay = async (vegetableNames: string[]): Promise<Recipe> => {
    const response = await apiFetch('/api/ai/recipe-of-the-day', {
        method: 'POST',
        body: JSON.stringify({ vegetableNames }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recipe');
    }
    return response.json();
};

export const processAudioOrder = async (audioBlob: Blob): Promise<ParsedOrderItem[]> => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    const response = await apiFetch('/api/ai/process-audio-order', {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error('Failed to process audio');
    return response.json();
};

export const reverseGeocode = async (lat: number, lon: number): Promise<{ address: string; city: string; state: string }> => {
    const response = await apiFetch('/api/ai/reverse-geocode', {
        method: 'POST',
        body: JSON.stringify({ lat, lon }),
    });
    if (!response.ok) throw new Error('Reverse geocoding failed');
    return response.json();
};

export const sendChatMessage = async (history: ChatMessage[], message: string, systemInstruction: string): Promise<{ response: string }> => {
    const response = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ history, message, systemInstruction }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get chat response');
    }
    return response.json();
};

// --- Orders ---
export const placeUrgentOrder = async (
    items: { vegetableId: number; vegetableName: string; quantity: string; price: number }[],
    total: number,
    paymentMethod: 'COD' | 'ONLINE',
    couponCode?: string
): Promise<any> => {
    const response = await apiFetch('/api/orders/urgent', {
        method: 'POST',
        body: JSON.stringify({ items, total, paymentMethod, couponCode }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
    }
    return response.json();
};

// --- Promotions ---
export const validateCoupon = async (code: string): Promise<Coupon> => {
  const response = await apiFetch(`/api/promotions/validate/${code}`, {
    method: 'GET',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Invalid coupon');
  }
  return response.json();
};


// --- Reviews ---
export const submitReview = async (payload: {
  saleItemId: number;
  rating: number;
  comment?: string;
}): Promise<void> => {
  const response = await apiFetch('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit review');
  }
};


// --- Bills ---
export const getBills = async (user: User): Promise<BillEntry[]> => {
    const response = await apiFetch('/api/bills', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch bills');
    return response.json();
};

// Note: This function is deprecated in favor of online/cash payments. Kept for reference.
export const payOutstandingBills = async (userId: string): Promise<void> => {
    const response = await apiFetch('/api/bills/pay', {
        method: 'POST',
        body: JSON.stringify({ userId }),
    });
    if (!response.ok) throw new Error('Payment failed');
};


// --- Payments (New) ---
export const createPaymentOrder = async (amount: number): Promise<any> => {
    const response = await apiFetch('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
    if (!response.ok) throw new Error('Failed to create payment order');
    return response.json();
};

export const verifyPayment = async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}, saleId?: number): Promise<{ status: string }> => {
    const response = await apiFetch('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify(saleId ? { ...paymentData, saleId } : paymentData),
    });
    if (!response.ok) throw new Error('Payment verification failed');
    return response.json();
};


// --- Admin specific ---
export const getWishlistLockStatusForAdmin = async (): Promise<{ isLocked: boolean }> => {
    const response = await apiFetch('/api/admin/settings/wishlist-lock', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch wishlist lock status');
    return response.json();
};

export const updateWishlistLockStatus = async (isLocked: boolean): Promise<{ isLocked: boolean }> => {
    const response = await apiFetch('/api/admin/settings/wishlist-lock', {
        method: 'PUT',
        body: JSON.stringify({ isLocked }),
    });
    if (!response.ok) throw new Error('Failed to update wishlist lock status');
    return response.json();
};

export const getAllVegetablesForAdmin = async (): Promise<Vegetable[]> => {
    const response = await apiFetch('/api/admin/vegetables/all', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch all vegetables for admin');
    return response.json();
};

export const addVegetable = async (vegData: VegetableAdminPayload): Promise<Vegetable> => {
    const response = await apiFetch('/api/vegetables', {
        method: 'POST',
        body: JSON.stringify(vegData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add vegetable');
    }
    return response.json();
};

export const updateVegetable = async (vegData: VegetableAdminPayload & { id: number }): Promise<Vegetable> => {
    const response = await apiFetch(`/api/vegetables/${vegData.id}`, {
        method: 'PUT',
        body: JSON.stringify(vegData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update vegetable');
    }
    return response.json();
};

export const deleteVegetable = async (vegId: number): Promise<void> => {
    const response = await apiFetch(`/api/vegetables/${vegId}`, {
        method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vegetable');
    }
};

export const getTodaysDeliveries = async (): Promise<{ confirmed: User[]; rejected: User[] }> => {
    const response = await apiFetch('/api/admin/deliveries/today', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch deliveries');
    return response.json();
};

export const getTodaysWishlist = async (): Promise<AggregatedWishlistItem[]> => {
    const response = await apiFetch('/api/admin/wishlist/today', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch wishlist summary');
    return response.json();
};

export const getTodaysWishlistByUser = async (): Promise<UserWishlist[]> => {
    const response = await apiFetch('/api/admin/wishlist/by-user', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch user wishlist summary');
    return response.json();
};

export const getUsers = async (): Promise<User[]> => {
    const response = await apiFetch('/api/admin/users', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
};

export const getSalesData = async (): Promise<Sale[]> => {
    const response = await apiFetch('/api/admin/sales', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch sales data');
    return response.json();
};

export const markSaleAsPaidCash = async (saleId: number): Promise<void> => {
    await apiFetch(`/api/admin/sales/${saleId}/mark-paid-cash`, {
        method: 'POST',
    });
};

export const getDrivers = async (): Promise<User[]> => {
    const response = await apiFetch('/api/admin/drivers', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch drivers');
    return response.json();
};

export const createDriver = async (driverData: Partial<User>): Promise<User> => {
    const response = await apiFetch('/api/admin/drivers', {
        method: 'POST',
        body: JSON.stringify(driverData),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create driver');
    }
    return response.json();
};

export const recordSale = async (userId: string, items: any[], total: number, isUrgent = false): Promise<Sale> => {
    const response = await apiFetch('/api/sales/record', {
        method: 'POST',
        body: JSON.stringify({ userId, items, total, isUrgent }),
    });
    if (!response.ok) throw new Error('Failed to record sale');
    return response.json();
};

export const getUrgentOrders = async (): Promise<Sale[]> => {
    const response = await apiFetch('/api/admin/orders/urgent/all', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to get urgent orders');
    return response.json();
};

// Promotions (Admin)
export const getPromotions = async (): Promise<Coupon[]> => {
    const response = await apiFetch('/api/admin/promotions', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch promotions');
    return response.json();
};

export const createPromotion = async (data: Partial<Coupon>): Promise<Coupon> => {
    const response = await apiFetch('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create promotion');
    }
    return response.json();
};

export const updatePromotion = async (id: number, data: Partial<Coupon>): Promise<Coupon> => {
    const response = await apiFetch(`/api/admin/promotions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update promotion');
    }
    return response.json();
};


// --- Driver specific ---
export const getDriverTodaysDeliveries = async (): Promise<{ confirmed: User[]; rejected: User[] }> => {
    const response = await apiFetch('/api/driver/deliveries/today', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch deliveries');
    return response.json();
};

export const getDriverTodaysWishlist = async (): Promise<AggregatedWishlistItem[]> => {
    const response = await apiFetch('/api/driver/wishlist/today', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch wishlist summary');
    return response.json();
};

export const getDriverTodaysWishlistByUser = async (): Promise<UserWishlist[]> => {
    const response = await apiFetch('/api/driver/wishlist/by-user', { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch user wishlist summary');
    return response.json();
};

export const getSalesForUser = async (phone: string): Promise<Sale[]> => {
    const response = await apiFetch(`/api/driver/users/${phone}/sales`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch sales for user');
    return response.json();
};

export const driverMarkSaleAsPaidCash = async (saleId: number): Promise<void> => {
    const response = await apiFetch(`/api/driver/sales/${saleId}/mark-paid-cash`, {
        method: 'POST',
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update payment status');
    }
};

export const getNearbyCustomers = async (lat: number, lon: number): Promise<User[]> => {
    const response = await apiFetch(`/api/driver/nearby-customers?lat=${lat}&lon=${lon}`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch nearby customers');
    return response.json();
};

// --- Location & Pricing ---
export const getDeliveryAreas = async (): Promise<DeliveryArea[]> => {
    const response = await fetch('/api/delivery-areas'); // Public, no auth needed
    if (!response.ok) throw new Error('Failed to fetch delivery areas');
    return response.json();
};

export const createDeliveryArea = async (data: { city: string, state: string }): Promise<DeliveryArea> => {
    const response = await apiFetch('/api/admin/delivery-areas', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create area');
    return response.json();
};

export const updateDeliveryArea = async (area: DeliveryArea): Promise<DeliveryArea> => {
    const response = await apiFetch(`/api/admin/delivery-areas/${area.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: area.isActive }),
    });
    if (!response.ok) throw new Error('Failed to update area');
    return response.json();
};

export const getLocationPrices = async (vegId: number): Promise<LocationPrice[]> => {
    const response = await apiFetch(`/api/vegetables/${vegId}/prices`, { method: 'GET' });
    if (!response.ok) throw new Error('Failed to fetch location prices');
    return response.json();
};

export const setLocationPrice = async (vegId: number, areaId: number, marketPrice: number, sabzimatePrice: number): Promise<LocationPrice> => {
    const response = await apiFetch(`/api/vegetables/${vegId}/prices`, {
        method: 'POST',
        body: JSON.stringify({ areaId, marketPrice, sabzimatePrice }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set price');
    }
    return response.json();
};