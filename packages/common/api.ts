

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
  AdminAnalyticsSummary,
  BatchReview,
  AppNotification,
  SupportTicket
} from './types';
import { getApiBaseUrl } from './utils';

let accessToken: string | null = null;
let refreshToken: string | null = null;
const baseUrl = getApiBaseUrl();

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
const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let response = await fetch(`${baseUrl}${url}`, { ...options, headers: getHeaders(!options.body || !(options.body instanceof FormData)) });

    if (response.status === 401) {
        console.log('Received 401, attempting to refresh token...');
        const storedRefreshToken = refreshToken || localStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
            window.dispatchEvent(forceLogoutEvent);
            throw new Error('Session expired. Please log in again.');
        }

        try {
            const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
            });

            if (!refreshResponse.ok) {
                throw new Error('Could not refresh token');
            }

            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
            setAuthTokens(newAccessToken, newRefreshToken);

            // Retry the original request with the new token
            const newOptions = { ...options, headers: getHeaders(!options.body || !(options.body instanceof FormData)) };
            response = await fetch(`${baseUrl}${url}`, newOptions);
        } catch (refreshError) {
            console.error('Token refresh failed.', refreshError);
            window.dispatchEvent(forceLogoutEvent);
            throw new Error('Session expired. Please log in again.');
        }
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
        throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }

    return response;
};

// --- API Function Implementations ---
// Client-facing APIs
export const getDeliveryAreas = async (): Promise<DeliveryArea[]> => apiFetch('/api/delivery-areas').then(res => res.json());
// Updated return type for sendOtp to allow handling debugOtp in demo mode
export const sendOtp = async (phone: string): Promise<{ message: string, debugOtp?: string }> => apiFetch('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }).then(res => res.json());
export const verifyOtp = async (phone: string, otp: string): Promise<{ accessToken: string, refreshToken: string, user: User }> => apiFetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }).then(res => res.json());
export const updateUser = async (user: User): Promise<User> => apiFetch('/api/users/me', { method: 'PUT', body: JSON.stringify(user) }).then(res => res.json());
export const reverseGeocode = async (lat: number, lon: number): Promise<{ address: string, city: string, state: string }> => apiFetch('/api/ai/reverse-geocode', { method: 'POST', body: JSON.stringify({ lat, lon }) }).then(res => res.json());
export const sendDeliveryConfirmation = async (choice: 'YES' | 'NO', user: User): Promise<void> => { await apiFetch('/api/deliveries/confirm', { method: 'POST', body: JSON.stringify({ choice, userId: user.phone }) }); };
export const processAudioOrder = async (audioBlob: Blob): Promise<ParsedOrderItem[]> => { const formData = new FormData(); formData.append('audio', audioBlob); return apiFetch('/api/ai/process-audio-order', { method: 'POST', body: formData }).then(res => res.json()); };
export const getBills = async (user: User): Promise<BillEntry[]> => apiFetch(`/api/bills?userId=${user.phone}`).then(res => res.json());
export const getTodaysVegetables = async (city?: string | null): Promise<Vegetable[]> => apiFetch(city ? `/api/vegetables?city=${city}` : '/api/vegetables').then(res => res.json());
export const placeUrgentOrder = async (items: any[], total: number, paymentMethod: string, couponCode?: string) => apiFetch('/api/orders/urgent', { method: 'POST', body: JSON.stringify({ items, total, paymentMethod, couponCode }) }).then(res => res.json());
export const verifyPayment = async (paymentData: any, saleId?: number): Promise<void> => { await apiFetch('/api/payments/verify', { method: 'POST', body: JSON.stringify({ ...paymentData, saleId }) }); };
export const validateCoupon = async (code: string): Promise<Coupon> => apiFetch(`/api/promotions/validate/${code}`).then(res => res.json());
export const createPaymentOrder = async (amount: number) => apiFetch('/api/payments/create-order', { method: 'POST', body: JSON.stringify({ amount }) }).then(res => res.json());
export const getStandingOrder = async (): Promise<StandingOrderItem[]> => apiFetch('/api/standing-order').then(res => res.json());
export const updateStandingOrder = async (items: StandingOrderItem[]): Promise<void> => { await apiFetch('/api/standing-order', { method: 'POST', body: JSON.stringify({ items }) }); };
export const getMyTodaysWishlist = async (): Promise<WishlistItem[]> => apiFetch('/api/wishlist').then(res => res.json());
export const submitWishlist = async (items: WishlistItem[]): Promise<void> => { await apiFetch('/api/wishlist', { method: 'POST', body: JSON.stringify({ items }) }); };
export const getPublicWishlistLockStatus = async (): Promise<{ isLocked: boolean }> => apiFetch('/api/settings/wishlist-lock').then(res => res.json());
export const submitReview = async (reviewData: { saleItemId: number, rating: number, comment?: string }): Promise<void> => { await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify(reviewData) }); };
export const sendChatMessage = async (history: ChatMessage[], message: string, systemInstruction: string) => apiFetch('/api/ai/chat', { method: 'POST', body: JSON.stringify({ history, message, systemInstruction }) }).then(res => res.json());
export const submitBatchReview = async (reviewData: { saleId: number, rating: number, comment?: string }): Promise<void> => { await apiFetch('/api/reviews/batch', { method: 'POST', body: JSON.stringify(reviewData) }); };

