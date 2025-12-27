import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Sale, Vegetable, Language } from '@common/types';
import * as api from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';

declare const Chart: any;

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="p-3 bg-green-100 text-green-600 rounded-full">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        {children}
    </div>
);

const AnalyticsDashboard: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [vegetables, setVegetables] = useState<Vegetable[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const salesChartRef = useRef<HTMLCanvasElement | null>(null);
    const popularVeggiesChartRef = useRef<HTMLCanvasElement | null>(null);
    const userGrowthChartRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersData, salesData, vegetablesData] = await Promise.all([
                    api.getUsers(),
                    api.getSalesData(),
                    api.getAllVegetablesForAdmin(),
                ]);
                setUsers(usersData);
                setSales(salesData);
                setVegetables(vegetablesData);
            } catch (error) {
                console.error("Failed to fetch analytics data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Memoized data processing
    const analyticsData = useMemo(() => {
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalUsers = users.length;
        const totalOrders = sales.length;

        // Sales trend (last 30 days)
        const salesByDay: { [key: string]: number } = {};
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            salesByDay[dateString] = 0;
        }
        sales.forEach(sale => {
            const saleDate = new Date(sale.date).toISOString().split('T')[0];
            if (salesByDay[saleDate] !== undefined) {
                salesByDay[saleDate] += sale.total;
            }
        });

        // Popular vegetables
        const veggieCounts: { [key: string]: number } = {};
        sales.flatMap(s => s.items).forEach(item => {
            veggieCounts[item.vegetableName] = (veggieCounts[item.vegetableName] || 0) + 1; // Count by occurrence in orders
        });
        const popularVeggies = Object.entries(veggieCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // Top customers
        const customerSpending: { [key: string]: number } = {};
        sales.forEach(sale => {
            customerSpending[sale.userId] = (customerSpending[sale.userId] || 0) + sale.total;
        });
        const topCustomers = Object.entries(customerSpending)
            .map(([userId, total]) => ({
                user: users.find(u => u.phone === userId),
                total
            }))
            .filter(c => c.user)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return { totalRevenue, totalUsers, totalOrders, salesByDay, popularVeggies, topCustomers };
    }, [sales, users]);

    // Chart rendering effects
    useEffect(() => {
        let chartInstance: any;
        if (salesChartRef.current && analyticsData.salesByDay) {
            const ctx = salesChartRef.current.getContext('2d');
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Object.keys(analyticsData.salesByDay),
                    datasets: [{
                        label: 'Daily Revenue',
                        data: Object.values(analyticsData.salesByDay),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.3,
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        return () => chartInstance?.destroy();
    }, [analyticsData.salesByDay]);

    useEffect(() => {
        let chartInstance: any;
        if (popularVeggiesChartRef.current && analyticsData.popularVeggies.length > 0) {
            const ctx = popularVeggiesChartRef.current.getContext('2d');
            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: analyticsData.popularVeggies.map(v => v[0]),
                    datasets: [{
                        label: 'Orders',
                        data: analyticsData.popularVeggies.map(v => v[1]),
                        backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'],
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        return () => chartInstance?.destroy();
    }, [analyticsData.popularVeggies]);


    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h2>
            
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Revenue" value={`₹${analyticsData.totalRevenue.toFixed(2)}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                <StatCard title="Total Users" value={String(analyticsData.totalUsers)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 10a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                <StatCard title="Total Orders" value={String(analyticsData.totalOrders)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Revenue (Last 30 Days)">
                    <div className="h-80"><canvas ref={salesChartRef}></canvas></div>
                </ChartCard>
                <ChartCard title="Top 5 Popular Vegetables (by # of orders)">
                    <div className="h-80"><canvas ref={popularVeggiesChartRef}></canvas></div>
                </ChartCard>
            </div>
            
            <ChartCard title="Top 5 Customers (by spending)">
                <div className="bg-white rounded-lg">
                    <ul className="divide-y divide-gray-200">
                        {analyticsData.topCustomers.map(({ user, total }) => (
                            <li key={user?.phone} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-900">{user?.name}</p>
                                    <p className="text-sm text-gray-600">{user?.phone}</p>
                                </div>
                                <p className="font-bold text-lg text-green-600">₹{total.toFixed(2)}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </ChartCard>
        </div>
    );
};

export default AnalyticsDashboard;
