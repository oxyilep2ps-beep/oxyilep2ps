import { SocialLayerLayout } from '@/lib/auth/social-layer-layout';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <SocialLayerLayout redirectPath="/profile">{children}</SocialLayerLayout>;
}
