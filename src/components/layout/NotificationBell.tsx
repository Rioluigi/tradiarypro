'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { 
  Bell, 
  Info, 
  Trophy, 
  AlertTriangle, 
  CheckCheck, 
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId?: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      const rect = dropdownRef.current?.getBoundingClientRect();
      if (rect) {
        setDropdownPosition({
          top: rect.bottom + 12,
          right: window.innerWidth - rect.right,
        });
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setDropdownPosition(null);
    }
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const updatePosition = () => {
        const rect = dropdownRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + 12,
            right: window.innerWidth - rect.right,
          });
        }
      };
      
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen]);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            if (newNotif.user_id === userId) {
              setNotifications((prev) => {
                const updated = [newNotif, ...prev];
                return updated.slice(0, 10); // Limit to 10
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            if (updatedNotif.user_id === userId) {
              setNotifications((prev) =>
                prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const oldNotif = payload.old as { id: string };
            setNotifications((prev) => prev.filter((n) => n.id !== oldNotif.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideButton = dropdownRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);
      
      if (!clickedInsideButton && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0 || isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Trophy size={16} className="text-emerald-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <Info size={16} className="text-blue-400" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      style={{ zIndex: isOpen ? 99999 : 50 }}
    >
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className={cn(
          "relative p-2.5 rounded-xl border border-slate-700/50 bg-slate-800/90 backdrop-blur-sm transition-all duration-200 text-slate-400 hover:text-white hover:border-slate-600",
          isOpen && "bg-slate-750 text-white border-slate-650"
        )}
        title="Notifications"
        aria-label="Notifikasi"
      >
        <Bell size={20} className={cn(unreadCount > 0 && "animate-swing origin-top")} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white shadow-lg border border-slate-900 animate-scale-in">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {!mounted ? null : (
        isOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
          <div 
            ref={menuRef}
            className="fixed w-80 md:w-96 rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] overflow-hidden animate-fade-in origin-top-right"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/50">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </h4>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isUpdating}
                  className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-800/40">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <Loader2 size={24} className="text-purple-500 animate-spin" />
                  <span className="text-xs">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800/40 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
                    <Bell size={20} />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">All caught up!</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">You will receive alerts here when trades are recorded or stats update.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    className={cn(
                      "p-4 flex items-start gap-3 transition-colors duration-150 cursor-pointer select-none",
                      notif.is_read 
                        ? "hover:bg-slate-800/30" 
                        : "bg-purple-950/10 hover:bg-purple-950/15 border-l-2 border-purple-500"
                    )}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/30 flex items-center justify-center flex-shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs font-bold truncate", notif.is_read ? "text-slate-200" : "text-white")}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal break-words font-medium">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}
