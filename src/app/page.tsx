import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingClient from './LandingClient';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  // Fetch pricing or page CMS configurations from 'cms_content' safely
  let cmsContent: Record<string, unknown>[] = [];
  try {
    const { data } = await supabase.from('cms_content').select('*');
    if (data) {
      cmsContent = data as Record<string, unknown>[];
    }
  } catch {
    // Fail silently, LandingClient handles fallback pricing data
  }

  return <LandingClient cmsContent={cmsContent} />;
}
