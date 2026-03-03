import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ClipboardList, LayoutDashboard, Home, Users, LogOut, Activity, Lightbulb, Menu, X, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { path: '/', label: 'Home', icon: Home },
        { path: '/dashboard', label: 'My Feedback', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Actions',
      items: [
        { path: '/self-assessment', label: 'Self-Assessment', icon: UserCheck },
        { path: '/give-feedback', label: 'Give Feedback', icon: ClipboardList },
        { path: '/pulse-check', label: 'Pulse Check', icon: Activity },
      ]
    }
  ];

  if (user?.is_admin) {
    navGroups.push({
      title: 'Admin',
      items: [
        { path: '/admin', label: 'User Management', icon: Users },
        { path: '/shower-thoughts', label: 'Shower Thoughts', icon: Lightbulb },
      ]
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 mr-2 text-stone-500 hover:text-stone-900 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-xl font-black tracking-tight text-red-700">Marlow360</span>
        </div>
        <div className="flex items-center space-x-2">
          <NotificationCenter placement="bottom-right" />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-stone-900/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-stone-200 transition-all duration-300 flex flex-col",
          // Mobile positioning
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop width
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64",
          "w-64" // Mobile width
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-stone-200 flex-shrink-0">
          <div className={cn("flex items-center overflow-hidden", isSidebarCollapsed ? "lg:hidden" : "")}>
            <span className="text-xl font-black tracking-tight text-red-700 whitespace-nowrap">Marlow360</span>
          </div>
          {isSidebarCollapsed && (
            <div className="hidden lg:flex w-full justify-center">
              <span className="text-xl font-black tracking-tight text-red-700">G</span>
            </div>
          )}
          
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-stone-500 hover:text-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-hide">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isSidebarCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
              )}
              {isSidebarCollapsed && groupIdx > 0 && (
                <div className="mx-3 my-4 border-t border-stone-200" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                      isActive
                        ? "bg-red-50 text-red-700 font-semibold"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 font-medium"
                    )}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-red-600 rounded-r-md" />
                    )}
                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-colors", 
                      isActive ? "text-red-600" : "text-stone-400 group-hover:text-stone-600"
                    )} />
                    <span className={cn(
                      "ml-3 whitespace-nowrap transition-all duration-200",
                      isSidebarCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile & Actions */}
        {user && (
          <div className="p-4 border-t border-stone-200 flex-shrink-0 bg-white">
            {!isSidebarCollapsed && (
               <div className="mb-3 flex items-center justify-between px-2">
                 <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Account</span>
                 <div className="hidden lg:block">
                   <NotificationCenter placement="top-center" />
                 </div>
               </div>
            )}
            {isSidebarCollapsed && (
               <div className="mb-3 flex justify-center">
                 <NotificationCenter placement="right-bottom" />
               </div>
            )}
            
            <div className={cn(
              "flex items-center bg-stone-50 rounded-xl p-2 border border-stone-100",
              isSidebarCollapsed ? "lg:justify-center" : "justify-between"
            )}>
              <div className={cn(
                "flex flex-col overflow-hidden px-2",
                isSidebarCollapsed ? "lg:hidden" : ""
              )}>
                <span className="text-sm font-bold text-stone-900 truncate">{user.name}</span>
                <span className="text-xs text-stone-500 truncate">{user.role}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className={cn(
                  "p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors",
                  isSidebarCollapsed ? "" : "ml-1"
                )}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Collapse Toggle Button (Desktop only) */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 bg-white border border-stone-200 rounded-full p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-50 shadow-sm z-50"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 flex flex-col",
          "pt-16 lg:pt-0", // Add top padding on mobile for the fixed header
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
