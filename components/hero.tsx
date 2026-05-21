'use client';

import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section className="relative isolate w-full max-w-full overflow-x-hidden overflow-hidden px-4 py-20 sm:py-28 lg:py-36">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="section-heading leading-tight font-syne text-5xl sm:text-6xl lg:text-7xl">
              Your financial friend
            </h1>
            <div className="mt-2 relative inline-block">
              <motion.span
                className="text-4xl font-black text-neutral-950 dark:text-white"
                initial={{ y: 0 }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="orange-ring text-amber-600">with </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A1F] to-[#FF814A]">benefits!</span>
              </motion.span>

              <motion.svg
                viewBox="0 0 200 80"
                className="absolute left-0 top-0 -z-10 h-20 w-52 opacity-60"
                initial={{ scale: 0.96, opacity: 0.4 }}
                animate={{ scale: [0.96, 1.04, 0.98], opacity: [0.4, 0.9, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0%" stopColor="#FF814A" />
                    <stop offset="100%" stopColor="#FF5A1F" />
                  </linearGradient>
                </defs>
                <path d="M10 50 C 40 10, 160 10, 190 50" fill="none" stroke="url(#g1)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.95" />
              </motion.svg>
            </div>

            <p className="section-subtitle mt-6 max-w-xl">
              A digital smart-contract platform connecting verified investors and borrowers directly — typical returns ~9–10% for investors while borrowers access fair, fast funding without bank middlemen.
            </p>

            <div className="mt-8 flex gap-4">
              <a href="#calculator" className="rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-6 py-3 text-sm font-semibold text-white shadow-glow">
                Get Started
              </a>
              <a href="#how" className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium dark:border-white/10">
                How it works
              </a>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <motion.div
              className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 sm:p-6 shadow-[0_24px_80px_rgba(17,24,39,0.12)] dark:border-zinc-800 dark:bg-black"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.015, rotateX: 2, rotateY: -2 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-white/40">Interactive P2P Smart Contract Hub</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white sm:text-2xl">Direct capital, direct repayments, zero middleman drag</h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-zinc-800 dark:bg-black dark:text-white/75">
                  Live network
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:relative md:h-[25rem] md:block">
                <div className="pointer-events-none absolute inset-0 hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_18%_18%,rgba(255,90,31,0.16),transparent_28%),radial-gradient(circle_at_78%_22%,rgba(255,129,74,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(255,90,31,0.08),transparent_34%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(255,90,31,0.18),transparent_28%),radial-gradient(circle_at_78%_22%,rgba(255,129,74,0.12),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(255,90,31,0.06),transparent_34%)] md:block" />

                <div className="relative z-10 mb-4 text-center text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
                  UK&apos;S DIRECT LENDING ECOSYSTEM
                </div>

                <div className="pointer-events-none absolute inset-0 z-0">
                  <svg viewBox="0 0 640 420" className="hidden h-full w-full md:block" aria-hidden="true">
                    <defs>
                      <linearGradient id="ambientLineA" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.02" />
                        <stop offset="50%" stopColor="#FF5A1F" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#FF814A" stopOpacity="0.06" />
                      </linearGradient>
                      <linearGradient id="ambientLineB" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FF814A" stopOpacity="0.04" />
                        <stop offset="50%" stopColor="#FF5A1F" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#FF814A" stopOpacity="0.03" />
                      </linearGradient>
                    </defs>

                    <motion.path
                      d="M36 112 C 138 68, 210 88, 286 126 C 360 162, 438 184, 604 126"
                      fill="none"
                      stroke="url(#ambientLineA)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="14 18"
                      initial={{ strokeDashoffset: 0, opacity: 0.25 }}
                      animate={{ strokeDashoffset: [0, -48], opacity: [0.2, 0.45, 0.2] }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.path
                      d="M52 256 C 154 206, 214 232, 286 266 C 360 302, 450 310, 590 238"
                      fill="none"
                      stroke="url(#ambientLineB)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="10 16"
                      initial={{ strokeDashoffset: 0, opacity: 0.2 }}
                      animate={{ strokeDashoffset: [0, 52], opacity: [0.16, 0.38, 0.16] }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.path
                      d="M112 44 C 176 96, 214 142, 242 186 C 282 250, 338 286, 474 336"
                      fill="none"
                      stroke="url(#ambientLineA)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray="6 14"
                      initial={{ strokeDashoffset: 0, opacity: 0.18 }}
                      animate={{ strokeDashoffset: [0, -34], opacity: [0.14, 0.32, 0.14] }}
                      transition={{ duration: 9, repeat: Infinity, ease: 'linear', delay: 0.4 }}
                    />
                  </svg>
                  <svg viewBox="0 0 100 420" className="h-full w-full md:hidden" aria-hidden="true">
                    <defs>
                      <linearGradient id="ambientMobileA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.06" />
                        <stop offset="40%" stopColor="#FF5A1F" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#FF814A" stopOpacity="0.08" />
                      </linearGradient>
                      <linearGradient id="ambientMobileB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF814A" stopOpacity="0.08" />
                        <stop offset="50%" stopColor="#FF5A1F" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#FF814A" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    <motion.path
                      d="M50 8 C 50 68, 50 116, 50 170 C 50 226, 50 284, 50 412"
                      fill="none"
                      stroke="url(#ambientMobileA)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeDasharray="12 18"
                      initial={{ strokeDashoffset: 0, opacity: 0.2 }}
                      animate={{ strokeDashoffset: [0, -44], opacity: [0.16, 0.36, 0.16] }}
                      transition={{ duration: 8.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.path
                      d="M20 206 C 118 166, 182 158, 244 178 C 312 200, 388 214, 620 184"
                      fill="none"
                      stroke="url(#ambientMobileB)"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeDasharray="5 12"
                      initial={{ strokeDashoffset: 0, opacity: 0.16 }}
                      animate={{ strokeDashoffset: [0, 30], opacity: [0.12, 0.3, 0.12] }}
                      transition={{ duration: 11, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                    />
                    <motion.path
                      d="M72 322 C 178 276, 246 260, 318 272 C 388 284, 468 286, 588 266"
                      fill="none"
                      stroke="url(#ambientMobileA)"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeDasharray="7 15"
                      initial={{ strokeDashoffset: 0, opacity: 0.14 }}
                      animate={{ strokeDashoffset: [0, -26], opacity: [0.12, 0.28, 0.12] }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'linear', delay: 0.7 }}
                    />
                    <motion.path
                      d="M28 70 C 40 108, 46 146, 52 188 C 58 230, 64 272, 74 344"
                      fill="none"
                      stroke="url(#ambientMobileB)"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeDasharray="8 14"
                      initial={{ strokeDashoffset: 0, opacity: 0.14 }}
                      animate={{ strokeDashoffset: [0, 34], opacity: [0.12, 0.28, 0.12] }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'linear', delay: 0.2 }}
                    />
                    <motion.path
                      d="M74 52 C 62 96, 56 138, 50 182 C 44 228, 38 272, 28 356"
                      fill="none"
                      stroke="url(#ambientMobileA)"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeDasharray="8 16"
                      initial={{ strokeDashoffset: 0, opacity: 0.14 }}
                      animate={{ strokeDashoffset: [0, -28], opacity: [0.12, 0.26, 0.12] }}
                      transition={{ duration: 11, repeat: Infinity, ease: 'linear', delay: 0.35 }}
                    />
                  </svg>
                </div>

                <div className="relative order-2 h-[28rem] w-full overflow-hidden md:absolute md:inset-0 md:order-none md:h-auto">
                  <svg viewBox="0 0 640 380" className="absolute inset-0 hidden h-full w-full md:block" role="img" aria-label="Interactive P2P smart contract hub">
                  <defs>
                    <linearGradient id="hubOrange" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF5A1F" />
                      <stop offset="100%" stopColor="#FF814A" />
                    </linearGradient>
                    <linearGradient id="hubAmber" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ffb36d" />
                      <stop offset="100%" stopColor="#FF814A" />
                    </linearGradient>
                    <linearGradient id="hubRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#FF814A" stopOpacity="0.65" />
                    </linearGradient>
                  </defs>

                  <g className="dark:opacity-35 opacity-55" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1">
                    <path d="M56 300 H584" />
                    <path d="M56 245 H584" />
                    <path d="M56 190 H584" />
                    <path d="M56 135 H584" />
                    <path d="M56 80 H584" />
                  </g>

                  <motion.path
                    d="M112 120 C 170 140, 206 168, 236 202 C 264 234, 284 262, 306 296"
                    fill="none"
                    stroke="url(#hubOrange)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0.55 }}
                    animate={{ pathLength: [0, 1, 0.9, 1], opacity: [0.55, 1, 0.7, 1] }}
                    transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.path
                    d="M112 270 C 172 248, 212 226, 244 204 C 272 184, 294 160, 314 132"
                    fill="none"
                    stroke="url(#hubAmber)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="8 12"
                    initial={{ pathLength: 0, opacity: 0.35 }}
                    animate={{ pathLength: [0, 1, 0.8, 1], opacity: [0.35, 0.95, 0.5, 0.95] }}
                    transition={{ duration: 6.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                  />
                  <motion.path
                    d="M528 132 C 470 150, 432 176, 402 204 C 374 232, 350 260, 330 294"
                    fill="none"
                    stroke="url(#hubOrange)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0.55 }}
                    animate={{ pathLength: [0, 1, 0.92, 1], opacity: [0.55, 1, 0.75, 1] }}
                    transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                  />
                  <motion.path
                    d="M528 260 C 470 240, 432 220, 400 202 C 374 186, 348 164, 322 134"
                    fill="none"
                    stroke="url(#hubAmber)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="8 12"
                    initial={{ pathLength: 0, opacity: 0.35 }}
                    animate={{ pathLength: [0, 1, 0.84, 1], opacity: [0.35, 0.9, 0.48, 0.9] }}
                    transition={{ duration: 6.9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  />

                  <motion.circle
                    cx="196"
                    cy="148"
                    r="5"
                    fill="#FF814A"
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: [0.5, 1, 0.7], scale: [0.9, 1.25, 1] }}
                    transition={{ duration: 2.9, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.circle
                    cx="218"
                    cy="220"
                    r="4"
                    fill="#FF5A1F"
                    initial={{ opacity: 0.45, scale: 0.9 }}
                    animate={{ opacity: [0.45, 0.95, 0.55], scale: [0.9, 1.2, 0.95] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                  />
                  <motion.circle
                    cx="444"
                    cy="194"
                    r="5"
                    fill="#FF814A"
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: [0.5, 1, 0.7], scale: [0.9, 1.25, 1] }}
                    transition={{ duration: 2.9, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                  />
                  <motion.circle
                    cx="420"
                    cy="238"
                    r="4"
                    fill="#ffb36d"
                    initial={{ opacity: 0.4, scale: 0.9 }}
                    animate={{ opacity: [0.4, 0.92, 0.5], scale: [0.9, 1.18, 1] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                  />

                  <motion.circle
                    cx="320"
                    cy="196"
                    r="52"
                    fill="none"
                    stroke="url(#hubRing)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="190 20"
                    initial={{ rotate: 0, opacity: 0.9 }}
                    animate={{ rotate: 360, opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '320px 196px' }}
                  />
                  <motion.circle
                    cx="320"
                    cy="196"
                    r="34"
                    fill="rgba(255,90,31,0.08)"
                    stroke="rgba(255,129,74,0.45)"
                    strokeWidth="1"
                    initial={{ scale: 0.98, opacity: 0.85 }}
                    animate={{ scale: [0.98, 1.03, 0.98], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  <motion.text
                    x="320"
                    y="189"
                    textAnchor="middle"
                    className="fill-slate-950 dark:fill-white"
                    fontSize="12"
                    fontWeight="700"
                    animate={{ opacity: [0.95, 1, 0.95] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Smart Contract Engine
                  </motion.text>
                  <motion.text
                    x="320"
                    y="208"
                    textAnchor="middle"
                    className="fill-slate-500 dark:fill-white/70"
                    fontSize="11"
                    fontWeight="500"
                    animate={{ opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                  >
                    £ flows verified in real time
                  </motion.text>
                  </svg>

                  <div className="pointer-events-none absolute inset-0 z-0 md:hidden">
                      <svg viewBox="0 0 100 320" className="absolute inset-0 h-full w-full" aria-hidden="true">
                        <defs>
                          <linearGradient id="mobileHubLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.15" />
                            <stop offset="45%" stopColor="#FF5A1F" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#FF814A" stopOpacity="0.15" />
                          </linearGradient>
                          <linearGradient id="mobileHubRing" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#FF814A" stopOpacity="0.75" />
                          </linearGradient>
                        </defs>

                        <motion.path
                          d="M50 22 C 50 62, 50 98, 50 136 C 50 174, 50 214, 50 300"
                          fill="none"
                          stroke="url(#mobileHubLine)"
                          strokeWidth="5.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="12 10"
                          initial={{ pathLength: 0, opacity: 0.45 }}
                          animate={{ pathLength: [0, 1, 0.9, 1], opacity: [0.45, 1, 0.7, 1] }}
                          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                        />

                        <motion.path
                          d="M50 24 C 50 68, 50 104, 50 144 C 50 184, 50 224, 50 298"
                          fill="none"
                          stroke="url(#mobileHubLine)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="3 10"
                          initial={{ pathLength: 0, opacity: 0.25 }}
                          animate={{ pathLength: [0, 1, 0.86, 1], opacity: [0.25, 0.85, 0.45, 0.85] }}
                          transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.18 }}
                        />

                        <motion.circle
                          cx="50"
                          cy="24"
                          r="4.2"
                          fill="#FF5A1F"
                          initial={{ opacity: 0.45, scale: 0.9 }}
                          animate={{ cy: [24, 88, 150, 214, 276, 24], opacity: [0.45, 1, 0.85, 1, 0.85, 0.45], scale: [0.9, 1.2, 1, 1.2, 1, 0.9] }}
                          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.circle
                          cx="50"
                          cy="90"
                          r="3.6"
                          fill="#ffb36d"
                          initial={{ opacity: 0.3, scale: 0.85 }}
                          animate={{ cy: [90, 152, 214, 276, 90], opacity: [0.3, 0.9, 0.55, 0.9, 0.3], scale: [0.85, 1.15, 0.95, 1.1, 0.85] }}
                          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                        />
                        <motion.circle
                          cx="50"
                          cy="156"
                          r="5"
                          fill="#FF814A"
                          initial={{ opacity: 0.4, scale: 0.9 }}
                          animate={{ cy: [156, 220, 282, 156], opacity: [0.4, 1, 0.6, 0.4], scale: [0.9, 1.25, 0.95, 0.9] }}
                          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                        />

                        <motion.circle
                          cx="50"
                          cy="160"
                          r="48"
                          fill="none"
                          stroke="url(#mobileHubRing)"
                          strokeWidth="9"
                          strokeLinecap="round"
                          strokeDasharray="162 20"
                          initial={{ rotate: 0, opacity: 0.9 }}
                          animate={{ rotate: 360, opacity: [0.88, 1, 0.88] }}
                          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                          style={{ transformOrigin: '50px 160px' }}
                        />
                        <motion.circle
                          cx="50"
                          cy="160"
                          r="30"
                          fill="rgba(255,90,31,0.1)"
                          stroke="rgba(255,129,74,0.45)"
                          strokeWidth="1"
                          initial={{ scale: 0.98, opacity: 0.85 }}
                          animate={{ scale: [0.98, 1.04, 0.98], opacity: [0.85, 1, 0.85] }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        />

                        <motion.text
                          x="50"
                          y="155"
                          textAnchor="middle"
                          className="fill-slate-950 dark:fill-white"
                          fontSize="9"
                          fontWeight="700"
                          animate={{ opacity: [0.95, 1, 0.95] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          Smart Contract
                        </motion.text>
                        <motion.text
                          x="50"
                          y="167"
                          textAnchor="middle"
                          className="fill-slate-950 dark:fill-white"
                          fontSize="9"
                          fontWeight="700"
                          animate={{ opacity: [0.95, 1, 0.95] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          Engine
                        </motion.text>
                        <motion.text
                          x="50"
                          y="181"
                          textAnchor="middle"
                          className="fill-slate-500 dark:fill-white/60"
                          fontSize="7.5"
                          fontWeight="500"
                          animate={{ opacity: [0.75, 1, 0.75] }}
                          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                        >
                          £ flows verified
                        </motion.text>
                      </svg>
                  </div>
                </div>

                <motion.div
                    className="relative z-10 static w-full max-w-[380px] rounded-2xl border border-zinc-200/50 bg-white/80 p-5 shadow-lg backdrop-blur-md dark:border-zinc-800/50 dark:bg-black/40 md:absolute md:left-4 md:top-6 md:w-[10.5rem] md:max-w-none md:p-3"
                  animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
                  transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <p className="whitespace-normal break-words text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/45 md:text-[0.65rem] md:tracking-[0.25em]">Verified Investors</p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                        <p className="whitespace-normal break-words text-base font-semibold text-slate-950 dark:text-white md:text-sm">£248k</p>
                        <p className="whitespace-normal break-words text-sm text-slate-500 dark:text-white/65 md:text-xs">Incoming capital</p>
                    </div>
                    <motion.div className="rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-2 py-1 text-[10px] font-semibold text-white" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                      +12.4%
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  className="relative z-10 static w-full max-w-[380px] rounded-[1.5rem] border border-zinc-200/50 bg-white/80 p-5 text-center shadow-[0_18px_50px_rgba(255,90,31,0.12)] backdrop-blur-md dark:border-zinc-800/50 dark:bg-black/40 md:absolute md:left-1/2 md:top-1/2 md:w-[13rem] md:max-w-none md:-translate-x-1/2 md:-translate-y-1/2 md:p-4"
                  animate={{ scale: [1, 1.02, 1], y: [0, -5, 0] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <p className="whitespace-normal break-words text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/45 md:text-[0.65rem] md:tracking-[0.28em]">Middle Hub</p>
                  <div className="mt-4 rounded-full border border-brand-200 bg-brand-500/10 px-4 py-3 text-base font-semibold text-brand-600 dark:border-zinc-800 dark:bg-black/70 dark:text-white md:mt-3 md:px-3 md:py-2 md:text-sm">
                    Direct Yield: 9.2% p.a.
                  </div>
                  <div className="mt-3 rounded-full bg-gradient-to-r from-[#FF5A1F] to-[#FF814A] px-4 py-3 text-sm font-semibold text-white shadow-glow md:px-3 md:py-2 md:text-xs">
                    0% Bank Spread Bypassed
                  </div>
                </motion.div>

                <motion.div
                  className="relative z-10 static w-full max-w-[380px] rounded-2xl border border-zinc-200/50 bg-white/80 p-5 shadow-lg backdrop-blur-md dark:border-zinc-800/50 dark:bg-black/40 md:absolute md:right-4 md:top-6 md:w-[10.5rem] md:max-w-none md:p-3"
                  animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
                  transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                >
                  <p className="whitespace-normal break-words text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/45 md:text-[0.65rem] md:tracking-[0.25em]">Prime Borrowers</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="whitespace-normal break-words text-base font-semibold text-slate-950 dark:text-white md:text-sm">£96k</p>
                      <p className="whitespace-normal break-words text-sm text-slate-500 dark:text-white/65 md:text-xs">Funding allocated</p>
                    </div>
                    <motion.div className="rounded-full bg-black px-2 py-1 text-[10px] font-semibold text-white dark:bg-white dark:text-black" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
                      Live
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute left-5 bottom-5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-zinc-800 dark:bg-black dark:text-white/80"
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  Incoming repayments detected
                </motion.div>
                <motion.div
                  className="absolute right-5 bottom-5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-zinc-800 dark:bg-black dark:text-white/80"
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                >
                  Contract matched in 24h
                </motion.div>

                <motion.div
                  className="pointer-events-none absolute left-[24%] top-[25%] hidden h-2 w-2 rounded-full bg-[#FF5A1F] shadow-[0_0_24px_rgba(255,90,31,0.8)] md:block"
                  animate={{ x: [0, 160, 320, 160, 0], y: [0, 48, 0, -40, 0], opacity: [0.4, 1, 0.9, 1, 0.4] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="pointer-events-none absolute right-[24%] top-[34%] hidden h-2 w-2 rounded-full bg-[#ffb36d] shadow-[0_0_24px_rgba(255,179,109,0.75)] md:block"
                  animate={{ x: [0, -160, -320, -160, 0], y: [0, -40, 0, 42, 0], opacity: [0.4, 1, 0.85, 1, 0.4] }}
                  transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
