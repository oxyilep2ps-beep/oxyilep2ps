import { TERMINAL_COMMAND_GUIDE } from '@/lib/admin/terminal-commands';

export function AdminTerminalCommandGuide() {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-[#111]/90">
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F97316]">Developer docs</p>
        <h2 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Terminal Command Guide</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Commands available in the admin Live Webhook Terminal. Open it from the bottom-left FAB, then press Enter to run.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-black/40 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3">Command</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {TERMINAL_COMMAND_GUIDE.map((item) => (
              <tr key={item.command} className="border-b border-gray-100 last:border-0 dark:border-gray-800/80">
                <td className="px-5 py-3 font-mono text-[#F97316]">{item.command}</td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{item.description}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      item.status === 'Active'
                        ? 'rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400'
                        : 'rounded-full bg-[#F97316]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#F97316]'
                    }
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
