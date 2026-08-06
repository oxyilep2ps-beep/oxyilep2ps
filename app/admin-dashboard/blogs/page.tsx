import { AdminBlogCmsTab } from '@/components/admin/admin-blog-cms-tab';
import { AdminMarkNotificationsRead } from '@/components/admin/admin-mark-notifications-read';

export default function AdminBlogsPage() {
  return (
    <>
      <AdminMarkNotificationsRead entityType="blog_post" />
      <AdminBlogCmsTab />
    </>
  );
}
