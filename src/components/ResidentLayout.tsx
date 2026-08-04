import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BellRing, Settings, LogOut, Menu, X, Cpu, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const ResidentLayout = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/home', icon: LayoutDashboard },
    { name: 'Alert Settings', path: '/home/settings', icon: BellRing },
    { name: 'Device Registration', path: '/home/devices', icon: Cpu },
    { name: 'System Log', path: '/home/logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#B91C1C] h-16 shadow-sm flex items-center justify-between px-4 lg:px-8 relative z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-white/80 hover:text-white rounded-md lg:hidden"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center gap-1">
            <span className="text-white text-[32px] font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>AgapSense</span>
          </div>
        </div>

        {/* Search & Profile */}
        <div className="flex items-center gap-6">
          <div className="flex items-center text-white text-xs font-bold tracking-[0.1em] uppercase">
            <BellRing size={16} className="mr-3" />
            <span>OWNER : {profile?.full_name?.split(' ')[0] || 'USER'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={`
          absolute lg:static inset-y-0 left-0 z-30 w-64 bg-[#FCF9F8] border-r border-[#E5E2E1] flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo/Brand Area */}
          <div className="px-6 py-8">
            <div className="flex items-center gap-2 mb-1">
              <svg width="20" height="26" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C12 0 4 8 4 16C4 20.4183 7.58172 24 12 24C16.4183 24 20 20.4183 20 16C20 8 12 0 12 0Z" fill="#D32F2F"/>
                <path d="M12 12C12 12 8 16 8 20C8 22.2091 9.79086 24 12 24C14.2091 24 16 22.2091 16 20C16 16 12 12 12 12Z" fill="#FF8A65"/>
              </svg>
              <h1 className="text-[#18181B] font-black text-3xl tracking-[-0.03em]">
                AgapSense
              </h1>
            </div>
            <p className="text-[#B91C1C] text-[10px] font-bold tracking-[0.1em] uppercase mt-2">
              Smarter detection, faster response
            </p>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium
                    ${isActive 
                      ? 'bg-[#FEE2E2] text-[#B91C1C] font-bold' 
                      : 'text-[#52525B] hover:bg-[#F4F4F5]'}
                  `}
                >
                  <item.icon size={18} className={isActive ? 'text-[#B91C1C]' : 'text-[#52525B]'} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Secondary Navigation */}
          <div className="p-4 border-t border-[#E4E4E7]">
            <NavLink
              to="/account"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-[#52525B] hover:bg-[#F4F4F5] transition-colors text-sm font-medium mb-1"
            >
              <Settings size={18} />
              Settings
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[#52525B] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-8 bg-[#F4F4F5]">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
