import React, { useContext, useState, useEffect } from 'react';
import { Language, User, PaymentPreference } from '../../../common/types';
import { translations } from '../../../common/constants';
import { AuthContext } from '../../../common/AuthContext';
import * as api from '../../../common/api';

// Icons for the settings list
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PaymentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const LanguageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m4 13l4-4M19 5h-2a2 2 0 00-2 2v1a2 2 0 002 2h2a2 2 0 002-2v-1a2 2 0 00-2-2zM3 17l4-4m-4 4h4" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const EssentialsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const WalletIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>;
const SubscriptionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2H10zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2H10z" clipRule="evenodd" /></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;

interface SettingsScreenProps {
  language: Language;
  setLanguage: (language: Language) => void;
  onClose: () => void;
  onNavigateToProfile: () => void;
  onNavigateToStandingOrder: () => void;
  onNavigateToHistory: () => void;
  onNavigateToSupport: () => void;
  isInstallable: boolean;
  onInstallApp: () => void;
}

const SettingsItem: React.FC<{icon: React.ReactNode, label: string, onClick?: () => void, children?: React.ReactNode, disabled?: boolean}> = ({ icon, label, onClick, children, disabled }) => (
    <div 
      className={`flex items-center justify-between p-4 bg-white ${onClick && !disabled ? 'cursor-pointer hover:bg-gray-50' : ''} ${disabled ? 'opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
        <div className="flex items-center space-x-4">
            <span className="text-green-600">{icon}</span>
            <span className="font-semibold text-gray-800 text-base">{label}</span>
        </div>
        <div>
            {children ? children : (onClick && <ChevronRightIcon />)}
        </div>
    </div>
);


const SettingsScreen: React.FC<SettingsScreenProps> = ({ language, setLanguage, onClose, onNavigateToProfile, onNavigateToStandingOrder, onNavigateToHistory, onNavigateToSupport, isInstallable, onInstallApp }) => {
    const t = translations[language];
    const auth = useContext(AuthContext);
    const [user, setUser] = useState<User>(auth.user!);
    const [isSaving, setIsSaving] = useState(false);
    
    const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(Notification.permission);
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        // Function to update status if it changes in browser settings
        const checkNotificationStatus = () => setNotificationStatus(Notification.permission);
        // Check on focus in case user changes permissions in another tab
        window.addEventListener('focus', checkNotificationStatus);
        return () => window.removeEventListener('focus', checkNotificationStatus);
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const handleNotificationRequest = async () => {
        if (isSubscribing || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Push Notifications are not supported by your browser.');
            return;
        }
        if (notificationStatus === 'denied') {
            alert('You have blocked notifications. Please enable them in your browser settings to receive updates.');
            return;
        }
        
        // We allow re-subscribing even if status is 'granted' to fix desync issues.

        setIsSubscribing(true);
        try {
            // Request permission (resolves immediately if already granted)
            const permission = await Notification.requestPermission();
            setNotificationStatus(permission);

            if (permission === 'granted') {
                const swRegistration = await navigator.serviceWorker.ready;
                const vapidPublicKey = await api.getVapidPublicKey();
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                
                // Attempt to subscribe (browser might return existing subscription)
                let subscription = await swRegistration.pushManager.getSubscription();
                
                if (!subscription) {
                    subscription = await swRegistration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey
                    });
                }
                
                // Send subscription to server (sync)
                await api.subscribeToPush(subscription);
                alert('Notifications synced successfully! You should receive updates now.');
            }
        } catch (error) {
            console.error('Failed to subscribe/sync push notifications:', error);
            alert('Could not sync notifications. Please try again later.');
        } finally {
            setIsSubscribing(false);
        }
    };

    const getNotificationButton = () => {
        if (!('PushManager' in window)) {
             return <span className="text-sm font-semibold text-gray-400">Not Supported</span>
        }
        if (isSubscribing) {
            return <span className="text-sm font-semibold text-gray-500">Syncing...</span>
        }

        switch (notificationStatus) {
            case 'granted':
                return (
                    <button 
                        onClick={handleNotificationRequest} 
                        className="text-sm font-semibold text-green-600 hover:text-green-800 hover:underline focus:outline-none"
                        title="Click to re-sync if notifications aren't working"
                    >
                        Enabled (Tap to Sync)
                    </button>
                );
            case 'denied':
                return <span className="text-sm font-semibold text-red-600">Blocked</span>
            default:
                return (
                    <button 
                        onClick={handleNotificationRequest}
                        className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-500 text-white hover:bg-blue-600"
                    >
                        Enable
                    </button>
                )
        }
    };

    const handlePreferenceChange = async (preference: PaymentPreference) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const updatedData = { ...user, paymentPreference: preference };
            const updatedUser = await api.updateUser(updatedData);
            auth.updateUserSession(updatedUser);
            setUser(updatedUser);
        } catch (error) {
            console.error("Failed to update payment preference", error);
            alert("Could not save your preference.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 animate-slide-in-right-fast">
            <header className="flex items-center p-4 border-b bg-white flex-shrink-0 sticky top-0 z-10">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-bold text-gray-800 mx-auto">My Account</h2>
                <div className="w-6"></div>
            </header>
            
            <main className="flex-grow overflow-y-auto p-4 space-y-6">
                {isInstallable && (
                    <div className="mb-4">
                        <button 
                            onClick={onInstallApp}
                            className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between transform transition-all active:scale-95 hover:shadow-xl"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <DownloadIcon /> 
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-lg">Install App</p>
                                    <p className="text-xs text-green-100">Get the best experience</p>
                                </div>
                            </div>
                            <ChevronRightIcon />
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-sm p-4 flex items-center space-x-4">
                    {user.image ? (
                        <img src={user.image} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-slate-200" />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-slate-200 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{user.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center">
                            {user.phone}
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">✓ Verified</span>
                        </p>
                    </div>
                </div>

                <div>
                    <h3 className="px-4 pb-2 text-sm font-bold text-gray-500 uppercase tracking-wider">My Plan & Payments</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200">
                        <SettingsItem icon={<SubscriptionIcon />} label="My Subscription Plan">
                            <div className="flex items-center space-x-1 bg-gray-200 rounded-full p-1 text-sm">
                                {(['DAILY', 'WEEKLY', 'MONTHLY'] as PaymentPreference[]).map(pref => (
                                    <button
                                        key={pref}
                                        onClick={() => handlePreferenceChange(pref)}
                                        className={`px-3 py-1 rounded-full font-semibold transition-colors ${user.paymentPreference === pref ? 'bg-white shadow' : 'text-gray-600'}`}
                                    >
                                        {t[pref.toLowerCase() as keyof typeof t]}
                                    </button>
                                ))}
                            </div>
                        </SettingsItem>
                        <SettingsItem icon={<WalletIcon />} label="My Payment Methods">
                             <span className="text-sm text-gray-400 font-semibold">Coming Soon</span>
                        </SettingsItem>
                    </div>
                </div>

                 <div>
                    <h3 className="px-4 pb-2 text-sm font-bold text-gray-500 uppercase tracking-wider">My Activity</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200">
                        <SettingsItem icon={<HistoryIcon />} label={t.orderHistory} onClick={onNavigateToHistory} />
                        <SettingsItem icon={<EssentialsIcon />} label={t.myDailyEssentials} onClick={onNavigateToStandingOrder} />
                    </div>
                </div>
                
                <div>
                    <h3 className="px-4 pb-2 text-sm font-bold text-gray-500 uppercase tracking-wider">Settings & Help</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200">
                        <SettingsItem icon={<ProfileIcon />} label="Edit My Profile" onClick={onNavigateToProfile} />
                        <SettingsItem icon={<LanguageIcon />} label={t.language}>
                            <div className="flex items-center space-x-1 bg-gray-200 rounded-full p-1 text-sm">
                                <button onClick={() => setLanguage(Language.EN)} className={`px-3 py-1 rounded-full font-semibold transition-colors ${language === Language.EN ? 'bg-white shadow' : 'text-gray-600'}`}>{t.english}</button>
                                <button onClick={() => setLanguage(Language.HI)} className={`px-3 py-1 rounded-full font-semibold transition-colors ${language === Language.HI ? 'bg-white shadow' : 'text-gray-600'}`}>{t.hindi}</button>
                            </div>
                        </SettingsItem>
                         <SettingsItem icon={<BellIcon />} label="Push Notifications">
                            {getNotificationButton()}
                        </SettingsItem>
                         <SettingsItem icon={<HelpIcon />} label={t.helpSupport} onClick={onNavigateToSupport} />
                    </div>
                </div>

                 <div className="pt-4">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <button onClick={auth.logout} className="w-full text-center p-4 text-red-600 font-semibold hover:bg-red-50 transition-colors">{t.logout}</button>
                    </div>
                </div>
                
                <div className="text-center text-xs text-gray-400 pt-4 pb-8">
                    <p>{t.appName} - {t.appVersion} 1.1.0</p>
                </div>
            </main>
        </div>
    );
};

export default SettingsScreen;