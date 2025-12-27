import React, { useState, useContext, useRef, useEffect } from 'react';
import { Language } from '@common/types';
import { translations } from '@common/constants';
import { AuthContext, AuthContextType } from '@common/AuthContext';
import * as api from '@common/api';

interface LoginProps {
  language: Language;
  setLanguage: (language: Language) => void;
}

const Login: React.FC<LoginProps> = ({ language, setLanguage }) => {
  const [showLanguagePicker, setShowLanguagePicker] = useState(true);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const t = translations[language];
  const auth = useContext(AuthContext) as AuthContextType;

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [error, setError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  // Resend Cooldown Timer
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timerId = setTimeout(() => {
        setResendCooldown(c => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timerId);
  }, [resendCooldown]);

  // WebOTP API Effect
  useEffect(() => {
    if (step !== 'otp' || !('OTPCredential' in window)) {
      return;
    }
    const abortController = new AbortController();
    const handleOtp = (otpCredential: any) => {
        if (!otpCredential) return;
        const receivedOtp = otpCredential.code;
        if (receivedOtp) {
            setOtp(receivedOtp.split(''));
            // Auto-submit after a short delay to allow state update
            setTimeout(() => {
                handleSubmitOtp(receivedOtp);
            }, 100);
        }
    };
    navigator.credentials.get({
      otp: { transport: ['sms'] },
      signal: abortController.signal
    } as any).then(handleOtp).catch(err => {
      console.log("WebOTP API failed:", err);
    });

    return () => {
      abortController.abort();
    };
  }, [step]);


  const startResendCooldown = () => setResendCooldown(30);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setShowLanguagePicker(false);
  };
  
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSendingOtp(true);
    try {
        const response = await api.sendOtp(phone);
        
        // Handle Demo/Test OTP via Notification
        if (response.debugOtp) {
            const showNotification = () => new Notification('SabziMATE Login', { 
                body: `Your verification code is: ${response.debugOtp}`, 
                icon: '/logo.svg',
                tag: 'login-otp'
            });
            
            if (Notification.permission === 'granted') {
                showNotification();
            } else if (Notification.permission !== 'denied') {
                await Notification.requestPermission().then(p => {
                    if (p === 'granted') showNotification();
                    else alert(`Demo Login Code: ${response.debugOtp}`);
                });
            } else {
                alert(`Demo Login Code: ${response.debugOtp}`);
            }
        }

        setStep('otp');
        startResendCooldown();
    } catch (err: any) {
        setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
        setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
      if (resendCooldown > 0) return;
      setError('');
      setOtp(new Array(6).fill(''));
      try {
        const response = await api.sendOtp(phone);
        if (response.debugOtp) {
             if (Notification.permission === 'granted') {
                new Notification('SabziMATE Login', { body: `Your code is: ${response.debugOtp}`, icon: '/logo.svg' });
             } else {
                alert(`Demo Code: ${response.debugOtp}`);
             }
        }
        startResendCooldown();
      } catch (err: any) {
        setError(err.message || 'Failed to resend OTP.');
      }
  };
  
  const handleSubmitOtp = async (finalOtp: string) => {
    if (auth?.isLoading || finalOtp.length !== 6) return;
    setError('');
    
    try {
        await auth.loginWithOtp(phone, finalOtp);
    } catch (err: any) {
        setError(err.message || 'OTP verification failed.');
        setOtp(new Array(6).fill(''));
        otpInputsRef.current[0]?.focus();
    }
  };

  const handleOtpFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmitOtp(otp.join(''));
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // If a digit is entered, move to the next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
    
    // If all inputs are filled, submit
    if (newOtp.every(digit => digit !== '')) {
      handleSubmitOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
          otpInputsRef.current[index - 1]?.focus();
      }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pastedData.length === 6) {
          e.preventDefault();
          const newOtp = pastedData.split('');
          setOtp(newOtp);
          handleSubmitOtp(pastedData);
      }
  };

  const handleEditNumber = () => {
    setError('');
    setOtp(new Array(6).fill(''));
    setResendCooldown(0);
    setStep('phone');
  };

  if (showLanguagePicker) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold">
            <span className="text-green-800">सब्ज़ी</span>
            <span className="text-orange-600 relative">MATE<span className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-orange-600"></span></span>
            </h1>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-lg text-center w-full max-w-sm">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6">{translations[Language.EN].chooseLanguage} / {translations[Language.HI].chooseLanguage}</h2>
            <div className="space-y-4">
                <button
                    onClick={() => handleLanguageSelect(Language.EN)}
                    className="w-full bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-800 transition-colors duration-300"
                >
                    {translations[Language.EN].english}
                </button>
                <button
                    onClick={() => handleLanguageSelect(Language.HI)}
                    className="w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-orange-600 transition-colors duration-300"
                >
                    {translations[Language.HI].hindi}
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#F9F6F1] p-4 pt-16 sm:p-6 lg:p-8">
      <div className="absolute top-6 right-6">
          <button className="px-5 py-2 text-sm font-semibold text-gray-800 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 shadow-sm">
              Explore
          </button>
      </div>

      <div className="text-center mb-6">
          <h1 className="text-4xl font-bold">
              <span className="text-green-800">सब्ज़ी</span>
              <span className="text-orange-600 relative">MATE<span className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-orange-600"></span></span>
          </h1>
          <p className="text-gray-600 mt-2">{t.loginSubtitle}</p>
      </div>

      <div className="mb-6 w-full max-w-sm">
          <img src="https://t4.ftcdn.net/jpg/03/20/39/89/360_F_320398931_CO8r6ymeSFqeoY1cE6P8dbSGRYiAYj4a.jpg" alt="Fresh vegetables in a crate" className="rounded-2xl shadow-lg w-full"/>
      </div>
      
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg w-full max-w-sm">
          {step === 'phone' ? (
              <>
                  <h2 className="text-xl font-bold text-gray-800 mb-1">Welcome to SabziMATE</h2>
                  <p className="text-gray-500 mb-6 text-sm">We'll send a 6-digit verification code to this number.</p>
                  <form onSubmit={handleSendOtp} className="space-y-6">
                      <div className="flex items-center border-2 border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-green-600 focus-within:border-green-600 transition-all duration-300 shadow-sm bg-gray-50">
                          <div className="flex items-center pl-3 pr-2 border-r border-gray-300">
                              <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              <span className="text-gray-800 font-semibold ml-2">+91</span>
                          </div>
                          <input
                              type="tel"
                              id="phone"
                              value={phone}
                              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="Enter your 10-digit number"
                              className="w-full text-base bg-transparent border-none focus:ring-0 p-3 text-gray-800 placeholder-gray-500"
                              required
                              pattern="[6-9][0-9]{9}"
                              title="Please enter a valid 10-digit Indian mobile number"
                              autoComplete="tel"
                              autoFocus
                          />
                      </div>
                      <button type="submit" disabled={isSendingOtp} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-green-700 transition-all duration-300 disabled:bg-gray-400">
                          {isSendingOtp ? t.loading : "Send Verification Code"}
                      </button>
                  </form>
              </>
          ) : ( // OTP Screen
              <>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{t.enterVerificationCode}</h2>
                  <p className="text-gray-500 mb-6 text-sm text-center">
                      {t.enterOTPPrompt}
                      <span className="font-bold text-gray-800 block mt-1">
                          +91 {phone}
                          <button type="button" onClick={handleEditNumber} className="ml-2 text-sm font-semibold text-green-700 hover:underline focus:outline-none">(Edit)</button>
                      </span>
                  </p>
                  <form onSubmit={handleOtpFormSubmit} className="space-y-6">
                       <div className="flex justify-center space-x-2" onPaste={handleOtpPaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => { otpInputsRef.current[index] = el!; }}
                                    type="tel"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleOtpChange(e, index)}
                                    onKeyDown={e => handleOtpKeyDown(e, index)}
                                    className={`w-12 h-14 text-center text-2xl font-bold bg-gray-100 border-2 rounded-lg transition-all ${error ? 'border-red-500 animate-shake' : 'border-gray-200 focus:border-green-600 focus:ring-2 focus:ring-green-600'}`}
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    autoFocus={index === 0}
                                />
                            ))}
                        </div>
                      <button type="submit" disabled={auth?.isLoading} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-green-700 disabled:bg-gray-400">
                          {auth?.isLoading ? t.loading : t.verifyAndContinue}
                      </button>
                  </form>
                  {error && <p className="text-red-500 text-sm mt-4 text-center animate-shake">{error}</p>}

                  <div className="mt-6 text-sm text-center text-gray-600">
                      <p>{t.didNotReceiveCode}</p>
                      <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0} className="font-bold text-green-700 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed mt-1">
                          {resendCooldown > 0 ? (
                              <span>{t.resendIn} <span className="font-bold w-6 inline-block">{resendCooldown}s</span></span>
                          ) : (t.resendOTP)}
                      </button>
                  </div>
              </>
          )}
          <p className="text-xs text-gray-500 pt-5 text-center">
              By continuing, you agree to our <br/>
              <a href="#" className="font-semibold text-orange-600 hover:underline">Terms & Conditions</a> & <a href="#" className="font-semibold text-orange-600 hover:underline">Privacy Policy</a>.
          </p>
      </div>
    </div>
  );
};

export default Login;