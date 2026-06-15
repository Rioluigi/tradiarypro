import { getCMSContent } from '@/lib/cms';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const cmsData = await getCMSContent();

  return <LoginClient cmsData={cmsData} />;
}
