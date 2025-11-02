import React, { useContext, useState } from 'react';
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
const ContactIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PolicyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const EssentialsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const InstallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;


interface SettingsScreenProps {
  language: Language;
  setLanguage: (language: Language) => void;
  onClose: () => void;
  onNavigateToProfile: () => void;
  onNavigateToStandingOrder: () => void;
  onNavigateToHistory: () => void;
  isInstallable: boolean;
  onInstallApp: () => void;
}

const SettingsItem: React.FC<{icon: React.ReactNode, label: string, onClick?: () => void, children?: React.ReactNode}> = ({ icon, label, onClick, children }) => (
    <div 
      className={`flex items-center justify-between p-4 bg-white ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={onClick}
    >
        <div className="flex items-center space-x-4">
            <span className="text-green-600">{icon}</span>
            <span className="font-semibold text-gray-800 text-base">{label}</span>
        </div>
        <div>
            {children ? children : onClick && <ChevronRightIcon />}
        </div>
    </div>
);

const SettingsScreen: React.FC<SettingsScreenProps> = ({ language, setLanguage, onClose, onNavigateToProfile, onNavigateToStandingOrder, onNavigateToHistory, isInstallable, onInstallApp }) => {
    const t = translations[language];
    const auth = useContext(AuthContext);
    const [user, setUser] = useState<User>(auth.user!);
    const [isSaving, setIsSaving] = useState(false);

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
        <div className="absolute inset-0 bg-gray-100 z-50 animate-slide-in-right-fast flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-800">{t.settings}</h2>
                <button onClick={onClose} className="text-lg text-green-600 hover:text-green-800 font-semibold">{t.close}</button>
            </header>
            
            <main className="flex-grow overflow-y-auto p-4 space-y-6">
                {isInstallable && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <button 
                            onClick={onInstallApp}
                            className="w-full text-center p-4 text-green-700 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-3"
                        >
                            <InstallIcon /> <span>Install App to Home Screen</span>
                        </button>
                    </div>
                )}
                
                {/* Account Section */}
                <div>
                    <h3 className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{t.account}</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-200">
                            <SettingsItem icon={<ProfileIcon />} label={t.editProfile} onClick={onNavigateToProfile} />
                            <SettingsItem icon={<HistoryIcon />} label={t.orderHistory} onClick={onNavigateToHistory} />
                            <SettingsItem icon={<PaymentIcon />} label={t.paymentPreference}>
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
                        </div>
                    </div>
                </div>
                
                {/* Preferences Section */}
                <div>
                    <h3 className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{t.preferences}</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                       <div className="divide-y divide-gray-200">
                            <SettingsItem icon={<EssentialsIcon />} label={t.myDailyEssentials} onClick={onNavigateToStandingOrder} />
                            <SettingsItem icon={<LanguageIcon />} label={t.language}>
                                <div className="flex items-center space-x-1 bg-gray-200 rounded-full p-1 text-sm">
                                    <button onClick={() => setLanguage(Language.EN)} className={`px-3 py-1 rounded-full font-semibold transition-colors ${language === Language.EN ? 'bg-white shadow' : 'text-gray-600'}`}>
                                        {t.english}
                                    </button>
                                    <button onClick={() => setLanguage(Language.HI)} className={`px-3 py-1 rounded-full font-semibold transition-colors ${language === Language.HI ? 'bg-white shadow' : 'text-gray-600'}`}>
                                        {t.hindi}
                                    </button>
                                </div>
                            </SettingsItem>
                        </div>
                    </div>
                </div>

                 {/* Help & Support Section */}
                <div>
                    <h3 className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{t.helpSupport}</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-200">
                            <SettingsItem icon={<HelpIcon />} label={t.helpCenter} onClick={() => alert('Coming soon!')} />
                            <SettingsItem icon={<ContactIcon />} label={t.contactUs} onClick={() => alert('Contact us at support@sabzimate.com')} />
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div>
                     <h3 className="px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{t.about}</h3>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-200">
                            <SettingsItem icon={<PolicyIcon />} label={t.privacyPolicy} onClick={() => alert('Coming soon!')} />
                            <SettingsItem icon={<InfoIcon />} label={t.termsOfService} onClick={() => alert('Coming soon!')} />
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                 <div className="pt-4">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <button 
                            onClick={auth.logout}
                            className="w-full text-center p-4 text-red-600 font-semibold hover:bg-gray-50 transition-colors"
                        >
                            {t.logout}
                        </button>
                    </div>
                </div>
                
                 {/* App Version */}
                <div className="text-center text-xs text-gray-400 pt-4 pb-8">
                    <p>{t.appName} - {t.appVersion} 1.0.0</p>
                </div>
            </main>
        </div>
    );
};

export default SettingsScreen;