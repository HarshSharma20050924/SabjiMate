import React, { useContext } from 'react';
import { Language, User } from '../../../common/types';
import { AuthContext } from '../../../common/AuthContext';

interface ComingSoonScreenProps {
  language: Language;
  user: User;
}

const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({ language, user }) => {
  const { logout } = useContext(AuthContext);

  const translations = {
    [Language.EN]: {
      title: "We'll be there soon!",
      message: `Thanks for your interest, ${user.name}! We are not yet available in ${user.city}, but we're expanding quickly. We'll notify you when we launch in your area.`,
      logout: "Logout",
    },
    [Language.HI]: {
      title: "हम जल्द ही वहाँ होंगे!",
      message: `आपकी रुचि के लिए धन्यवाद, ${user.name}! हम अभी ${user.city} में उपलब्ध नहीं हैं, लेकिन हम तेजी से विस्तार कर रहे हैं। जब हम आपके क्षेत्र में लॉन्च करेंगे तो हम आपको सूचित करेंगे।`,
      logout: "लॉग आउट",
    },
  };

  const t = translations[language];

  return (
    <div className="h-screen flex flex-col justify-center items-center p-6 bg-green-50 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v.01" />
            </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">{t.title}</h1>
        <p className="text-gray-600 mt-4 mb-10">{t.message}</p>
        <button
          onClick={logout}
          className="w-full bg-red-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
        >
          {t.logout}
        </button>
      </div>
    </div>
  );
};

export default ComingSoonScreen;