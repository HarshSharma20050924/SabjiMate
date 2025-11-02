import React, { useState, useContext } from 'react';
import { AuthContext } from '@common/AuthContext';
import ManageVegetables from '@admin/components/ManageVegetables';
import TodaysDeliveries from '@admin/components/TodaysDeliveries';
import UserSales from '@admin/components/UserSales';
import LiveTrackingView from '@admin/components/LiveTrackingView';
import ManageDrivers from '@admin/components/ManageDrivers';
import UrgentOrdersQueue from '@admin/components/UrgentOrdersQueue';
import ManageAreasAndPricing from '@admin/components/ManageAreasAndPricing';
import ManagePromotions from '@admin/components/ManagePromotions';
import WishlistLockControl from '@admin/components/WishlistLockControl';
import AnalyticsDashboard from './AnalyticsDashboard'; // New Analytics Dashboard

type AdminScreen = 'dashboard' | 'vegetables' | 'deliveries' | 'sales' | 'tracking' | 'drivers' | 'urgent' | 'areas' | 'promotions' | 'lock';

// --- ICONS ---
const Icons: Record<AdminScreen, React.ReactNode> = {
    dashboard: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    vegetables: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    areas: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    promotions: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h3m0-5H5a2 2 0 00-2 2v3a2 2 0 002 2h3m0-5l2.293-2.293c.63-.63 1.707-.63 2.337 0l2.337 2.337c.63.63.63 1.707 0 2.337L15 17m-5-5l2-2m2 2l-2 2m-7-7h15" /></svg>,
    deliveries: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" /></svg>,
    sales: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    urgent: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    tracking: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    drivers: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    lock: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
};

const screens: { id: AdminScreen; title: string; }[] = [
    { id: 'dashboard', title: 'Dashboard' },
    { id: 'vegetables', title: 'Vegetables' },
    { id: 'areas', title: 'Areas & Pricing' },
    { id: 'promotions', title: 'Promotions' },
    { id: 'deliveries', title: 'Deliveries' },
    { id: 'sales', title: 'Users & Sales' },
    { id: 'urgent', title: 'Urgent Orders' },
    { id: 'tracking', title: 'Live Track' },
    { id: 'drivers', title: 'Drivers' },
    { id: 'lock', title: 'Wishlist Control' },
];

const Sidebar: React.FC<{ activeScreen: AdminScreen; onNavigate: (screen: AdminScreen) => void; onLogout: () => void; }> = ({ activeScreen, onNavigate, onLogout }) => (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
            <h1 className="text-2xl font-bold">
                <span className="text-green-400">सब्ज़ी</span>
                <span className="text-red-500">MATE</span>
                <span className="block text-gray-400 font-normal text-sm">Admin Panel</span>
            </h1>
        </div>
        <nav className="flex-grow p-2">
            {screens.map(screen => (
                <button
                    key={screen.id}
                    onClick={() => onNavigate(screen.id)}
                    className={`flex items-center w-full px-4 py-2.5 rounded-lg transition-colors duration-200 ${
                        activeScreen === screen.id
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    {Icons[screen.id]}
                    <span className="ml-3 font-medium">{screen.title}</span>
                </button>
            ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
            <button 
                onClick={onLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
                Logout
            </button>
        </div>
    </div>
);


const AdminDashboard: React.FC = () => {
    const { logout } = useContext(AuthContext);
    const [activeScreen, setActiveScreen] = useState<AdminScreen>('dashboard');

    const renderScreen = () => {
        switch (activeScreen) {
            case 'dashboard': return <AnalyticsDashboard />;
            case 'vegetables': return <ManageVegetables />;
            case 'areas': return <ManageAreasAndPricing />;
            case 'promotions': return <ManagePromotions />;
            case 'deliveries': return <TodaysDeliveries />;
            case 'sales': return <UserSales />;
            case 'urgent': return <UrgentOrdersQueue />;
            case 'tracking': return <LiveTrackingView />;
            case 'drivers': return <ManageDrivers />;
            case 'lock': return <WishlistLockControl />;
            default: return <AnalyticsDashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} onLogout={logout} />
            <main className="flex-1 overflow-y-auto">
                 <div className="p-6">
                    {renderScreen()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
