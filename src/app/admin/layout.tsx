import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminBottomNavigation from '@/components/layout/AdminBottomNavigation';
import NotificationBell from '@/components/layout/NotificationBell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div 
      className="min-h-screen text-slate-100 selection:bg-purple-500/30 selection:text-purple-200 themed-app relative"
      style={{
        backgroundColor: '#0d0d1a',
        // Inline variable overrides to control themed-app children styles dynamically
        '--bg-primary': '#0d0d1a',
        '--bg-card': '#121226',
        '--border': 'rgba(124, 58, 237, 0.15)',
        '--accent': '#7c3aed',
        '--accent-dim': 'rgba(124, 58, 237, 0.1)',
        '--accent-border': 'rgba(124, 58, 237, 0.3)',
        '--accent-glow': 'rgba(124, 58, 237, 0.2)',
      } as React.CSSProperties}
    >
      <AdminSidebar userEmail={user?.email} />

      {/* Floating Notification Bell */}
      <div className="fixed top-4 right-4 z-40">
        <NotificationBell userId={user?.id} />
      </div>

      {/* Main content area */}
      <main className="lg:pl-64 transition-all duration-300">
        <div className="min-h-screen p-4 pt-16 pb-24 lg:pt-4 lg:p-8">
          {children}
        </div>
      </main>

      <AdminBottomNavigation />
    </div>
  );
}
