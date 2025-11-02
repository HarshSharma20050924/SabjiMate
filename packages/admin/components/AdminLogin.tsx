import React, { useState, useContext } from 'react';
import { AuthContext } from '@common/AuthContext';

const AdminLogin: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginWithPassword, isLoading } = useContext(AuthContext);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
        await loginWithPassword(phone, password);
    } catch(err: any) {
        setError(err.message || 'Login failed.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-800 p-6 text-center text-white">
      <h1 className="text-5xl font-bold mb-2">
        <span className="text-green-400">सब्ज़ी</span>
        <span className="text-red-500">MATE</span>
      </h1>
      <p className="text-gray-400 mb-10">Admin Panel</p>

      <div className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
             <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                required
                autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400">
             {isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
      </div>

       <div className="mt-8 text-sm text-gray-400 max-w-md">
            <p>
                <span className="font-bold text-gray-300">First-Time Setup?</span> A default admin account can be created on server startup.
            </p>
            <p className="mt-1">
                Ensure you have set <code className="bg-gray-700 text-gray-300 px-1 rounded mx-1">DEFAULT_ADMIN_PHONE</code> and <code className="bg-gray-700 text-gray-300 px-1 rounded mx-1">DEFAULT_ADMIN_PASSWORD</code> in the server's <code className="bg-gray-700 text-gray-300 px-1 rounded mx-1">.env</code> file, then restart the server.
            </p>
        </div>
    </div>
  );
};

export default AdminLogin;