// --- Authentication & Shared APIs ---
export const loginUser = async (phone: string, password: string): Promise<any> => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }).then(res => res.json());
export const verify2FA = async (tempToken: string, token: string) => apiFetch('/api/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ tempToken, token }) }).then(res => res.json());
export const logoutUser = async (): Promise<void> => { await apiFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }) }); };

// --- Notification & Support APIs ---
export const getVapidPublicKey = async (): Promise<string> => apiFetch('/api/notifications/vapidPublicKey', { method: 'GET' }).then(res => res.text());
export const subscribeToPush = async (subscription: PushSubscription): Promise<void> => { await apiFetch('/api/notifications/subscribe', { method: 'POST', body: JSON.stringify(subscription) }); };
export const broadcastNotification = async (title: string, body: string): Promise<{ count: number, failed: number, total: number }> => apiFetch('/api/admin/notifications/broadcast', { method: 'POST', body: JSON.stringify({ title, body }) }).then(res => res.json());
export const getNotifications = async (): Promise<AppNotification[]> => apiFetch('/api/notifications').then(res => res.json());
export const markNotificationRead = async (id: number): Promise<void> => { await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' }); };
export const createSupportTicket = async (subject: string, message: string): Promise<SupportTicket> => apiFetch('/api/support', { method: 'POST', body: JSON.stringify({ subject, message }) }).then(res => res.json());
export const getSupportTickets = async (): Promise<SupportTicket[]> => apiFetch('/api/support').then(res => res.json());


// --- Admin APIs ---
export const getAdminAnalyticsSummary = async (startDate: string, endDate: string): Promise<AdminAnalyticsSummary> => apiFetch(`/api/admin/analytics/summary?startDate=${startDate}&endDate=${endDate}`).then(res => res.json());
export const getAllVegetablesForAdmin = async (): Promise<Vegetable[]> => apiFetch('/api/admin/vegetables/all').then(res => res.json());
export const addVegetable = async (payload: VegetableAdminPayload): Promise<Vegetable> => apiFetch('/api/vegetables', { method: 'POST', body: JSON.stringify(payload) }).then(res => res.json());
export const updateVegetable = async (payload: { id: number } & VegetableAdminPayload): Promise<Vegetable> => apiFetch(`/api/vegetables/${payload.id}`, { method: 'PUT', body: JSON.stringify(payload) }).then(res => res.json());
export const deleteVegetable = async (vegId: number): Promise<void> => { await apiFetch(`/api/vegetables/${vegId}`, { method: 'DELETE' }); };
export const getTodaysDeliveries = async (): Promise<{ confirmed: User[]; rejected: User[] }> => apiFetch('/api/deliveries/today').then(res => res.json());
export const getTodaysWishlist = async (): Promise<AggregatedWishlistItem[]> => apiFetch('/api/admin/wishlist/today').then(res => res.json());
export const getTodaysWishlistByUser = async (): Promise<UserWishlist[]> => apiFetch('/api/admin/wishlist/by-user').then(res => res.json());
export const getUsers = async (): Promise<User[]> => apiFetch('/api/admin/users').then(res => res.json());
export const getSalesData = async (): Promise<Sale[]> => apiFetch('/api/admin/sales').then(res => res.json());
export const markSaleAsPaidCash = async (saleId: number): Promise<void> => { await apiFetch(`/api/admin/sales/${saleId}/mark-paid-cash`, { method: 'POST' }); };
export const getDrivers = async (): Promise<User[]> => apiFetch('/api/admin/drivers').then(res => res.json());
export const createDriver = async (driverData: any): Promise<User> => apiFetch('/api/admin/drivers', { method: 'POST', body: JSON.stringify(driverData) }).then(res => res.json());
export const getUrgentOrders = async (): Promise<Sale[]> => apiFetch('/api/admin/orders/urgent/all').then(res => res.json());
export const createDeliveryArea = async (area: { city: string, state: string }): Promise<DeliveryArea> => apiFetch('/api/admin/delivery-areas', { method: 'POST', body: JSON.stringify(area) }).then(res => res.json());
export const updateDeliveryArea = async (area: DeliveryArea): Promise<DeliveryArea> => apiFetch(`/api/admin/delivery-areas/${area.id}`, { method: 'PUT', body: JSON.stringify({ isActive: area.isActive }) }).then(res => res.json());
export const getLocationPrices = async (vegId: number): Promise<LocationPrice[]> => apiFetch(`/api/vegetables/${vegId}/prices`).then(res => res.json());
export const setLocationPrice = async (vegId: number, areaId: number, marketPrice: number, sabzimatePrice: number): Promise<LocationPrice> => apiFetch(`/api/vegetables/${vegId}/prices`, { method: 'POST', body: JSON.stringify({ areaId, marketPrice, sabzimatePrice }) }).then(res => res.json());
export const getPromotions = async (): Promise<Coupon[]> => apiFetch('/api/admin/promotions').then(res => res.json());
export const createPromotion = async (promoData: Partial<Coupon>): Promise<Coupon> => apiFetch('/api/admin/promotions', { method: 'POST', body: JSON.stringify(promoData) }).then(res => res.json());
export const updatePromotion = async (promoId: number, data: { isActive: boolean }): Promise<Coupon> => apiFetch(`/api/admin/promotions/${promoId}`, { method: 'PUT', body: JSON.stringify(data) }).then(res => res.json());
export const getWishlistLockStatusForAdmin = async (): Promise<{ isLocked: boolean }> => apiFetch('/api/admin/settings/wishlist-lock').then(res => res.json());
export const updateWishlistLockStatus = async (isLocked: boolean): Promise<{ isLocked: boolean }> => apiFetch('/api/admin/settings/wishlist-lock', { method: 'PUT', body: JSON.stringify({ isLocked }) }).then(res => res.json());
export const generate2FASecret = async (): Promise<{ qrCodeUrl: string }> => apiFetch('/api/auth/2fa/setup', { method: 'POST' }).then(res => res.json());
export const enable2FA = async (token: string): Promise<void> => { await apiFetch('/api/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ token }) }); };
export const disable2FA = async (): Promise<void> => { await apiFetch('/api/auth/2fa/disable', { method: 'POST' }); };
export const getBatchReviews = async (): Promise<BatchReview[]> => apiFetch('/api/admin/reviews/batch').then(res => res.json());


// --- Driver APIs ---
export const getDriverTodaysDeliveries = async (): Promise<{ confirmed: User[]; rejected: User[] }> => apiFetch('/api/deliveries/today').then(res => res.json());
export const getDriverTodaysWishlist = async (): Promise<AggregatedWishlistItem[]> => apiFetch('/api/driver/wishlist/today').then(res => res.json());
export const getDriverTodaysWishlistByUser = async (): Promise<UserWishlist[]> => apiFetch('/api/driver/wishlist/by-user').then(res => res.json());
export const getSalesForUser = async (phone: string): Promise<Sale[]> => apiFetch(`/api/driver/users/${phone}/sales`).then(res => res.json());
export const driverMarkSaleAsPaidCash = async (saleId: number): Promise<void> => { await apiFetch(`/api/driver/sales/${saleId}/mark-paid-cash`, { method: 'POST' }); };
export const recordSale = async (userId: string, items: any[], total: number, isUrgent = false): Promise<Sale> => apiFetch('/api/sales/record', { method: 'POST', body: JSON.stringify({ userId, items, total, isUrgent }) }).then(res => res.json());
export const requestCustomerAccess = async (customerId: string): Promise<void> => { await apiFetch('/api/driver/request-customer-access', { method: 'POST', body: JSON.stringify({ customerId }) }); };
export const verifyCustomerAccess = async (customerId: string, otp: string): Promise<{ success: boolean }> => apiFetch('/api/driver/verify-customer-access', { method: 'POST', body: JSON.stringify({ customerId, otp }) }).then(res => res.json());