import React, { useState, useEffect, useRef } from 'react';
import { User } from '@common/types';
import * as api from '@common/api';

interface CustomerAccessModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerAccessModal: React.FC<CustomerAccessModalProps> = ({ user, onClose, onSuccess }) => {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [otp, setOtp] = useState<string[]>(new Array(4).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const startCountdown = () => setCountdown(30);

  const handleRequestCode = async () => {
    setIsLoading(true);
    setError('');
    try {
        await api.requestCustomerAccess(user.phone);
        setStep('verify');
        startCountdown();
    } catch (err: any) {
        setError(err.message || 'Failed to send OTP.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerify = async (finalOtp: string) => {
      if (finalOtp.length !== 4) return;
      setIsLoading(true);
      setError('');
      try {
        await api.verifyCustomerAccess(user.phone, finalOtp);
        onSuccess();
      } catch (err: any) {
        setError(err.message || 'Verification failed.');
        setOtp(new Array(4).fill(''));
        otpInputsRef.current[0]?.focus();
      } finally {
        setIsLoading(false);
      }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      otpInputsRef.current[index + 1]?.focus();
    }
    if (newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
          otpInputsRef.current[index - 1]?.focus();
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-800">Customer Verification</h2>
            {step === 'request' ? (
                <>
                    <p className="text-gray-600 my-4">To manage sales for <strong>{user.name}</strong>, please ask for their permission and send them a verification code.</p>
                    <button onClick={handleRequestCode} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400">
                        {isLoading ? 'Sending...' : 'Send Access Code'}
                    </button>
                </>
            ) : (
                <>
                    <p className="text-gray-600 my-4">Please enter the 4-digit code sent to the customer's mobile number ({user.phone}).</p>
                    <div className="flex justify-center space-x-3 my-6">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => otpInputsRef.current[index] = el!}
                                type="tel"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleOtpChange(e, index)}
                                onKeyDown={e => handleOtpKeyDown(e, index)}
                                className={`w-14 h-16 text-center text-3xl font-bold bg-gray-100 border-2 rounded-lg transition-all ${error ? 'border-red-500 animate-shake' : 'border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600'}`}
                                disabled={isLoading}
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>
                     <button onClick={() => handleVerify(otp.join(''))} disabled={isLoading || otp.join('').length < 4} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400">
                        {isLoading ? 'Verifying...' : 'Verify & Proceed'}
                    </button>
                    <button onClick={handleRequestCode} disabled={isLoading || countdown > 0} className="text-sm text-gray-500 mt-4 hover:underline disabled:text-gray-400">
                        Resend Code {countdown > 0 ? `(${countdown}s)` : ''}
                    </button>
                </>
            )}
            {error && <p className="text-red-500 text-sm mt-4 animate-shake">{error}</p>}
        </div>
         <div className="bg-gray-100 px-6 py-3 flex justify-end">
            <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccessModal;