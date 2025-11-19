import React, { useState, useContext, useEffect, lazy, Suspense } from 'react';
import { Language, User, DeliveryArea } from '@common/types';
import Login from './components/Login';
import Intro from './components/Intro';
// FIX: Import AuthContextType to correctly type the context value.
import { AuthContext, AuthContextType } from '@common/AuthContext';
import LoadingSpinner from '@common/components/LoadingSpinner';
import * as api from '@common/api';

// Lazy load heavy components so they don't block the initial Login screen load
const MainLayout = lazy(() => import('./components/MainLayout'));
const ProfileScreen = lazy(() => import('./components/screens/ProfileScreen'));
const ComingSoonScreen = lazy(() => import('./components/screens/ComingSoonScreen'));

const ErrorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);

const AccessDeniedScreen: React.FC<{ logout: () => void; role: string | null | undefined }> = ({ logout, role }) => (
    <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="mt-2 text-gray-600">
            You are logged in as a{role === 'ADMIN' ? 'n' : ''} <span className="font-semibold">{role}</span>.
            Please use the appropriate portal for your role.
        </p>
        <button
            onClick={logout}
            className="mt-6 bg-red-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-red-700"
        >
            Logout
        </button>
    </div>
);


const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [showIntro, setShowIntro] = useState(true);
  const [introAnimatingOut, setIntroAnimatingOut] = useState(false);
  // FIX: Explicitly type `auth` to fix multiple property access errors.
  const auth = useContext(AuthContext) as AuthContextType;

  const [serviceableAreas, setServiceableAreas] = useState<DeliveryArea[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  const [areasError, setAreasError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroAnimatingOut(true);
      setTimeout(() => setShowIntro(false), 500); 
    }, 2500);

    const fetchAreas = async () => {
        try {
            setAreasError(null);
            setIsLoadingAreas(true);
            const areas = await api.getDeliveryAreas();
            setServiceableAreas(areas.filter(a => a.isActive));
        } catch (error) {
            console.error("Failed to fetch serviceable areas", error);
            setAreasError("Could not connect to SabziMATE. Please check your internet connection and try again.");
        } finally {
            setIsLoadingAreas(false);
        }
    };
    fetchAreas();

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (auth && !auth.isInitialLoading) {
        // Handle Google Login Redirect
        const hash = window.location.hash;
        if (hash) {
            try {
                const params = new URLSearchParams(hash.substring(1));
                const token = params.get('token');
                const userStr = params.get('user');
                if (token && userStr) {
                    const user = JSON.parse(decodeURIComponent(userStr));
                    auth.handleGoogleLogin(token, user);
                    window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }
            } catch(e) {
                console.error("Error parsing Google login params from URL hash", e);
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
        }
    }
  }, [auth, auth?.isInitialLoading, auth?.token, auth?.handleGoogleLogin]);

  const handleOnboardingComplete = (updatedUser: User) => {
      auth?.updateUserSession(updatedUser);
  };

  if (!auth) {
    return (
        <div className="h-screen flex items-center justify-center">
            <LoadingSpinner />
        </div>
    );
  }
  
  if (showIntro) {
    return <Intro isAnimatingOut={introAnimatingOut} />;
  }

  const renderContent = () => {
    if (auth.isInitialLoading || isLoadingAreas) {
        return (
            <div className="h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }
    
    if (areasError) {
        return (
             <div className="h-screen flex items-center justify-center p-6 text-center">
                <div className="text-red-500"><ErrorIcon /></div>
                <h2 className="mt-4 text-xl font-bold text-gray-800">Connection Error</h2>
                <p className="mt-2 text-gray-600">{areasError}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 bg-green-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-green-700"
                >
                    Retry
                </button>
            </div>
        );
    }
    
    if (auth.user) {
       // Role check to prevent admin/driver from using the client app
       if (auth.user.role !== 'USER') {
           return <AccessDeniedScreen logout={auth.logout} role={auth.user.role} />;
       }

       const isProfileComplete = auth.user.address && auth.user.city && auth.user.state && auth.user.name && !auth.user.name.startsWith('User ');
       
       if (!isProfileComplete) {
           return (
               <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
                    <ProfileScreen language={language} onSaveSuccess={handleOnboardingComplete} />
               </Suspense>
           );
       }
       
       const isServiceable = serviceableAreas.some(area => 
            area.city.toLowerCase() === auth.user.city?.toLowerCase() && 
            area.state.toLowerCase() === auth.user.state?.toLowerCase()
       );

       if (!isServiceable) {
           return (
               <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
                   <ComingSoonScreen user={auth.user} language={language} />
               </Suspense>
           );
       }

       return (
           <Suspense fallback={<div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
                <MainLayout user={auth.user} language={language} setLanguage={setLanguage} />
           </Suspense>
       );
    }
    // Login is kept synchronous for immediate interactivity
    return <Login language={language} setLanguage={setLanguage} />;
  }

  return (
    <div className="bg-slate-50 font-sans">
      <div className="relative max-w-md mx-auto min-h-screen shadow-2xl bg-white">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;