import { Logo } from '@/components/logo';
import { footerColumns } from '@/lib/content';
import { SOCIAL_LINKS, supportMailto } from '@/lib/social-links';
import { Instagram, Linkedin, Mail, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Logo size="lg" />
            <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600 dark:text-neutral-300">
              Oxyile connects verified borrowers and investors through a transparent, flexible, and fair peer-to-peer lending experience across the UK.
              <br />
              112, Dogfield Street, Cardiff CF24 4QN
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-neutral-500 dark:text-neutral-400">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Oxyile on Instagram"
                className="rounded-full border border-slate-200 p-3 transition hover:border-brand-200 hover:text-brand-500 dark:border-white/10"
              >
                <Instagram size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Oxyile on LinkedIn"
                className="rounded-full border border-slate-200 p-3 transition hover:border-brand-200 hover:text-brand-500 dark:border-white/10"
              >
                <Linkedin size={18} />
              </a>
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Oxyile on X (Twitter)"
                className="rounded-full border border-slate-200 p-3 transition hover:border-brand-200 hover:text-brand-500 dark:border-white/10"
              >
                <Twitter size={18} />
              </a>
              <a
                href={supportMailto}
                aria-label="Oxyile support email"
                className="rounded-full border border-slate-200 p-3 transition hover:border-brand-200 hover:text-brand-500 dark:border-white/10"
              >
                <Mail size={18} />
              </a>
            </div>
            <a
              href={supportMailto}
              className="mt-3 inline-block text-sm text-brand-600 transition hover:text-brand-500 dark:text-brand-300"
            >
              {SOCIAL_LINKS.supportEmail}
            </a>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-950 dark:text-white">{column.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                  {column.links.map((item) => (
                    <li key={item}>
                      <a href="#" className="transition hover:text-brand-500">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-3 border-t border-neutral-200/80 pt-6 text-xs leading-6 text-neutral-500 dark:border-white/10 dark:text-neutral-400 md:grid-cols-2">
          <p>© 2026 Oxyile. All rights reserved.</p>
          <p>Regulatory footnotes: FCA authorisation application in progress. Capital at risk. Not financial advice.</p>
        </div>
      </div>
    </footer>
  );
}
