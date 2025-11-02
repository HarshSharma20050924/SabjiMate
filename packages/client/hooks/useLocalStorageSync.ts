import { useState, useEffect } from 'react';

// This hook forces a component to re-render when localStorage changes from another tab.
export const useLocalStorageSync = () => {
  const [update, setUpdate] = useState(0);

  useEffect(() => {
    const handleStorageChange = () => {
      console.log('LocalStorage changed in another tab, triggering UI update.');
      setUpdate(u => u + 1); // Increment to trigger re-render
    };

    // The native 'storage' event is fired by the browser when localStorage is modified
    // in another tab/window on the same origin. This is the correct way to sync state.
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return update;
};