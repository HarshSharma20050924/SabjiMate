import React, { useState, useContext } from 'react';
import { AuthContext } from '@common/AuthContext';

const DriverLogin: React.FC = () => {
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
        setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-6 text-center">
      <div className="mb-8">
        <h1 className="text-5xl font-bold">
          <span className="text-green-700">सब्ज़ी</span>
          <span className="text-red-600">MATE</span>
        </h1>
        <p className="text-gray-600 mt-2 font-semibold tracking-wider">DRIVER PORTAL</p>
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Login to Your Account</h2>
        <form onSubmit={handleLogin} className="space-y-6">
             <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-Digit Phone Number"
                className="w-full text-gray-900 font-semibold py-3 px-4 rounded-lg shadow-sm border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full text-gray-900 font-semibold py-3 px-4 rounded-lg shadow-sm border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                required
            />
            {error && <p className="text-red-500 text-sm animate-shake">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400">
             {isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default DriverLogin;