'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  History,
  BookOpen,
} from 'lucide-react';

export default function AdminBottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Overview',
      href: '/admin',
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: <Users size={20} />,
    },
    {
      label: 'Trades',
      href: '/admin/trades',
      icon: <History size={20} />,
    },
    {
      label: 'CMS',
      href: '/admin/cms',
      icon: <BookOpen size={20} />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d1a]/90 backdrop-blur-lg border-t border-purple-500/15 px-4 py-2 flex items-center justify-around pb-safe-bottom select-none">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-3 rounded-xl gap-1 transition-all duration-200',
              active ? 'text-purple-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            )}
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
