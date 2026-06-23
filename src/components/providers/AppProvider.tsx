'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trade } from '@/types/trade';
import { useTheme } from './ThemeProvider';

export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  broker: string;
  platform: 'MT4' | 'MT5';
  balance: number;
  currency: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

interface AppContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  selectedCurrency: 'USD' | 'IDR' | 'EUR';
  setSelectedCurrency: (currency: 'USD' | 'IDR' | 'EUR') => void;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  refreshAccounts: (explicitUserId?: string) => Promise<void>;
  loadingAccounts: boolean;
  activeCurrency: 'USD' | 'IDR' | 'EUR';
  activeCurrencySymbol: string;
  formatCurrency: (value: number) => string;
  filterTrades: (trades: Trade[]) => Trade[];
  isLiveRate: boolean;
  exchangeRates: { IDR: number; EUR: number };
  isAdmin: boolean;
  loadingProfile: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const currencySymbols: Record<string, string> = {
  USD: '$',
  IDR: 'Rp',
  EUR: '€',
};

const currencyLocales: Record<string, string> = {
  USD: 'en-US',
  IDR: 'id-ID',
  EUR: 'de-DE',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Theme State from ThemeProvider
  const { theme, toggleTheme } = useTheme();

  // Account & Currency Selection States
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrencyState] = useState<'USD' | 'IDR' | 'EUR'>('USD');

  // Supabase Accounts State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);

  // Admin Profile State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  const supabase = useMemo(() => createClient(), []);

  // Load theme and preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCurrency = localStorage.getItem('tradiary_selected_currency') as 'USD' | 'IDR' | 'EUR';
      if (savedCurrency) {
        setSelectedCurrencyState(savedCurrency);
      }

      const savedAccountId = localStorage.getItem('tradiary_selected_account_id');
      if (savedAccountId) {
        setSelectedAccountIdState(savedAccountId);
      } else {
        setSelectedAccountIdState('all');
        localStorage.setItem('tradiary_selected_account_id', 'all');
      }
    }
  }, []);

  // Fetch accounts and user profile logic
  const fetchAccountsAndProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setAccounts([]);
      setIsAdmin(false);
      setLoadingAccounts(false);
      setLoadingProfile(false);
      return;
    }

    try {
      setLoadingAccounts(true);
      setLoadingProfile(true);

      // Fetch accounts
      const { data: accData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (accError) throw accError;
      const validAccounts = accData || [];
      setAccounts(validAccounts);

      // Validate selectedAccountId from localStorage
      if (typeof window !== 'undefined') {
        const savedAccountId = localStorage.getItem('tradiary_selected_account_id');
        if (savedAccountId && savedAccountId !== 'all') {
          const exists = validAccounts.some((a) => a.id === savedAccountId);
          if (exists) {
            setSelectedAccountIdState(savedAccountId);
          } else {
            setSelectedAccountIdState('all');
            localStorage.setItem('tradiary_selected_account_id', 'all');
          }
        } else {
          setSelectedAccountIdState('all');
          localStorage.setItem('tradiary_selected_account_id', 'all');
        }
      }

      // Fetch profile role (try/catch to avoid crash if profiles table isn't migrated yet)
      try {
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        
        if (!profError && profile) {
          setIsAdmin(profile.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        console.warn('Profiles table not yet migrated, defaulting to non-admin:', e);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching accounts/profile in AppProvider:', err);
    } finally {
      setLoadingAccounts(false);
      setLoadingProfile(false);
    }
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchAccountsAndProfile(session.user.id);
      } else {
        await fetchAccountsAndProfile(undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, fetchAccountsAndProfile]);

  // Theme synchronization is now handled inside ThemeProvider

  // Set Selected Account
  const setSelectedAccountId = useCallback((id: string) => {
    setSelectedAccountIdState(id);
    localStorage.setItem('tradiary_selected_account_id', id);
  }, []);

  // Set Selected Currency
  const setSelectedCurrency = useCallback((currency: 'USD' | 'IDR' | 'EUR') => {
    setSelectedCurrencyState(currency);
    localStorage.setItem('tradiary_selected_currency', currency);
  }, []);

  // Refresh Accounts
  const refreshAccounts = useCallback(async (explicitUserId?: string) => {
    try {
      let userId = explicitUserId;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      if (!userId) return;

      const { data: accData, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (accError) throw accError;
      const validAccounts = accData || [];
      setAccounts(validAccounts);

      // Validate selectedAccountId from localStorage
      if (typeof window !== 'undefined') {
        const savedAccountId = localStorage.getItem('tradiary_selected_account_id');
        if (savedAccountId && savedAccountId !== 'all') {
          const exists = validAccounts.some((a) => a.id === savedAccountId);
          if (!exists) {
            setSelectedAccountIdState('all');
            localStorage.setItem('tradiary_selected_account_id', 'all');
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing accounts in AppProvider:', err);
    }
  }, [supabase]);

  // Determine active currency
  const activeCurrency = useMemo<'USD' | 'IDR' | 'EUR'>(() => {
    if (selectedAccountId === 'all') {
      return selectedCurrency;
    }
    const matchedAccount = accounts.find((a) => a.id === selectedAccountId);
    if (matchedAccount) {
      // Normalize account currency to our supported values if possible
      const accCurr = matchedAccount.currency.toUpperCase();
      if (accCurr === 'USD' || accCurr === 'IDR' || accCurr === 'EUR') {
        return accCurr;
      }
    }
    return 'USD'; // Default fallback
  }, [selectedAccountId, selectedCurrency, accounts]);

  // Exchange Rates State
  const [exchangeRates, setExchangeRates] = useState<{ IDR: number; EUR: number }>({
    IDR: 16000,
    EUR: 0.92,
  });
  const [isLiveRate, setIsLiveRate] = useState<boolean>(false);

  // Fetch exchange rates from free API on load and set 1h refresh interval
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        if (data.result === 'success' && data.rates) {
          const idr = data.rates.IDR;
          const eur = data.rates.EUR;
          if (idr && eur) {
            setExchangeRates({ IDR: idr, EUR: eur });
            setIsLiveRate(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch live exchange rates, using fallbacks:', err);
        setIsLiveRate(false);
      }
    };

    fetchRates();

    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const activeCurrencySymbol = useMemo(() => {
    return currencySymbols[activeCurrency] || '$';
  }, [activeCurrency]);

  // Dynamic currency formatting function with real-time conversion
  const formatCurrency = useCallback((value: number): string => {
    const prefix = value >= 0 ? '+' : '-';
    const absValue = Math.abs(value);
    const locale = currencyLocales[activeCurrency] || 'en-US';
    const symbol = currencySymbols[activeCurrency] || '$';

    // Apply conversion rates based on active currency
    let convertedValue = absValue;
    if (activeCurrency === 'IDR') {
      convertedValue = absValue * exchangeRates.IDR;
    } else if (activeCurrency === 'EUR') {
      convertedValue = absValue * exchangeRates.EUR;
    }

    const formatted = convertedValue.toLocaleString(locale, {
      minimumFractionDigits: activeCurrency === 'IDR' ? 0 : 2,
      maximumFractionDigits: 2,
    });

    return `${prefix}${symbol}${formatted}`;
  }, [activeCurrency, exchangeRates]);

  // Helper to filter trades array by current selected account
  const filterTrades = useCallback((trades: Trade[]): Trade[] => {
    if (selectedAccountId === 'all') return trades;
    return trades.filter((t) => t.account_id === selectedAccountId);
  }, [selectedAccountId]);

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    selectedAccountId,
    setSelectedAccountId,
    selectedCurrency,
    setSelectedCurrency,
    accounts,
    setAccounts,
    refreshAccounts,
    loadingAccounts,
    activeCurrency,
    activeCurrencySymbol,
    formatCurrency,
    filterTrades,
    isLiveRate,
    exchangeRates,
    isAdmin,
    loadingProfile,
  }), [
    theme,
    toggleTheme,
    selectedAccountId,
    setSelectedAccountId,
    selectedCurrency,
    setSelectedCurrency,
    accounts,
    refreshAccounts,
    loadingAccounts,
    activeCurrency,
    activeCurrencySymbol,
    formatCurrency,
    filterTrades,
    isLiveRate,
    exchangeRates,
    isAdmin,
    loadingProfile,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useCurrency must be used within an AppProvider');
  }
  return context;
}
