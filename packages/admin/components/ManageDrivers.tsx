import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@common/types';
import { getDrivers, createDriver } from '@common/api';
import LoadingSpinner from '@common/components/LoadingSpinner';

const RefreshIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
);

const ManageDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      const driversData = await getDrivers();
      setDrivers(driversData);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
      setError("Could not load driver data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
        await createDriver({ name, phone, address: 'On Duty', password });
        // Reset form and refresh list
        setName('');
        setPhone('');
        setPassword('');
        fetchDrivers();
    } catch (err: any) {
        setError(err.message || 'Failed to create driver.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Driver List */}
      <div className="lg:col-span-2">
        <div className="flex items-center space-x-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Driver Accounts</h2>
            <button onClick={fetchDrivers} disabled={isLoading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400">
                <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
        {isLoading ? <LoadingSpinner /> : (
            <div className="bg-white rounded-lg shadow">
                {drivers.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {drivers.map(driver => (
                            <li key={driver.phone} className="p-4">
                                <p className="font-semibold text-gray-900">{driver.name}</p>
                                <p className="text-sm text-gray-600">{driver.phone}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p-4 text-center text-gray-500">No drivers have been created yet.</p>
                )}
            </div>
        )}
      </div>
      
      {/* Create Driver Form */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Driver</h2>
        <form onSubmit={handleCreateDriver} className="bg-white p-6 rounded-lg shadow space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400">
                {isSubmitting ? 'Creating...' : '+ Create Driver'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ManageDrivers;