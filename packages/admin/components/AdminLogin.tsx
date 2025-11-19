import React, { useState, useContext } from 'react';
import { AuthContext } from '@common/AuthContext';
import * as api from '@common/api';

const AdminLogin: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setSession } = useContext(AuthContext);

    // New state for 2FA flow
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
    const [tempToken, setTempToken] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await api.loginUser(phone, password);
            if ('twoFactorRequired' in result && result.twoFactorRequired) {
                setTempToken(result.tempToken);
                setStep('2fa');
            } else if ('accessToken' in result) {
                setSession(result.accessToken, result.refreshToken, result.user);
            } else {
                throw new Error('Invalid response from server.');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const { accessToken, refreshToken, user } = await api.verify2FA(tempToken, twoFactorCode);
            setSession(accessToken, refreshToken, user);
        } catch (err: any) {
            setError(err.message || 'Invalid 2FA code.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderCredentialForm = () => (
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
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400">
                {isLoading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );

    const render2FAForm = () => (
        <form onSubmit={handleVerify2FA}>
            <p className="text-gray-300 mb-4">Enter the code from your authenticator app.</p>
            <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6-Digit Code"
                maxLength={6}
                className="w-full bg-gray-700 text-white text-center tracking-[0.5em] text-xl font-semibold py-3 px-4 rounded-lg shadow-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                required
                autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors disabled:bg-gray-400">
                {isLoading ? 'Verifying...' : 'Verify'}
            </button>
             <button type="button" onClick={() => { setStep('credentials'); setTempToken(''); setTwoFactorCode(''); setError(''); }} className="w-full text-sm text-gray-400 mt-4 hover:underline">
                Back to login
            </button>
        </form>
    );

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-800 p-6 text-center text-white">
            <h1 className="text-5xl font-bold mb-2">
                <span className="text-green-400">सब्ज़ी</span>
                <span className="text-red-500">MATE</span>
            </h1>
            <p className="text-gray-400 mb-10">
                {step === 'credentials' ? 'Admin Panel' : 'Two-Factor Authentication'}
            </p>

            <div className="w-full max-w-sm">
                {step === 'credentials' ? renderCredentialForm() : render2FAForm()}
            </div>
        </div>
    );
};

export default AdminLogin;