'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  History,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  X,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { useCurrency } from '@/components/providers/AppProvider';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  {
    label: 'Admin Overview',
    href: '/admin',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Manage Users',
    href: '/admin/users',
    icon: <Users size={20} />,
  },
  {
    label: 'Monitor Trades',
    href: '/admin/trades',
    icon: <History size={20} />,
  },
  {
    label: 'CMS Editor',
    href: '/admin/cms',
    icon: <BookOpen size={20} />,
  },
];

interface AdminSidebarProps {
  userEmail?: string;
}

export default function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useCurrency();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      setIsSigningOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo / Title */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-slate-700/50">
        <div 
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white"
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: '0 4px 12px var(--accent-glow)',
          }}
        >
          <Shield size={20} />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Tradiary Admin
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
              Management Portal
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {adminNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent',
                active
                  ? 'shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80',
                collapsed && 'justify-center'
              )}
              style={active ? {
                backgroundColor: 'var(--accent-dim)',
                color: 'var(--accent)',
                borderColor: 'var(--accent-border)',
                boxShadow: '0 1px 2px var(--accent-glow)',
              } : undefined}
              title={collapsed ? item.label : undefined}
            >
              <span style={active ? { color: 'var(--accent)' } : undefined}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && (
                <div 
                  className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse-glow" 
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-slate-700/50" />

        {/* Return to Dashboard */}
        <button
          onClick={() => {
            router.push('/dashboard');
            setMobileOpen(false);
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent',
            'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Back to Dashboard' : undefined}
        >
          <BookOpen size={20} />
          {!collapsed && <span>Back to Dashboard</span>}
        </button>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-700/50 px-3 py-4 space-y-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
            'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all duration-200',
            collapsed && 'justify-center'
          )}
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>
 
        {/* User info */}
        {!collapsed && userEmail && (
          <div className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
            <p className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">
              Admin User
            </p>
            <p className="text-xs text-slate-300 mt-0.5 truncate">
              {userEmail}
            </p>
          </div>
        )}

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
            'text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          {isSigningOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogOut size={20} />
          )}
          {!collapsed && (
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-40 h-screen w-64 bg-[#0d0d1a] border-r border-slate-700/50 flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 z-40 h-screen flex-col border-r border-slate-700/50',
          'bg-[#0d0d1a]',
          'transition-all duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {sidebarContent}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 shadow-lg"
        >
          {collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>
      </aside>
    </>
  );
}
