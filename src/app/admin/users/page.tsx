'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Search,
  Shield,
  ShieldAlert,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  subscription_plan: 'free' | 'pro' | 'enterprise' | null;
}

export default function ManageUsers() {
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tradeCounts, setTradeCounts] = useState<{ [userId: string]: number }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [emailLoadingId, setEmailLoadingId] = useState<string | null>(null);

  // Server-side Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSendSummary = async (profile: Profile) => {
    try {
      setEmailLoadingId(profile.id);
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          email: profile.email,
          type: 'summary',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim email rangkuman');

      alert(`Sukses: Email rangkuman mingguan berhasil dikirim ke ${profile.email}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('Error sending summary email:', err);
      alert(`Gagal mengirim email: ${errMsg}`);
    } finally {
      setEmailLoadingId(null);
    }
  };

  // Load user data with server-side pagination
  const loadData = useCallback(async (page: number, search: string, isInitial: boolean = false) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 seconds timeout fallback

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }
      setError(null);

      // Get logged in user ID for safety check (only on initial load)
      if (isInitial) {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (user) {
          setCurrentUserId(user.id);
        }
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
      });
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      setProfiles(data.profiles || []);
      setTradeCounts(data.tradeCounts || {});
      setTotalCount(data.totalCount || 0);
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      let errMsg = 'Failed to load user management data';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errMsg = 'Request timed out after 15 seconds. Please refresh the page.';
        } else {
          errMsg = err.message;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [supabase]);

  // Initial load
  useEffect(() => {
    loadData(1, '', true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch when page or debounced search changes (skip initial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadData(currentPage, debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  // Handle page change
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  // Handle role promote/demote toggle using secure API route
  const toggleRole = async (profile: Profile) => {
    if (profile.id === currentUserId) return; // Prevent self demotion
    
    try {
      setActionLoadingId(profile.id);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: profile.id,
          action: 'toggle-role',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role');

      const nextRole = profile.role === 'admin' ? 'user' : 'admin';
      
      // Update local state
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, role: nextRole } : p))
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Role Update Error: ${errMsg}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle block/unblock account toggle using secure API route
  const toggleActive = async (profile: Profile) => {
    if (profile.id === currentUserId) return; // Prevent self blocking
    
    try {
      setActionLoadingId(profile.id);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: profile.id,
          action: 'toggle-active',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      const nextActive = !profile.is_active;

      // Update local state
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, is_active: nextActive } : p))
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Block/Unblock Update Error: ${errMsg}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading user directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-semibold text-white">Migration Error or Permission Issue</h2>
        <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
        <button
          onClick={() => {
            setError(null);
            loadData(currentPage, debouncedSearch, true);
          }}
          className="mt-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-semibold hover:bg-purple-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Manage Users
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Promote user privileges, suspend user accounts, and review subscription plans
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl relative">
        {/* Page transition loading overlay */}
        {pageLoading && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-900/80">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Trades</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => {
                  const isSelf = profile.id === currentUserId;
                  const count = tradeCounts[profile.id] || 0;
                  const isActionLoading = actionLoadingId === profile.id;

                  return (
                    <tr
                      key={profile.id}
                      className="hover:bg-slate-800/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-200">
                            {profile.email}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] text-purple-400 font-semibold mt-0.5 animate-pulse">
                              (You / Logged-in Admin)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(profile.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                          profile.subscription_plan === 'enterprise'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : profile.subscription_plan === 'pro'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {profile.subscription_plan || 'free'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-350">
                        {count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            profile.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Shield size={12} />
                          {profile.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            profile.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {profile.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Trades Link */}
                          <Link
                            href={`/admin/trades?email=${profile.email}`}
                            title="Monitor user trades"
                            aria-label="Monitor transaksi pengguna"
                            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-all duration-200"
                          >
                            <Eye size={14} />
                          </Link>

                          {/* Send Summary Button */}
                          <button
                            onClick={() => handleSendSummary(profile)}
                            disabled={emailLoadingId === profile.id || isActionLoading}
                            title="Send Summary Email"
                            aria-label="Kirim email ringkasan"
                            className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-all duration-200"
                          >
                            {emailLoadingId === profile.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Mail size={14} />
                            )}
                          </button>

                          {/* Role Toggle Button */}
                          <button
                            onClick={() => toggleRole(profile)}
                            disabled={isSelf || isActionLoading}
                            title={isSelf ? "You cannot demote yourself" : "Change User Role"}
                            aria-label={isSelf ? "Anda tidak dapat menurunkan peran Anda sendiri" : "Ubah peran pengguna"}
                            className={`p-2 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-650'
                                : 'bg-slate-800/50 border-slate-700/50 hover:border-purple-500/40 text-purple-400 hover:bg-purple-500/10'
                            }`}
                          >
                            {profile.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>

                          {/* Block/Unblock Button */}
                          <button
                            onClick={() => toggleActive(profile)}
                            disabled={isSelf || isActionLoading}
                            title={isSelf ? "You cannot block yourself" : profile.is_active ? "Block Account" : "Unblock Account"}
                            aria-label={isSelf ? "Anda tidak dapat memblokir diri sendiri" : profile.is_active ? "Blokir akun" : "Buka blokir akun"}
                            className={`p-2 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center min-w-[70px] ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-650'
                                : profile.is_active
                                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30'
                            }`}
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : profile.is_active ? (
                              'Block'
                            ) : (
                              'Unblock'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-850 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing Page {currentPage} of {totalPages} ({totalCount} total users)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1 || pageLoading}
                onClick={() => goToPage(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/50 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} className="inline mr-1" />
                Previous
              </button>
              <button
                disabled={currentPage === totalPages || pageLoading}
                onClick={() => goToPage(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/50 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={14} className="inline ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
