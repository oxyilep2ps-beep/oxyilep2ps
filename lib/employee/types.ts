export type EmployeeTaskStatus = 'pending' | 'in_progress' | 'completed';
export type EmployeeTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EmployeeLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type EmployeeProfileRow = {
  id: string;
  email: string;
  full_legal_name: string;
  department: string;
  designation: string;
  status: 'active' | 'inactive';
  joining_date: string | null;
  skills: string[];
  online: boolean;
  task_completion_rate: number;
  pending_tasks: number;
  completed_tasks: number;
  total_tasks: number;
};

export type EmployeeTaskRow = {
  id: string;
  assigned_to: string;
  assigned_by: string | null;
  title: string;
  description: string;
  due_date: string | null;
  status: EmployeeTaskStatus;
  priority: EmployeeTaskPriority;
  created_at: string;
  assignee_name?: string;
  assignee_email?: string;
};

export type EmployeeDailyReportRow = {
  id: string;
  employee_id: string;
  report_date: string;
  what_i_did_today: string;
  blockers: string;
  hours_logged: number;
  created_at: string;
};

export type EmployeeLeaveRow = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: EmployeeLeaveStatus;
  admin_remarks: string | null;
};

export type EmployeeAssetRow = {
  id: string;
  employee_id: string;
  asset_name: string;
  serial_number: string | null;
  assigned_date: string;
  status: string;
};

export type CompanyAnnouncementRow = {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
};

export type EmployeeGamificationRow = {
  employee_id: string;
  oxy_coins: number;
  total_points: number;
  badge_level: string;
};

export type EmployeeAnalyticsBundle = {
  profile: EmployeeProfileRow | null;
  tasksCompletedSeries: { date: string; completed: number }[];
  statusDistribution: { name: string; value: number; fill: string }[];
  hoursLoggedSeries: { date: string; hours: number }[];
  totals: {
    completed: number;
    pending: number;
    inProgress: number;
    hoursLogged: number;
    oxyCoins: number;
  };
};

/** 30 enterprise feature modules (UI placeholders + module_key hooks). */
export const EMPLOYEE_ENTERPRISE_MODULES = [
  // 1–5 HR / Leaves
  { key: 'leave_requests', group: 'HR & Leaves', title: 'Leave Requests', blurb: 'Request annual, sick, or unpaid leave.' },
  { key: 'holiday_calendar', group: 'HR & Leaves', title: 'Holiday Calendar', blurb: 'UK bank holidays and company closures.' },
  { key: 'sick_leave_tracking', group: 'HR & Leaves', title: 'Sick Leave Tracking', blurb: 'Log illness days with optional notes.' },
  { key: 'manager_approval', group: 'HR & Leaves', title: 'Manager Approval Flow', blurb: 'Track approvals for leave requests.' },
  { key: 'attendance', group: 'HR & Leaves', title: 'Attendance', blurb: 'Daily check-in / check-out status.' },
  // 6–10 Gamification
  { key: 'peer_shoutouts', group: 'Gamification', title: 'Peer Shoutouts', blurb: 'Send kudos to teammates.' },
  { key: 'oxy_wallet', group: 'Gamification', title: 'OxyCoins Wallet', blurb: 'View and redeem OxyCoins.' },
  { key: 'leaderboard', group: 'Gamification', title: 'Leaderboard', blurb: 'Team rankings by points.' },
  { key: 'milestone_badges', group: 'Gamification', title: 'Milestone Badges', blurb: 'Unlock badge levels over time.' },
  { key: 'eotm', group: 'Gamification', title: 'Employee of the Month', blurb: 'Auto-calc spotlight winner.' },
  // 11–15 Assets & IT
  { key: 'laptop_tracking', group: 'Assets & IT', title: 'Laptop Tracking', blurb: 'Assigned devices and serials.' },
  { key: 'software_licenses', group: 'Assets & IT', title: 'Software Licenses', blurb: 'Assigned SaaS seats.' },
  { key: 'it_tickets', group: 'Assets & IT', title: 'IT Support Tickets', blurb: 'Raise hardware/software issues.' },
  { key: 'asset_return', group: 'Assets & IT', title: 'Asset Return', blurb: 'Offboarding return checklist.' },
  { key: 'hardware_health', group: 'Assets & IT', title: 'Hardware Health', blurb: 'Device health self-checks.' },
  // 16–20 Performance
  { key: 'quarterly_okrs', group: 'Performance', title: 'Quarterly OKRs', blurb: 'Set and track objectives.' },
  { key: 'one_on_ones', group: 'Performance', title: '1-on-1 Notes', blurb: 'Meeting notes with your manager.' },
  { key: 'feedback_forms', group: 'Performance', title: 'Feedback Forms', blurb: 'Peer and manager feedback.' },
  { key: 'skill_matrix', group: 'Performance', title: 'Skill Matrix', blurb: 'Tagged skills and proficiency.' },
  { key: 'promotion_history', group: 'Performance', title: 'Promotion History', blurb: 'Career progression timeline.' },
  // 21–25 Financials
  { key: 'salary_slips', group: 'Finances', title: 'Salary Slips', blurb: 'Download monthly payslips.' },
  { key: 'tax_declaration', group: 'Finances', title: 'Tax Declaration', blurb: 'Submit tax forms securely.' },
  { key: 'expense_reimburse', group: 'Finances', title: 'Expense Reimbursement', blurb: 'Upload receipts for claim.' },
  { key: 'ctc_graph', group: 'Finances', title: 'CTC Graph', blurb: 'Compensation breakdown view.' },
  { key: 'esop_tracker', group: 'Finances', title: 'ESOP Tracker', blurb: 'Vesting schedule tracker.' },
  // 26–30 Wellbeing & Culture
  { key: 'mood_tracker', group: 'Culture', title: 'Daily Mood Tracker', blurb: 'Emoji check-in for wellbeing.' },
  { key: 'suggestion_box', group: 'Culture', title: 'Anonymous Suggestions', blurb: 'Share ideas privately.' },
  { key: 'company_wiki', group: 'Culture', title: 'Company Wiki', blurb: 'Internal docs and playbooks.' },
  { key: 'celebrations', group: 'Culture', title: 'Birthdays & Anniversaries', blurb: 'Team celebration widgets.' },
  { key: 'org_chart', group: 'Culture', title: 'Team Org Chart', blurb: 'Visualize reporting lines.' },
] as const;

export type EmployeeModuleKey = (typeof EMPLOYEE_ENTERPRISE_MODULES)[number]['key'];
