import React, { useState, useEffect, useCallback, createContext, ReactNode, useMemo } from 'react';
import { User } from './types';
import * as api from './api';
import { jwtDecode } from 'jwt-decode';

// FIX: Export AuthContextType so it can be used in other components.
export interface AuthContextType {
  user: User | null;
  token: string | null; // This will now be the accessToken
  isInitialLoading: boolean;
  isLoading: boolean;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserSession: (user: User) => void; // For updating user in context after onboarding/profile edit
  handleGoogleLogin: (token: string, user: User) => void; // This needs to be adapted
}

export const AuthContext = createContext<AuthContextType>(null!);

interface DecodedToken {
  userId: string; // Standard JWT claim for subject, used as user ID (phone)
  role: 'ADMIN' | 'USER' | 'DRIVER';
  // FIX: Add exp property to DecodedToken type to satisfy usage in this block
  exp: number; // Standard JWT claim for expiration time
}

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const logout = useCallback(async (isSilent = false) => {
    if (!isSilent) {
        try {
            await api.logoutUser();
        } catch (error) {
            console.error("Logout API call failed, proceeding with client-side logout.", error);
        }
    }
    api.setAuthTokens(null, null);
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
    if (!isSilent) {
        window.location.href = '/'; // Full page reload to clear all state
    }
  }, []);
  
  // This effect runs once on initial app load to rehydrate the session.
  useEffect(() => {
    const bootstrapSession = async () => {
        setIsInitialLoading(true);
        try {
            const storedAccessToken = localStorage.getItem('accessToken');
            const storedRefreshToken = localStorage.getItem('refreshToken');
            const storedUser = localStorage.getItem('authUser');

            if (storedAccessToken && storedRefreshToken && storedUser) {
                const decoded: DecodedToken = jwtDecode(storedAccessToken);
                if (decoded.exp * 1000 > Date.now()) {
                    console.log('Found valid access token. Restoring session.');
                    api.setAuthTokens(storedAccessToken, storedRefreshToken);
                    setToken(storedAccessToken);
                    setUser(JSON.parse(storedUser));
                } else {
                    console.log('Access token expired. Attempting refresh...');
                    const refreshResponse = await fetch('/api/auth/refresh', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: storedRefreshToken }),
                    });
                    if (!refreshResponse.ok) throw new Error('Refresh failed');
                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
                    api.setAuthTokens(newAccessToken, newRefreshToken);
                    setToken(newAccessToken);
                    setUser(JSON.parse(storedUser));
                    console.log('Session restored via refresh token.');
                }
            } else {
                console.log('No tokens found in storage.');
            }
        } catch (e) {
            console.error("Error during bootstrap, clearing session.", e);
            logout(true); // Silently log out without reload
        } finally {
            setIsInitialLoading(false);
        }
    };
    bootstrapSession();

    // Listen for forced logouts from the API client
    const handleForceLogout = () => logout();
    window.addEventListener('force-logout', handleForceLogout);
    return () => {
        window.removeEventListener('force-logout', handleForceLogout);
    };

  }, [logout]);


  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    setIsLoading(true);
    try {
        const { accessToken, refreshToken, user: userObject } = await api.verifyOtp(phone, otp);
        api.setAuthTokens(accessToken, refreshToken);
        localStorage.setItem('authUser', JSON.stringify(userObject));
        setToken(accessToken);
        setUser(userObject);
    } catch (error) {
        logout(true);
        throw error;
    } finally {
        setIsLoading(false);
    }
  }, [logout]);

  const loginWithPassword = useCallback(async (phone: string, password: string) => {
    setIsLoading(true);
    try {
        const { accessToken, refreshToken, user: userObject } = await api.loginUser(phone, password);
        const decoded: DecodedToken = jwtDecode(accessToken);

        if (decoded.role !== 'ADMIN' && decoded.role !== 'DRIVER') {
            throw new Error("Access denied: You do not have sufficient privileges.");
        }
        
        api.setAuthTokens(accessToken, refreshToken);
        localStorage.setItem('authUser', JSON.stringify(userObject));
        setToken(accessToken);
        setUser(userObject);
        
    } catch (error) {
        logout(true);
        throw error;
    } finally {
        setIsLoading(false);
    }
  }, [logout]);
  
  const handleGoogleLogin = useCallback((token: string, user: User) => {
    const decoded: DecodedToken = jwtDecode(token);
    const userObject: User = { ...user, role: decoded.role };

    api.setAuthTokens(token, token);
    localStorage.setItem('authUser', JSON.stringify(userObject));
    setToken(token);
    setUser(userObject);
    console.log('Google login successful, session established.');
  }, []);
  
  const updateUserSession = useCallback((updatedUser: User) => {
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('authUser', JSON.stringify(updatedUser));
      }
  }, []);
  
  const value: AuthContextType = useMemo(() => ({
    user,
    token,
    isInitialLoading,
    isLoading,
    loginWithOtp,
    loginWithPassword,
    logout,
    updateUserSession,
    handleGoogleLogin,
  }), [user, token, isInitialLoading, isLoading, loginWithOtp, loginWithPassword, logout, updateUserSession, handleGoogleLogin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};