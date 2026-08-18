export type TerminalCommandStatus = 'Active' | 'Beta';

export type TerminalCommandGuideItem = {
  command: string;
  description: string;
  status: TerminalCommandStatus;
};

export const TERMINAL_COMMAND_GUIDE: TerminalCommandGuideItem[] = [
  {
    command: '/help',
    description: 'Lists every command the admin terminal currently understands.',
    status: 'Active',
  },
  {
    command: '/ping',
    description: 'Health check. Returns Pong! Server is active.',
    status: 'Active',
  },
  {
    command: '/stats',
    description: 'Fetches live counts from job_applications and job_postings.',
    status: 'Active',
  },
  {
    command: '/clear',
    description: 'Clears the visible terminal history for this session.',
    status: 'Active',
  },
];

export function formatTerminalHelp(): string[] {
  return [
    'Available commands:',
    ...TERMINAL_COMMAND_GUIDE.map((item) => `  ${item.command.padEnd(8)} ${item.description}`),
  ];
}
