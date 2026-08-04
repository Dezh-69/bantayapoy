import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, Settings, Cpu, LogOut, Menu, X, Bell, Search, BarChart3, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const mainNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Device Registration', path: '/admin/devices', icon: Cpu },
    { name: 'System Overview', path: '/admin/alerts', icon: BarChart3 },
    { name: 'System Log', path: '/admin/logs', icon: FileText },
  ];

  const secondaryNavItems = [
    { name: 'Settings', path: '/admin/settings/security', icon: Settings },
    { name: 'Logout', path: '#logout', icon: LogOut },
  ];

  return (
    <div className="min-h-screen bg-surface font-sans flex flex-col">
      
      {/* ─── Top Navigation Bar ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#B91C1C] flex items-center justify-between px-8 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {/* Brand */}
        <div className="flex items-center gap-0">
          <span className="text-white font-bold text-[32px] leading-7 tracking-[-0.03em]">
            AgapSense{' '}
          </span>
          <span className="hidden md:inline-block w-px h-4 bg-white/50 mx-4"></span>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Search */}
          <div className="hidden md:block relative">
            <input
              type="text"
              placeholder="Search devices..."
              className="bg-surface-alt rounded-md pl-9 pr-4 py-[7px] text-sm text-text placeholder-text-faint w-64 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[10.5px] h-[10.5px] text-text-faint" />
          </div>

          {/* Notification Bell */}
          <button className="relative p-2">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-primary"></span>
          </button>

          {/* User Avatar */}
          <button className="w-5 h-5 text-white">
            <Users className="w-5 h-5" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1 text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ─── Body (below top nav) ─── */}
      <div className="flex flex-1 pt-[69px]">
        
        {/* ─── Sidebar ─── */}
        <aside className={`
          fixed md:sticky top-[69px] left-0 bottom-0 z-40
          w-64 bg-surface-warm border-r border-border-light
          flex flex-col justify-between overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}>
          <div className="flex flex-col flex-1 pt-6">
            {/* Sidebar Heading */}
            <div className="px-6 pb-0">
              <div className="flex items-center gap-2 mb-1">
                <svg width="20" height="26" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C12 0 4 8 4 16C4 20.4183 7.58172 24 12 24C16.4183 24 20 20.4183 20 16C20 8 12 0 12 0Z" fill="#D32F2F"/>
                  <path d="M12 12C12 12 8 16 8 20C8 22.2091 9.79086 24 12 24C14.2091 24 16 22.2091 16 20C16 16 12 12 12 12Z" fill="#FF8A65"/>
                </svg>
                <h1 className="text-text-heading font-black text-3xl tracking-[-0.03em]">
                  AgapSense
                </h1>
              </div>
              <div className="mt-2">
                <span className="text-primary font-bold text-[10px] leading-[15px] tracking-[0.1em] uppercase">
                  smarter detection, faster response
                </span>
              </div>
            </div>

            {/* Main Nav */}
            <nav className="flex-1 px-3 mt-8 space-y-1">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                      isActive
                        ? 'bg-[rgba(244,161,133,0.27)] text-[#B91C1C]'
                        : 'text-[#52525B] hover:bg-border-light/30 hover:text-text-heading'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>

            {/* Secondary Nav */}
            <div className="px-3 pt-6 pb-6 border-t border-border-light mt-auto">
              {secondaryNavItems.map((item) =>
                item.path === '#logout' ? (
                  <button
                    key={item.name}
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-[#52525B] hover:bg-border-light/30 hover:text-text-heading transition-all duration-200 w-full"
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span>{item.name}</span>
                  </button>
                ) : (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                        isActive
                          ? 'bg-[rgba(244,161,133,0.27)] text-[#B91C1C]'
                          : 'text-[#52525B] hover:bg-border-light/30 hover:text-text-heading'
                      }`
                    }
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              )}
            </div>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="flex-1 min-h-[calc(100vh-69px)] overflow-y-auto flex flex-col">
          <div className={location.pathname === '/admin/map' ? 'flex-1 flex flex-col relative' : 'p-6 md:p-10 flex-1'}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
