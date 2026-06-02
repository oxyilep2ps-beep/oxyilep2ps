'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { listAdminAuditLogs, type AdminAuditLogRow } from '@/app/actions/admin-audit';

export function AdminSystemLogsTab() {
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await listAdminAuditLogs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 pb-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Audit</p>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">System Logs</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Chronological admin audit trail — approvals, kill switch events, broadcasts, and more.
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card flex flex-col items-center rounded-2xl p-10 text-center">
          <ScrollText className="text-brand-500" size={36} />
          <p className="mt-3 text-sm text-neutral-500">No audit entries yet. Admin actions will appear here.</p>
        </div>
      ) : (
        <div className="glass-card max-h-[70vh] overflow-y-auto rounded-2xl divide-y divide-white/30 dark:divide-white/10">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm">
              <p className="text-xs text-neutral-400">{new Date(log.created_at).toLocaleString('en-GB')}</p>
              <p className="mt-1 font-semibold text-brand-600">{log.admin_email}</p>
              <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{log.action_description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
