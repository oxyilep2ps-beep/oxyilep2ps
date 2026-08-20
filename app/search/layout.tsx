import { SocialLayerLayout } from '@/lib/auth/social-layer-layout';

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <SocialLayerLayout redirectPath="/search">{children}</SocialLayerLayout>;
}
