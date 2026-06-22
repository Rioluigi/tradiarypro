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
      className="min-h-screen themed-app relative"
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
