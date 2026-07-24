import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function SuspendedAccountPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1a1410] px-6 py-16 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,90,31,0.28),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(80,40,20,0.45),_transparent_50%)]"
      />
      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <Logo className="h-10 w-auto text-white" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#ff5a1f]">Account suspended</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Access temporarily revoked</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Your Oxyile account has been suspended by an administrator. You have been signed out and cannot use the
          platform until access is restored.
        </p>
        <p className="mt-3 text-sm text-white/55">
          If you believe this is a mistake, contact support at{' '}
          <a className="text-[#ff5a1f] underline-offset-2 hover:underline" href="mailto:support@oxyile.com">
            support@oxyile.com
          </a>
          .
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-xl bg-[#ff5a1f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ff6d3a]"
          >
            Back to home
          </Link>
          <Link
            href="/signin"
            className="inline-flex rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Sign in again
          </Link>
        </div>
      </div>
    </main>
  );
}
