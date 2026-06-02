'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import {
  listComplaints,
  listContactMessages,
  type ComplaintRow,
  type ContactMessageRow,
} from '@/app/actions/admin-support';
import { ComplaintSlaTimer } from '@/components/admin/complaint-sla-timer';

type DeskTab = 'contact' | 'complaints';

function complaintCardClass(row: ComplaintRow): string {
  const deadline = row.sla_deadline
    ? new Date(row.sla_deadline).getTime()
    : new Date(row.created_at).getTime() + 24 * 3600000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return 'border-red-500/60 bg-red-500/5';
  if (remaining < 2 * 3600000) return 'border-orange-500/60 animate-pulse bg-orange-500/5';
  return '';
}

export function AdminSupportDesk() {
  const [tab, setTab] = useState<DeskTab>('contact');
  const [contacts, setContacts] = useState<ContactMessageRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, comp] = await Promise.all([listContactMessages(), listComplaints()]);
      setContacts(c);
      setComplaints(comp);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Support Desk</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Contact inquiries and formal complaints from the public site.
        </p>
      </div>

      <div className="flex gap-2">
        {(['contact', 'complaints'] as DeskTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === key ? 'bg-brand-500 text-white' : 'bg-white/60 text-neutral-600 dark:bg-black/40'
            }`}
          >
            {key === 'contact' ? 'Contact Inquiries' : 'Complaints'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : tab === 'contact' ? (
        <div className="space-y-3">
          {contacts.map((row) => (
            <article key={row.id} className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{row.name}</p>
                  <p className="text-sm text-neutral-500">{row.email}</p>
                  <p className="mt-1 text-xs text-neutral-400">{new Date(row.created_at).toLocaleString('en-GB')}</p>
                </div>
                <a
                  href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Mail size={14} />
                  Reply via Email
                </a>
              </div>
              <p className="mt-3 font-semibold text-brand-600">{row.subject}</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{row.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((row) => (
            <article key={row.id} className={`glass-card rounded-2xl p-4 ${complaintCardClass(row)}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{row.name}</p>
                  <p className="text-sm text-neutral-500">{row.email}</p>
                  <ComplaintSlaTimer slaDeadline={row.sla_deadline} createdAt={row.created_at} />
                  <p className="mt-1 text-xs">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-800">
                      {row.priority}
                    </span>{' '}
                    · {new Date(row.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <a
                  href={`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`Complaint: ${row.subject}`)}`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Mail size={14} />
                  Reply via Email
                </a>
              </div>
              <p className="mt-3 font-semibold text-brand-600">{row.subject}</p>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                {row.issue_description ?? row.description}
              </p>
              {row.screenshot_url && (
                <a
                  href={row.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.screenshot_url}
                    alt="Complaint screenshot"
                    className="max-h-48 rounded-xl border border-white/40 object-cover"
                  />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
