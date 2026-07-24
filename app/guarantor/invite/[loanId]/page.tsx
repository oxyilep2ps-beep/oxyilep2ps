import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ loanId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Legacy invite URLs redirect to the canonical review route. */
export default async function GuarantorInviteRedirect({ params, searchParams }: Props) {
  const { loanId } = await params;
  const query = await searchParams;
  const url = new URLSearchParams();
  for (const key of ['email', 'token', 'issuedAt', 'status'] as const) {
    const value = firstValue(query[key]).trim();
    if (value) url.set(key, value);
  }
  const qs = url.toString();
  redirect(`/guarantor/review/${encodeURIComponent(loanId)}${qs ? `?${qs}` : ''}`);
}
