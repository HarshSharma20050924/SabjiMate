import React from 'react';

type ActiveTab = 'route' | 'map' | 'summary';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const RouteIcon = ({ isActive }: { isActive: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const MapIcon = ({ isActive }: { isActive: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 10V7m0 10L9 7" /></svg>;
const SummaryIcon = ({ isActive }: { isActive: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`w-7 h-7 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

const NavItem: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center w-1/3 pt-2 pb-1 space-y-1">
    {icon}
    <span className={`text-xs font-semibold ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'route', label: 'Route', icon: <RouteIcon isActive={activeTab === 'route'} /> },
    { id: 'map', label: 'Map', icon: <MapIcon isActive={activeTab === 'map'} /> },
    { id: 'summary', label: 'Summary', icon: <SummaryIcon isActive={activeTab === 'summary'} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-white border-t border-gray-200 shadow-t-lg flex justify-around h-16 z-10">
      {navItems.map(item => (
        <NavItem 
          key={item.id}
          label={item.label}
          icon={item.icon}
          isActive={activeTab === item.id}
          onClick={() => setActiveTab(item.id as ActiveTab)}
        />
      ))}
    </nav>
  );
};

export default BottomNav;
