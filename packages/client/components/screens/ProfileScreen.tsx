import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { Language, User, PaymentPreference, DeliveryArea } from '../../../common/types';
import { translations } from '../../../common/constants';
import { AuthContext } from '../../../common/AuthContext';
import * as api from '../../../common/api';
import LoadingSpinner from '../../../common/components/LoadingSpinner';

interface ProfileScreenProps {
  language: Language;
  // This screen now gets the initial user from context and notifies the parent on success.
  onSaveSuccess: (updatedUser: User) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ language, onSaveSuccess }) => {
  const t = translations[language];
  const auth = useContext(AuthContext);
  const [formData, setFormData] = useState<User>(auth.user!);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for location dropdowns
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  
  // New state for reverse geocoding
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
      const fetchAreas = async () => {
          try {
              setIsLoadingAreas(true);
              const availableAreas = await api.getDeliveryAreas();
              setAreas(availableAreas.filter(a => a.isActive));
          } catch (error) {
              console.error("Failed to fetch delivery areas for profile setup", error);
              alert("Could not load available locations. Please try again later.");
          } finally {
              setIsLoadingAreas(false);
          }
      };
      fetchAreas();
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('Image size should be less than 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGeoError(''); // Clear geo error on manual change

    // When the state changes, reset the city
    if (name === 'state') {
        setFormData({ ...formData, state: value, city: '' });
    } else {
        setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
        const updatedUser = await api.updateUser(formData);
        onSaveSuccess(updatedUser); // Notify parent (App.tsx) of the successful update
    } catch (error) {
        console.error("Failed to update user", error);
        alert("Could not save your profile. Please check the details and try again.");
    } finally {
        setIsLoading(false);
    }
  }, [formData, onSaveSuccess]);

  // Memoized lists for location dropdowns
  const availableStates = useMemo(() => {
      const stateSet = new Set(areas.map(a => a.state));
      return Array.from(stateSet).sort();
  }, [areas]);
  
  const citiesForSelectedState = useCallback((state: string) => {
      if (!state) return [];
      return areas.filter(a => a.state === state).map(a => a.city).sort();
  }, [areas]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
        setGeoError("Geolocation is not supported by your browser.");
        return;
    }
    
    setIsGeocoding(true);
    setGeoError('');

    // Request high accuracy from the device's GPS
    const options = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const result = await api.reverseGeocode(latitude, longitude);
                
                // Make the comparison robust and case-insensitive
                const detectedState = result.state?.trim().toLowerCase();
                const detectedCity = result.city?.trim().toLowerCase();
                
                const matchingState = availableStates.find(s => s.trim().toLowerCase() === detectedState);
                
                if (matchingState) {
                    const citiesInState = citiesForSelectedState(matchingState);
                    const matchingCity = citiesInState.find(c => c.trim().toLowerCase() === detectedCity);

                    if (matchingCity) {
                         setFormData(prev => ({
                            ...prev,
                            address: result.address,
                            city: matchingCity, // Use the properly cased name from our DB
                            state: matchingState, // Use the properly cased name from our DB
                            latitude: latitude, // Save the coordinates
                            longitude: longitude, // Save the coordinates
                        }));
                    } else {
                         setGeoError(`We found your city as ${result.city}, but it's not a serviceable area yet.`);
                    }
                } else {
                     setGeoError(`We found your state as ${result.state}, but it's not a serviceable area yet.`);
                }
            } catch (error) {
                console.error("Reverse geocoding failed", error);
                setGeoError("Could not determine your address. Please enter it manually.");
            } finally {
                setIsGeocoding(false);
            }
        },
        (error) => {
            setIsGeocoding(false);
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    setGeoError("You denied the request for Geolocation.");
                    break;
                case error.POSITION_UNAVAILABLE:
                    setGeoError("Location information is unavailable.");
                    break;
                case error.TIMEOUT:
                    setGeoError("The request to get user location timed out.");
                    break;
                default:
                    setGeoError("An unknown error occurred.");
                    break;
            }
        },
        options // Pass the high-accuracy options here
    );
  }, [availableStates, citiesForSelectedState]);

  const isSaveDisabled = isLoading || isLoadingAreas || isGeocoding || !formData.name || !formData.state || !formData.city || !formData.address || formData.address.length < 10;

  if (isLoadingAreas) {
      return (
          <div className="h-screen flex flex-col justify-center items-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Loading locations...</p>
          </div>
      );
  }

  return (
      <div className="p-6 h-screen flex flex-col justify-center">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
                {auth.user?.address ? t.yourProfile : t.setupProfile}
            </h2>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <button onClick={triggerFileSelect} className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {formData.image ? (
                <img src={formData.image} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              )}
            </button>
            <div className="absolute bottom-0 right-0">
              <button onClick={triggerFileSelect} className="bg-green-600 text-white rounded-full p-2 shadow-md border-2 border-white hover:bg-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect}
                accept="image/png, image/jpeg"
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t.fullName}</label>
              <input type="text" name="name" id="name" value={formData.name.startsWith('User ') ? '' : formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"/>
            </div>
            
            {/* Location Button */}
             <button
                onClick={handleUseCurrentLocation}
                disabled={isGeocoding}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white font-bold py-3 rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{isGeocoding ? t.detecting : t.useMyLocation}</span>
            </button>
            {geoError && <p className="text-sm text-center text-red-600">{geoError}</p>}
            <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-sm">{t.orDivider}</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">{t.state}</label>
              <select name="state" id="state" value={formData.state || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm">
                <option value="" disabled>Select your state</option>
                {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">{t.city}</label>
              <select name="city" id="city" value={formData.city || ''} onChange={handleChange} required disabled={!formData.state} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
                <option value="" disabled>Select your city</option>
                {citiesForSelectedState(formData.state || '').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">{t.address}</label>
              <textarea name="address" id="address" rows={3} value={formData.address || ''} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="e.g., House No, Street, Landmark"/>
            </div>
            <button onClick={handleSave} disabled={isSaveDisabled} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg disabled:bg-gray-400">
                {isLoading ? t.loading : t.saveAndContinue}
            </button>
            <button onClick={auth.logout} className="w-full text-center text-sm text-gray-500 mt-4 hover:underline">
                {t.logoutAndStartOver}
            </button>
        </div>
      </div>
  );
};

export default ProfileScreen;