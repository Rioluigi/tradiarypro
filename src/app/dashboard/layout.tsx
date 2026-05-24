import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar userEmail={user?.email} />

      {/* Main content area */}
      <main className="lg:pl-64 transition-all duration-300">
        <div className="min-h-screen p-4 pt-16 lg:pt-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
