import { redirect } from 'next/navigation';

/** Social Studio has moved out of the Blogger Portal. */
export default function BloggerSocialStudioRedirect() {
  redirect('/blogger');
}
