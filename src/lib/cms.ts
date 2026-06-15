import { createClient } from '@/lib/supabase/server';
import { CMSData, cmsDefaults } from '@/types/cms';

export async function getCMSContent(): Promise<CMSData> {
  const supabase = createClient();
  const cmsMap = { ...cmsDefaults };

  try {
    const { data, error } = await supabase.from('cms_content').select('key, value');
    if (!error && data) {
      data.forEach((row) => {
        if (row.key in cmsMap) {
          cmsMap[row.key as keyof CMSData] = row.value;
        }
      });
    }
  } catch (err) {
    console.warn('[CMS Helper] Failed to fetch cms_content from Supabase, using defaults:', err);
  }

  return cmsMap;
}
