import React from 'react';
import { User } from '@common/types';

interface HeaderProps {
  user: User;
  onProfileClick: () => void;
  onSettingsClick: () => void;
}

const ProfileIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const SettingsIcon: React.FC<{className: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ user, onProfileClick, onSettingsClick }) => {
  return (
    <header className="bg-white shadow-md p-3 flex justify-between items-center sticky top-0 z-20 h-16">
      {/* Left: Profile */}
      <div className="flex-1 flex justify-start">
        <button onClick={onProfileClick} className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ring-2 ring-green-500 hover:ring-green-600 transition-all">
          {user.image ? (
            <img src={user.image} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <ProfileIcon className="w-8 h-8 text-gray-500" />
          )}
        </button>
      </div>
      
      {/* Center: App Name */}
      <div className="flex-1 text-center">
        <h1 className="text-2xl font-bold">
            <span className="text-green-700">सब्ज़ी</span>
            <span className="text-orange-600 relative">MATE<span className="absolute bottom-[-2px] left-0 w-full h-0.5 bg-orange-600"></span></span>
        </h1>
      </div>

      {/* Right: Settings */}
      <div className="flex-1 flex justify-end">
        <button onClick={onSettingsClick} className="text-gray-600 hover:text-green-700 p-2">
            <SettingsIcon className="w-7 h-7" />
        </button>
      </div>
    </header>
  );
};

export default React.memo(Header);