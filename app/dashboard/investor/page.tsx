'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function InvestorDashboardPage() {
  const [name, setName] = useState('Investor');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('full_legal_name')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.full_legal_name) setName(data.full_legal_name);
          });
      }
    });
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Investor</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-950 dark:text-white sm:text-4xl">
          Welcome back, {name.split(' ')[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-600 dark:text-neutral-300">
          Your account is verified. Browse opportunities, manage mandates, and track returns from your Oxyile investor hub.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {[
          { icon: Wallet, title: 'Portfolio', desc: 'View active P2P allocations and upcoming repayments.' },
          { icon: TrendingUp, title: 'Opportunities', desc: 'Discover verified borrower listings matched to your risk profile.' },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <card.icon className="text-brand-500" size={28} />
            <h2 className="mt-4 text-lg font-bold text-neutral-950 dark:text-white">{card.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{card.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
