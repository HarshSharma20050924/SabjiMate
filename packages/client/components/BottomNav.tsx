import React from 'react';
import { Language, ActiveTab } from '@common/types';
import { translations } from '@common/constants';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  wishlistCount: number;
}

// Icons
const HomeIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UrgentOrderIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const RecipeIcon = ({ isActive }: { isActive: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-gray-500'}`} fill={isActive ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
);

const BillsIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const WishlistIcon = ({ isActive }: { isActive: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`w-6 h-6 ${isActive ? 'text-green-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const NavItem: React.FC<{ id?: string; label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; badgeCount?: number; className?: string; }> = React.memo(({ id, label, icon, isActive, onClick, badgeCount, className }) => (
  <button id={id} onClick={onClick} className={`relative flex flex-col items-center justify-center w-1/5 space-y-1 ${className}`}>
    {badgeCount != null && (
      <span className="absolute top-0 right-3 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center border-2 border-white">
        {badgeCount}
      </span>
    )}
    {icon}
    <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>{label}</span>
  </button>
));


const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, language, wishlistCount }) => {
  const t = translations[language];

  const navItems = [
    { tab: ActiveTab.Home, label: t.home, icon: <HomeIcon isActive={activeTab === ActiveTab.Home} /> },
    { tab: ActiveTab.UrgentOrder, label: t.urgentOrder, icon: <UrgentOrderIcon isActive={activeTab === ActiveTab.UrgentOrder} /> },
    { tab: ActiveTab.Recipe, label: t.recipe, icon: <RecipeIcon isActive={activeTab === ActiveTab.Recipe} /> },
    { tab: ActiveTab.Bills, label: t.bills, icon: <BillsIcon isActive={activeTab === ActiveTab.Bills} /> },
    { tab: ActiveTab.MyList, label: t.myList, icon: <WishlistIcon isActive={activeTab === ActiveTab.MyList} />, badgeCount: wishlistCount, id: 'my-list-nav-item' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 shadow-t-lg flex justify-around h-16 z-10">
      {navItems.map(item => (
        <NavItem 
          key={item.tab}
          id={item.id}
          label={item.label}
          icon={item.icon}
          isActive={activeTab === item.tab}
          onClick={() => setActiveTab(item.tab)}
          badgeCount={item.badgeCount}
          className={item.className}
        />
      ))}
    </nav>
  );
};

export default React.memo(BottomNav);