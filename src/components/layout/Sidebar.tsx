'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  History,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: 'Trade History',
    href: '/dashboard/history',
    icon: <History size={20} />,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: <BarChart3 size={20} />,
  },
  {
    label: 'Webhook Config',
    href: '/dashboard/config',
    icon: <Settings size={20} />,
  },
];

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-slate-700/50">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <TrendingUp size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Tradiary
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
              Trading Journal
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setMobileOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn(active && 'text-blue-400')}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-glow" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-slate-700/50 px-3 py-4 space-y-3">
        {/* User info */}
        {!collapsed && userEmail && (
          <div className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              Account
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
          <LogOut size={20} />
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
          'lg:hidden fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 z-40 h-screen flex-col border-r border-slate-700/50',
          'bg-slate-900/80 backdrop-blur-xl',
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
