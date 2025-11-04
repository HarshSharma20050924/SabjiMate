import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '@common/AuthContext';
import { getAdminAnalyticsSummary } from '@common/api';
import { AdminAnalyticsSummary } from '@common/types';
import LoadingSpinner from '@common/components/LoadingSpinner';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';


// Import existing management screens
import ManageVegetables from '@admin/components/ManageVegetables';
import TodaysDeliveries from '@admin/components/TodaysDeliveries';
import UserSales from '@admin/components/UserSales';
import LiveTrackingView from '@admin/components/LiveTrackingView';
import ManageDrivers from '@admin/components/ManageDrivers';
import UrgentOrdersQueue from '@admin/components/UrgentOrdersQueue';
import ManageAreasAndPricing from '@admin/components/ManageAreasAndPricing';
import ManagePromotions from '@admin/components/ManagePromotions';
import WishlistLockControl from '@admin/components/WishlistLockControl';
import BroadcastNotifications from './BroadcastNotifications';

type AdminScreen = 'dashboard' | 'vegetables' | 'areas' | 'promotions' | 'deliveries' | 'users' | 'urgent' | 'tracking' | 'drivers' | 'wishlist' | 'broadcast';

// --- Sidebar Icons ---
const Icons: { [key in AdminScreen]: React.ReactNode } = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>,
  vegetables: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H4.72l-.38-1.522A1 1 0 003 1z" /></svg>,
  areas: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>,
  promotions: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a1 1 0 011-1h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
  deliveries: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15 16.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" /><path fillRule="evenodd" d="M12 2a1 1 0 00-1-1H4a1 1 0 00-1 1v1h10V2zM3 4a1 1 0 00-1 1v9a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-2a1 1 0 00-1-1H9v-2h4a1 1 0 001-1V5a1 1 0 00-1-1H3zm6 4v2h2v-2H9z" clipRule="evenodd" /></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>,
  urgent: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" /></svg>,
  tracking: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-.973z" clipRule="evenodd" /></svg>,
  drivers: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>,
  wishlist: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>,
  broadcast: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a.75.75 0 01.75.75v1.577a4.996 4.996 0 013.483 3.483H15.75a.75.75 0 010 1.5h-1.44a4.996 4.996 0 01-3.483 3.483V15.75a.75.75 0 01-1.5 0v-1.44a4.996 4.996 0 01-3.483-3.483H4.25a.75.75 0 010-1.5h1.577a4.996 4.996 0 013.483-3.483V4.25A.75.75 0 0110 3.5zM6.666 10a3.333 3.333 0 106.666 0 3.333 3.333 0 00-6.666 0z" /></svg>,
};
const screens: { id: AdminScreen; title: string; }[] = [
    { id: 'dashboard', title: 'Dashboard' }, { id: 'vegetables', title: 'Vegetables' },
    { id: 'areas', title: 'Areas & Pricing' }, { id: 'promotions', title: 'Promotions' },
    { id: 'deliveries', title: 'Deliveries' }, { id: 'users', title: 'Users & Sales' },
    { id: 'urgent', title: 'Urgent Orders' }, { id: 'tracking', title: 'Live Track' },
    { id: 'drivers', title: 'Drivers' }, { id: 'wishlist', title: 'Wishlist Control' },
    { id: 'broadcast', title: 'Broadcast' },
];

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm flex items-center space-x-4">
        <div className={`rounded-full p-3 ${color}`}>{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const CustomLineChartTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-lg">
          <p className="font-bold">{label}</p>
          {payload.map((pld: any, index: number) => (
             <p key={index} style={{ color: pld.color }}>{`${pld.name}: ₹${pld.value.toFixed(2)}`}</p>
          ))}
        </div>
      );
    }
    return null;
};

const CustomPieChartTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-lg">
          <p className="font-bold">{payload[0].name}</p>
          <p>{`Orders: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};

const AnalyticsDashboardComponent: React.FC = () => {
    const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');
    const DOUGHNUT_COLORS = ['#10B981', '#F97316', '#3B82F6', '#EF4444', '#F59E0B'];

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - (timeRange === '7d' ? 6 : 29)); // 7 or 30 days inclusive
            try {
                const data = await getAdminAnalyticsSummary(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
                setSummary(data);
            } catch (err) {
                setError('Failed to load analytics data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [timeRange]);

    if (isLoading) return <LoadingSpinner />;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!summary) return <p>No data available.</p>;

    const fullChartData = [...summary.historicalRevenue, ...summary.salesForecast];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
                <div className="flex items-center space-x-2 bg-slate-200 p-1 rounded-full">
                    <button onClick={() => setTimeRange('7d')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${timeRange === '7d' ? 'bg-white shadow' : ''}`}>Last 7 Days</button>
                    <button onClick={() => setTimeRange('30d')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${timeRange === '30d' ? 'bg-white shadow' : ''}`}>Last 30 Days</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} title="Total Revenue" value={`₹${summary.totalRevenue.toFixed(2)}`} color="bg-green-100" />
                <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 01-8.488 0" /></svg>} title="Total Users" value={summary.totalUsers} color="bg-blue-100" />
                <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} title="Total Orders" value={summary.totalOrders} color="bg-orange-100" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Revenue (Last {timeRange === '7d' ? '7' : '30'} Days)</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={fullChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomLineChartTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} data={summary.historicalRevenue} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Top 5 Popular Vegetables</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={summary.topVegetables}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="name"
                            >
                                {summary.topVegetables.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={DOUGHNUT_COLORS[index % DOUGHNUT_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomPieChartTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Top 5 Customers (by spending)</h2>
                     <table className="w-full text-left">
                         <thead><tr className="border-b text-sm text-gray-500"><th className="py-2">Name</th><th>Total Spent</th></tr></thead>
                         <tbody>
                            {summary.topCustomers.map(c => <tr key={c.phone} className="border-b"><td className="py-3 font-semibold text-gray-800">{c.name}</td><td className="font-semibold text-green-700">₹{c.totalSpent.toFixed(2)}</td></tr>)}
                         </tbody>
                     </table>
                </div>
            </div>
        </div>
    );
};


const AdminDashboard: React.FC = () => {
  const { logout } = useContext(AuthContext);
  const [activeScreen, setActiveScreen] = useState<AdminScreen>('dashboard');

  const renderScreen = () => {
    const screensMap: Record<AdminScreen, React.ReactNode> = {
      dashboard: <AnalyticsDashboardComponent />,
      vegetables: <ManageVegetables />,
      areas: <ManageAreasAndPricing />,
      promotions: <ManagePromotions />,
      deliveries: <TodaysDeliveries />,
      users: <UserSales />,
      urgent: <UrgentOrdersQueue />,
      tracking: <LiveTrackingView />,
      drivers: <ManageDrivers />,
      wishlist: <WishlistLockControl />,
      broadcast: <BroadcastNotifications />,
    };
    const Component = screensMap[activeScreen];
    return Component ? <div className="animate-zoom-in" style={{animationDuration: '0.3s'}}>{Component}</div> : null;
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-slate-300 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center justify-center border-b border-slate-700 px-4">
            <h1 className="text-2xl font-bold text-white whitespace-nowrap">
                <span className="text-green-400">सब्ज़ी</span>
                <span className="text-red-400">MATE</span>
            </h1>
        </div>
        <nav className="flex-grow overflow-y-auto">
            <ul className="py-4">
                {screens.map(screen => (
                    <li key={screen.id} className="px-4 py-1">
                        <button
                            onClick={() => setActiveScreen(screen.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${activeScreen === screen.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-700 hover:text-white'}`}
                        >
                            {Icons[screen.id]}
                            <span>{screen.title}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
        <div className="p-4 border-t border-slate-700">
            <button onClick={logout} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto p-6 lg:p-8">
        {renderScreen()}
      </main>
    </div>
  );
};

export default AdminDashboard;