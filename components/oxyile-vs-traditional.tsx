'use client';

import { motion } from 'framer-motion';

export function OxyileVsTraditional() {
  return (
    <section id="showdown" className="py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="section-heading">Oxyile vs Traditional Lenders</h2>
          <p className="section-subtitle mx-auto mt-4">A gamified showdown — left side shows outdated bankers, right side shows Oxyile&apos;s fast, transparent approach.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <motion.div whileHover={{ y: -6 }} className="rounded-2xl border border-white/6 bg-neutral-100 p-6 dark:bg-black dark:border-white/8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">Traditional Lenders</h3>
              <span className="text-sm text-red-500 font-semibold">Slow · Paperwork</span>
            </div>

            <ul className="mt-6 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-400" />Hidden processing fees and spreads</li>
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-400" />Lengthy approval cycles (days to weeks)</li>
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-400" />Automated rejections and opaque scoring</li>
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-400" />Low investor yields (3–4%)</li>
            </ul>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Average investor yield</p>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <div className="h-3 rounded-full bg-gradient-to-r from-gray-400 to-red-500" style={{ width: '22%' }} />
                </div>
              </div>

              <div className="w-28 text-right">
                <p className="text-sm font-bold">3–4%</p>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -6 }} className="rounded-2xl border border-white/6 bg-white p-6 dark:bg-black dark:border-white/6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Oxyile Platform</h3>
              <span className="text-sm font-semibold text-amber-500">Fast · Transparent</span>
            </div>

            <ul className="mt-6 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" />No hidden spreads — full return to investors</li>
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" />Approvals in hours with automated matching</li>
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" />Peer-negotiated rates and human support</li>
              <li className="flex items-start gap-3"><span className="mt-1 inline-block h-2 w-2 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]" />Investor yields ~9–10%</li>
            </ul>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Projected investor yield</p>
                <div className="mt-2 h-3 w-full rounded-full bg-white/60 dark:bg-transparent">
                  <div className="h-3 rounded-full bg-[linear-gradient(90deg,#FF5A1F,_#FF814A)]" style={{ width: '60%' }} />
                </div>
              </div>

              <div className="w-28 text-right">
                <p className="text-sm font-bold">9–10%</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="rounded-md bg-black/90 px-3 py-2 text-xs text-white">Transparent Fees</div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Human Support</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default OxyileVsTraditional;
