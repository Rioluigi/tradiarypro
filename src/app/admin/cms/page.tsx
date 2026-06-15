import { getCMSContent } from '@/lib/cms';
import CMSClient from './CMSClient';

export const dynamic = 'force-dynamic';

export default async function CMSPage() {
  const initialData = await getCMSContent();

  return <CMSClient initialData={initialData} />;
}
