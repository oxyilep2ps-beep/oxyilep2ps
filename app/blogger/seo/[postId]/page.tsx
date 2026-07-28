import { notFound } from 'next/navigation';
import { getSeoBlogPost } from '@/app/actions/blogger-seo';
import { BloggerSeoStudio } from '@/components/blogger/blogger-seo-studio';

type Props = { params: Promise<{ postId: string }> };

export default async function BloggerSeoStudioPage({ params }: Props) {
  const { postId } = await params;
  const post = await getSeoBlogPost(postId);
  if (!post) notFound();
  return <BloggerSeoStudio initialPost={post} />;
}
