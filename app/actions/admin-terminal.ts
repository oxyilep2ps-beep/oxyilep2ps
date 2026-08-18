'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTerminalHelp } from '@/lib/admin/terminal-commands';

export type TerminalCommandResult = {
  lines: string[];
};

export async function runTerminalCommand(raw: string): Promise<TerminalCommandResult> {
  await assertAdmin();
  const command = raw.trim().split(/\s+/)[0]?.toLowerCase() ?? '';

  if (command === '/ping') {
    return { lines: ['Pong! Server is active.'] };
  }

  if (command === '/help') {
    return { lines: formatTerminalHelp() };
  }

  if (command === '/stats') {
    const admin = createAdminClient();
    const [applications, postings] = await Promise.all([
      admin.from('job_applications').select('id', { count: 'exact', head: true }),
      admin.from('job_postings').select('id', { count: 'exact', head: true }),
    ]);

    if (applications.error || postings.error) {
      return {
        lines: [
          `Failed to fetch stats: ${applications.error?.message || postings.error?.message || 'unknown error'}`,
        ],
      };
    }

    return {
      lines: [
        'Live platform stats',
        `  job_applications  ${applications.count ?? 0}`,
        `  job_postings      ${postings.count ?? 0}`,
      ],
    };
  }

  return {
    lines: [`Unknown command: ${raw.trim() || '(empty)'}`, 'Type /help for the command list.'],
  };
}
