import { redirect } from 'next/navigation';

/** Legacy careers list — ATS lives at /hr/recruitment */
export default function HrCareersRedirect() {
  redirect('/hr/recruitment');
}
