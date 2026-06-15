'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  History,
  BarChart3,
  Calendar,
  Calculator,
  Settings,
} from 'lucide-react';

interface BottomNavigationProps {
  isAdmin?: boolean;
}

export default function BottomNavigation({}: BottomNavigationProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: 'History',
      href: '/dashboard/history',
      icon: <History size={20} />,
    },
    {
      label: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart3 size={20} />,
    },
    {
      label: 'Calculator',
      href: '/dashboard/calculator',
      icon: <Calculator size={20} />,
    },
    {
      label: 'Calendar',
      href: '/dashboard/calendar',
      icon: <Calendar size={20} />,
    },
    {
      label: 'Setting',
      href: '/dashboard/config',
      icon: <Settings size={20} />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/85 backdrop-blur-lg border-t border-slate-800/80 px-4 py-2 flex items-center justify-around pb-safe-bottom select-none">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl gap-1 transition-all duration-200',
              active ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            )}
            style={active ? { color: 'var(--accent)' } : undefined}
          >
            <div className={cn('transition-transform duration-200', active && 'scale-110')}>
              {item.icon}
            </div>
            <span className="text-[10px] tracking-wide">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
