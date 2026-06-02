'use client';

import { Instagram, Linkedin, Mail, Twitter } from 'lucide-react';
import { openOliverWidget } from '@/components/oliver/oliver-bot';
import { SOCIAL_LINKS, supportMailto } from '@/lib/social-links';

export function OliverBotFooter() {

  return (
    <footer className="mt-16 border-t border-white/6 bg-white dark:bg-black dark:border-white/6">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h4 className="text-sm font-semibold">Oxyile</h4>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Head Office: 112, Dogfield Street, Cardiff CF24 4QN
              <br />
              oxyilemoneyquest.support@gmail.com
            </p>
            <div className="mt-4 flex gap-2">
              <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-neutral-600 transition hover:border-brand-500 hover:text-brand-500 dark:text-neutral-300">
                <Twitter size={16} />
              </a>
              <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-neutral-600 transition hover:border-brand-500 hover:text-brand-500 dark:text-neutral-300">
                <Linkedin size={16} />
              </a>
              <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-neutral-600 transition hover:border-brand-500 hover:text-brand-500 dark:text-neutral-300">
                <Instagram size={16} />
              </a>
              <a href={supportMailto} aria-label="Support email" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-neutral-600 transition hover:border-brand-500 hover:text-brand-500 dark:text-neutral-300">
                <Mail size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-2 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li><a href="#how" className="hover:underline">How it Works</a></li>
              <li><a href="#blog" className="hover:underline">Blogs</a></li>
              <li><a href="#careers" className="hover:underline">Careers</a></li>
              <li><a href="#security" className="hover:underline">Security</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Legal & Support</h4>
            <ul className="mt-2 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li><a href="#" className="hover:underline">Terms of Service</a></li>
              <li><a href="#" className="hover:underline">Privacy Policy</a></li>
              <li><a href="/raise-complaint" className="hover:underline">Complaints</a></li>
              <li><a href="#support" className="hover:underline">Help Center</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex items-start justify-between gap-4 border-t border-white/6 pt-6">
          <div className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">Oxyile is registered in the United Kingdom. FCA authorisation application in progress. Companies House No. 16642382 · SEIS Eligible Platform | Lending and investment carry risk. Capital at risk.</div>

          <div className="w-64 text-right">
            <div className="rounded border border-white/6 bg-neutral-50 p-3 text-xs dark:bg-black">Important Risk Warning: Capital at risk. Peer-to-peer lending is not covered by the Financial Services Compensation Scheme (FSCS)... We recommend that P2P lending should not exceed 10% of your overall investment portfolio.</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="inline-block h-6 w-6 rounded-full bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A]" />
            <span>FinTech Wales</span>
            <span className="inline-block h-6 w-6 rounded-full bg-neutral-700" />
            <span>FCA Pending</span>
            <span className="inline-block h-6 w-6 rounded-full bg-neutral-600" />
            <span>UK GDPR</span>
            <span className="inline-block h-6 w-auto rounded-full bg-gradient-to-tr from-[#FF5A1F] to-[#FF814A] px-3 py-1 text-xs font-semibold text-white">SEIS Approved</span>
          </div>

          <div>
            <button
              type="button"
              onClick={() => openOliverWidget()}
              className="rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-4 py-2 text-sm font-semibold text-white shadow-glow"
            >
              Need Help?
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default OliverBotFooter;
