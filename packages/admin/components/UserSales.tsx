import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Sale, UserWithBill, PaymentPreference } from '@common/types';
import { getUsers, getSalesData } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';
import UserSalesModal from './UserSalesModal';
import { getWebSocketUrl } from '@common/utils';

const RefreshIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const PreferenceBadge: React.FC<{ preference?: PaymentPreference | null }> = ({ preference }) => {
    if (!preference) return null;
    const styles = {
        DAILY: 'bg-blue-100 text-blue-800',
        WEEKLY: 'bg-yellow-100 text-yellow-800',
        MONTHLY: 'bg-purple-100 text-purple-800',
    };
    return (
        <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${styles[preference]}`}>
            {preference.toLowerCase()}
        </span>
    );
};

const UserSales: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithBill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    try {
      !selectedUser && setIsLoading(true); // Only show full loader if modal is not open
      const [usersData, salesData] = await Promise.all([
        getUsers(),
        getSalesData()
      ]);
      setUsers(usersData);
      setSales(salesData);
    } catch (error) {
      console.error("Failed to fetch user and sales data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedUser]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl());

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'payment_received_cash') {
                fetchData();
            }
        } catch(e) {
            console.error('Error parsing admin websocket message:', e);
        }
    };

    return () => socket.close();
  }, [fetchData]);

  const usersWithBills: UserWithBill[] = useMemo(() => {
    const usersWithBillData = users.map(user => {
      const userSales = sales.filter(sale => sale.userId === user.phone && sale.paymentStatus === 'UNPAID');
      const totalBill = userSales.reduce((acc, sale) => acc + sale.total, 0);
      return { ...user, totalBill };
    });
    
    if (!searchTerm) {
        return usersWithBillData;
    }

    return usersWithBillData.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm)
    );

  }, [users, sales, searchTerm]);

  const totalRevenue = useMemo(() => {
      return sales.filter(s => s.paymentStatus !== 'UNPAID').reduce((acc, sale) => acc + sale.total, 0);
  }, [sales]);
  
  const handleUserClick = (user: UserWithBill) => {
    setSelectedUser(user);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    fetchData(); // Refresh data when modal is closed
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-800">Users & Sales Overview</h2>
                <button onClick={fetchData} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400">
                    <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
             <div className="relative">
                <input 
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm w-64"
                />
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>
        </div>
      {isLoading ? <LoadingSpinner /> : (
        <>
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <h3 className="text-lg font-semibold text-gray-700">Total Revenue (Paid)</h3>
                <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-4">User Bills</h3>
            <div className="bg-white rounded-lg shadow">
                <ul className="divide-y divide-gray-200">
                    {usersWithBills.map(user => (
                        <li key={user.phone}>
                            <button onClick={() => handleUserClick(user)} className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="font-semibold text-gray-900 flex items-center">
                                        {user.name}
                                        <PreferenceBadge preference={user.paymentPreference} />
                                    </p>
                                    <p className="text-sm text-gray-600">{user.phone}</p>
                                    <p className="text-sm text-gray-600 mt-1">{user.address}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Unpaid Bill</p>
                                    <p className="font-bold text-lg text-red-600 text-right">₹{user.totalBill.toFixed(2)}</p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </>
      )}
      {selectedUser && (
          <UserSalesModal 
            user={selectedUser}
            sales={sales.filter(s => s.userId === selectedUser.phone)}
            onClose={handleCloseModal}
          />
      )}
    </div>
  );
};

export default UserSales;