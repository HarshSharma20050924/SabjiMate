export enum Language {
  EN = 'EN',
  HI = 'HI',
}

export enum ActiveTab {
  Home = 'Home',
  UrgentOrder = 'UrgentOrder',
  Recipe = 'Recipe',
  Bills = 'Bills',
  MyList = 'MyList',
  Profile = 'Profile',
  History = 'History',
}

export type PaymentPreference = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type PaymentStatus = 'UNPAID' | 'PAID_CASH' | 'PAID_ONLINE';

export interface User {
  name: string;
  phone: string; // Used as a unique ID
  address: string | null;
  image?: string | null; // For profile picture (Base64)
  // New location fields
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  role?: 'USER' | 'ADMIN' | 'DRIVER' | null;
  password?: string | null; // For admin creating drivers
  paymentPreference?: PaymentPreference | null;
}

export interface Vegetable {
  id: number;
  name: {
    [Language.EN]: string;
    [Language.HI]: string;
  };
  price: number; // This is the SabziMate price (the final selling price)
  marketPrice: number; // The higher market price for strikethrough display
  unit: {
    [Language.EN]: string;
    [Language.HI]: string;
  };
  image: string; // Can be a URL or a base64 string
  // New fields for enhanced pricing and management
  offerTag?: string | null;
  description?: string | null;
  category?: string;
  isAvailable: boolean;
  averageRating?: number | null;
  ratingCount?: number | null;
}

export interface BillEntry {
  id: number; // Sale ID from the database
  date: string;
  items: {
    id: number; // This is the SaleItem ID
    name: string;
    quantity: number | string;
    price: number;
    vegetableId: number;
    rating: number | null; // Explicitly null if not rated
  }[];
  total: number;
  paymentStatus: PaymentStatus;
}

export interface OrderItem {
  id: number;
  quantity: string; // e.g., '100g', '250g', '500g', '1kg'
}

// For Voice AI parsing
export interface ParsedOrderItem {
  vegetable: string;
  quantity: string;
}

export interface VoiceOrderPayload {
  transcription: string;
  items: ParsedOrderItem[];
}

// For Sales Tracking
export interface SaleItem {
  vegetableId: number;
  vegetableName: string;
  quantity: string;
  price: number; // Price at time of sale
}

export interface Sale {
  id: number;
  userId: string; // Corresponds to User['phone']
  date: string; // YYYY-MM-DD
  items: SaleItem[];
  total: number;
  paymentStatus: PaymentStatus;
  isUrgent?: boolean;
  couponCode?: string | null;
}

export interface UserWithBill extends User {
    totalBill: number;
}

// For daily wishlist
export interface WishlistItem {
    vegetableId: number;
    quantity: string;
}

// For standing "daily essentials" order
export interface StandingOrderItem {
    vegetableId: number;
    quantity: string;
}

export interface AggregatedWishlistItem {
    name: string;
    totalQuantity: number; // in kgs
    unit: string; // e.g. "kg", "pieces"
}

// New types for detailed, per-user wishlists
export interface UserWishlistItemDetail {
    vegetableName: string;
    quantity: string;
}

export interface UserWishlist {
    user: User;
    items: UserWishlistItemDetail[];
}


// New types for location features
export interface DeliveryArea {
    id: number;
    city: string;
    state: string;
    isActive: boolean;
}

export interface LocationPrice {
  id: number;
  marketPrice: number;
  sabzimatePrice: number;
  vegetableId: number;
  areaId: number;
}

// Payload type for Admin actions
export interface VegetableAdminPayload {
  name: { [Language.EN]: string; [Language.HI]: string };
  marketPrice: number;
  sabzimatePrice: number;
  unit: { [Language.EN]: string; [Language.HI]: string };
  image: string;
  offerTag?: string | null;
  description?: string | null;
  category?: string;
  isAvailable: boolean;
}

// New type for Recipe of the Day
export interface Recipe {
    recipeName: string;
    description: string;
    ingredients: string[];
    instructions: string[];
}

// New type for Promotions
export type Coupon = {
  id: number;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  isActive: boolean;
  expiresAt?: string | null;
  minOrderValue?: number | null;
  usageLimit?: number | null;
  usageCount: number;
};

// New type for Recipe Chatbot
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}