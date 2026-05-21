'use client';

import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ChevronDown, Headphones, Mail, MapPin, PhoneCall } from 'lucide-react';
import { Footer } from '@/components/footer';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</section>;
}

const faqs = [
  { q: 'How fast can I get support?', a: 'Our team aims to respond quickly through live chat, email, and phone during business hours.' },
  { q: 'Can I visit the offices?', a: 'Yes. London and Cardiff office addresses are listed below for in-person support and meetings.' },
  { q: 'How does the platform protect users?', a: 'We use KYC, secure transactions, and a compliance-first approach to reduce friction and risk.' },
];

export default function ContactPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [chat, setChat] = useState(false);

  return (
    <Section>
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Support hub</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Contact & Support</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">A direct communication hub with clean support routing, office addresses, FAQs, and a live chat trigger for faster resolution.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: <Headphones size={18} />, title: 'Live support', text: 'Chat with the team instantly during coverage windows.' },
              { icon: <PhoneCall size={18} />, title: 'Phone assistance', text: 'Reach the support desk for urgent platform help.' },
              { icon: <Mail size={18} />, title: 'Email routing', text: 'For general questions, feedback, and account help.' },
              { icon: <MapPin size={18} />, title: 'Physical offices', text: 'London and Cardiff addresses for in-person support.' },
            ].map((item) => (
              <div key={item.title} className="glass-card rounded-[1.8rem] p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{item.icon}</div>
                <p className="mt-4 font-semibold text-slate-950 dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-[2.25rem] p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Get in touch</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Modern contact form</h2>
            </div>
            <button onClick={() => setChat(true)} className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-glow">Live chat</button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input placeholder="Full name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black" />
            <input placeholder="Email address" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black" />
            <input placeholder="Subject" className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black" />
            <textarea rows={5} placeholder="How can we help?" className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-black" />
          </div>
          <button className="mt-5 w-full rounded-full bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-glow">Send message</button>

          <div className="mt-8 border-t border-slate-200/80 pt-6 dark:border-white/5">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white">FAQs</h3>
            <div className="mt-4 space-y-3">
              {faqs.map((faq, index) => (
                <div key={faq.q} className="rounded-[1.4rem] border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-black">
                  <button onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-950 dark:text-white">
                    {faq.q}
                    <ChevronDown className={`transition ${open === index ? 'rotate-180' : ''}`} size={18} />
                  </button>
                  <AnimatePresence>
                    {open === index ? (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="px-5 pb-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{faq.a}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="glass-card rounded-[2rem] p-6">
          <p className="text-lg font-bold text-slate-950 dark:text-white">London Office</p>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Oxyile Ltd, 41 Finsbury Avenue, London, EC2M 2PF, United Kingdom.</p>
        </div>
        <div className="glass-card rounded-[2rem] p-6">
          <p className="text-lg font-bold text-slate-950 dark:text-white">Cardiff Office</p>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Oxyile Cymru, 16 Cathedral Road, Cardiff, CF11 9LJ, United Kingdom.</p>
        </div>
      </div>

      <AnimatePresence>
        {chat ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed bottom-6 right-6 z-50 w-[min(92vw,24rem)] rounded-[1.6rem] border border-brand-200 bg-white p-5 shadow-2xl dark:border-brand-500/20 dark:bg-black">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-950 dark:text-white">Live chat</p>
              <button onClick={() => setChat(false)} className="text-sm text-slate-500">Close</button>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">A support specialist would normally appear here. This placeholder trigger confirms the live chat entry point.</p>
            <button className="mt-4 w-full rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white">Start conversation</button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Footer />
    </Section>
  );
}