import { create } from 'zustand';
import * as api from '@common/api';
import { Vegetable, OrderItem, Recipe, Language, WishlistItem } from '@common/types';
import { translations } from '@common/constants';

export interface AppState {
  // State
  vegetables: Vegetable[];
  isLoadingVeggies: boolean;
  vegetablesError: string | null;
  wishlist: OrderItem[];
  isInitialWishlistLoading: boolean;
  initialListError: string | null;
  isWishlistConfirmed: boolean;
  isTruckLive: boolean;
  isWishlistLocked: boolean;
  bucketAnimationTrigger: number;

  // Actions
  fetchVeggies: (city: string | null | undefined, language: Language) => Promise<void>;
  fetchInitialList: () => Promise<string | null>;
  updateQuantity: (vegId: number, newQuantity: string, language: Language) => string | null;
  removeItemFromWishlist: (vegId: number) => Promise<void>;
  confirmWishlist: () => Promise<void>;
  setTruckLive: (isLive: boolean) => void;
  handleReorder: (items: OrderItem[], language: Language) => string;
  clearWishlist: () => Promise<void>;
  triggerBucketAnimation: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  vegetables: [],
  isLoadingVeggies: true,
  vegetablesError: null,
  wishlist: [],
  isInitialWishlistLoading: true,
  initialListError: null,
  isWishlistConfirmed: false,
  isTruckLive: false,
  isWishlistLocked: false,
  bucketAnimationTrigger: 0,

  // Actions
  triggerBucketAnimation: () => set(state => ({ bucketAnimationTrigger: state.bucketAnimationTrigger + 1 })),

  fetchVeggies: async (city, language) => {
    set({ isLoadingVeggies: true, vegetablesError: null });
    try {
      const veggiesData = await api.getTodaysVegetables(city);
      set({ vegetables: veggiesData });
    } catch (error) {
      console.error("Failed to fetch vegetables:", error);
      const errorMessage = "Could not load vegetables. Please check your connection and try again.";
      set({ vegetablesError: errorMessage });
    } finally {
      set({ isLoadingVeggies: false });
    }
  },
  
  fetchInitialList: async () => {
    set({ isInitialWishlistLoading: true, initialListError: null });
    try {
        const [lockStatus, userWishlist, standingOrder] = await Promise.all([
            api.getPublicWishlistLockStatus(),
            api.getMyTodaysWishlist(),
            api.getStandingOrder(),
        ]);
        
        const isLocked = lockStatus.isLocked;
        set({ isWishlistLocked: isLocked });

        let message: string | null = null;
        let initialList: OrderItem[] = [];
        if (userWishlist && userWishlist.length > 0) {
            initialList = userWishlist.map(item => ({ id: item.vegetableId, quantity: item.quantity }));
        } else if (standingOrder && standingOrder.length > 0 && !isLocked) {
            initialList = standingOrder.map(item => ({ id: item.vegetableId, quantity: item.quantity }));
            message = "Your Daily Essentials have been added to your list.";
        }
        set({ wishlist: initialList, isWishlistConfirmed: initialList.length > 0 });
        return message;
    } catch (error) {
        console.error("Failed to fetch user's initial list data:", error);
        set({ initialListError: "Could not load your list." });
        return null;
    } finally {
        set({ isInitialWishlistLoading: false });
    }
  },

  updateQuantity: (vegId, newQuantity, language) => {
    if (get().isWishlistLocked) {
        alert("Today's list is locked and cannot be modified.");
        return null;
    }
    
    set(state => {
        const existingItemIndex = state.wishlist.findIndex(item => item.id === vegId);
        let newWishlist = [...state.wishlist];

        if (existingItemIndex > -1) {
            if (!newQuantity) {
                newWishlist = state.wishlist.filter(item => item.id !== vegId);
            } else {
                newWishlist[existingItemIndex] = { ...newWishlist[existingItemIndex], quantity: newQuantity };
            }
        } else if (newQuantity) {
            newWishlist = [...state.wishlist, { id: vegId, quantity: newQuantity }];
        }
        
        return { wishlist: newWishlist, isWishlistConfirmed: false };
    });
    return null; // Toast message is now handled locally in the card
  },
  
  removeItemFromWishlist: async (vegId) => {
      if (get().isWishlistLocked) {
        alert("Today's list is locked and cannot be modified.");
        return;
      }
      const currentWishlist = get().wishlist;
      const newWishlist = currentWishlist.filter(item => item.id !== vegId);
      
      set({ wishlist: newWishlist, isWishlistConfirmed: false });

      const wishlistItemPayload: WishlistItem[] = newWishlist.map(item => ({
          vegetableId: item.id,
          quantity: item.quantity,
      }));

      try {
          await api.submitWishlist(wishlistItemPayload);
      } catch (err) {
          console.error("Failed to sync removed item with server.", err);
          set({ wishlist: currentWishlist }); 
          alert("Could not remove item. Please check your connection and try again.");
      }
  },
  
  confirmWishlist: async () => {
      if (get().isWishlistLocked) {
        alert("Today's list is locked and cannot be modified.");
        throw new Error("Wishlist is locked.");
      }
      const wishlistItems: WishlistItem[] = get().wishlist.map(item => ({
          vegetableId: item.id,
          quantity: item.quantity,
      }));
      try {
          await api.submitWishlist(wishlistItems);
          set({ isWishlistConfirmed: true });
      } catch(err) {
          console.error("Failed to submit wishlist", err);
          throw new Error("Could not save your wishlist. Please try again.");
      }
  },

  setTruckLive: (isLive) => set({ isTruckLive: isLive }),
  
  handleReorder: (itemsToReorder, language) => {
      if (get().isWishlistLocked) {
        return "Today's list is locked. Re-ordered items can be confirmed for tomorrow.";
      }
      const t = translations[language];
      set(state => {
          const newWishlist = [...state.wishlist];
          itemsToReorder.forEach(newItem => {
              const existingIndex = newWishlist.findIndex(item => item.id === newItem.id);
              if (existingIndex > -1) {
                  newWishlist[existingIndex] = newItem;
              } else {
                  newWishlist.push(newItem);
              }
          });
          return { wishlist: newWishlist, isWishlistConfirmed: false };
      });
      return `Added ${itemsToReorder.length} available ${itemsToReorder.length > 1 ? t.items : t.item} to your list!`;
  },

  clearWishlist: async () => {
    if (get().isWishlistLocked) {
        alert("Today's list is locked and cannot be modified.");
        return;
    }
    const currentWishlist = get().wishlist;
    set({ wishlist: [], isWishlistConfirmed: false });
    try {
        await api.submitWishlist([]);
    } catch (err) {
        console.error("Failed to clear wishlist on server", err);
        set({ wishlist: currentWishlist });
        alert("Could not clear your list. Please check your connection and try again.");
    }
  },
}));