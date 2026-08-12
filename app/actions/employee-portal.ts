'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { assertEmployeeOrAdmin } from '@/lib/auth/assert-employee';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  CompanyAnnouncementRow,
  EmployeeAnalyticsBundle,
  EmployeeAssetRow,
  EmployeeDailyReportRow,
  EmployeeGamificationRow,
  EmployeeLeaveRow,
  EmployeeProfileRow,
  EmployeeTaskPriority,
  EmployeeTaskRow,
  EmployeeTaskStatus,
} from '@/lib/employee/types';

function revalidateEmployee() {
  revalidatePath('/employee');
  revalidatePath('/employee/dashboard');
  revalidatePath('/admin-dashboard/employees');
  revalidatePath('/admin-dashboard/access');
}

function mapTask(row: Record<string, unknown>): EmployeeTaskRow {
  return {
    id: String(row.id),
    assigned_to: String(row.assigned_to),
    assigned_by: (row.assigned_by as string | null) ?? null,
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    due_date: (row.due_date as string | null) ?? null,
    status: row.status as EmployeeTaskStatus,
    priority: row.priority as EmployeeTaskPriority,
    created_at: String(row.created_at),
  };
}

/** Ensure employee_profiles + gamification rows exist when granting EMPLOYEE access. */
export async function ensureEmployeePortalRows(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('employee_profiles').upsert(
    {
      id: userId,
      status: 'active',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  await admin.from('employee_gamification').upsert(
    { employee_id: userId, oxy_coins: 0, total_points: 0, badge_level: 'Bronze' },
    { onConflict: 'employee_id' }
  );
}

export async function listEmployeeDirectory(): Promise<EmployeeProfileRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_legal_name, role')
    .eq('role', 'EMPLOYEE')
    .order('full_legal_name', { ascending: true });

  const ids = (profiles ?? []).map((p) => p.id as string);
  if (ids.length === 0) return [];

  const [{ data: empProfiles }, { data: tasks }] = await Promise.all([
    admin.from('employee_profiles').select('*').in('id', ids),
    admin.from('employee_tasks').select('assigned_to, status').in('assigned_to', ids),
  ]);

  const empMap = new Map((empProfiles ?? []).map((e) => [e.id as string, e]));
  const stats = new Map<string, { total: number; completed: number; pending: number }>();
  for (const t of tasks ?? []) {
    const id = String(t.assigned_to);
    const cur = stats.get(id) ?? { total: 0, completed: 0, pending: 0 };
    cur.total += 1;
    if (t.status === 'completed') cur.completed += 1;
    if (t.status === 'pending' || t.status === 'in_progress') cur.pending += 1;
    stats.set(id, cur);
  }

  // Mock online presence: deterministic from user id hash (replace with realtime later).
  return (profiles ?? []).map((p) => {
    const id = p.id as string;
    const ep = empMap.get(id) as Record<string, unknown> | undefined;
    const s = stats.get(id) ?? { total: 0, completed: 0, pending: 0 };
    const rate = s.total === 0 ? 0 : Math.round((s.completed / s.total) * 100);
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      id,
      email: String(p.email ?? ''),
      full_legal_name: String(p.full_legal_name ?? p.email ?? 'Employee'),
      department: String(ep?.department ?? ''),
      designation: String(ep?.designation ?? ''),
      status: (ep?.status as 'active' | 'inactive') ?? 'active',
      joining_date: (ep?.joining_date as string | null) ?? null,
      skills: Array.isArray(ep?.skills) ? (ep!.skills as string[]) : [],
      online: hash % 3 !== 0,
      task_completion_rate: rate,
      pending_tasks: s.pending,
      completed_tasks: s.completed,
      total_tasks: s.total,
    };
  });
}

export async function assignEmployeeTask(input: {
  assignedTo: string;
  title: string;
  description: string;
  dueDate?: string | null;
  priority?: EmployeeTaskPriority;
}): Promise<{ ok: true; task: EmployeeTaskRow } | { ok: false; error: string }> {
  try {
    const adminUser = await assertAdmin();
    if (!input.title.trim()) return { ok: false, error: 'Title is required.' };
    if (!input.assignedTo) return { ok: false, error: 'Select an employee.' };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('employee_tasks')
      .insert({
        assigned_to: input.assignedTo,
        assigned_by: adminUser.id,
        title: input.title.trim(),
        description: input.description.trim(),
        due_date: input.dueDate || null,
        priority: input.priority ?? 'medium',
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    const { data: assignee } = await admin
      .from('profiles')
      .select('email, full_legal_name')
      .eq('id', input.assignedTo)
      .maybeSingle();

    // TODO: Send Email to employee via Resend when task is assigned
    // await sendTaskAssignedEmail({ to: assignee?.email, title: input.title, ... })
    console.info('[assignEmployeeTask] TODO email', {
      to: assignee?.email,
      title: input.title.trim(),
    });

    revalidateEmployee();
    return { ok: true, task: mapTask(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to assign task' };
  }
}

export async function listMyEmployeeTasks(): Promise<EmployeeTaskRow[]> {
  const user = await assertEmployeeOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('employee_tasks')
    .select('*')
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapTask(r as Record<string, unknown>));
}

export async function updateMyTaskStatus(
  taskId: string,
  status: EmployeeTaskStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await assertEmployeeOrAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from('employee_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('assigned_to', user.id);
    if (error) return { ok: false, error: error.message };

    if (status === 'completed') {
      const { data: gam } = await admin
        .from('employee_gamification')
        .select('oxy_coins, total_points')
        .eq('employee_id', user.id)
        .maybeSingle();
      const nextPoints = Number(gam?.total_points ?? 0) + 25;
      await admin.from('employee_gamification').upsert({
        employee_id: user.id,
        oxy_coins: Number(gam?.oxy_coins ?? 0) + 10,
        total_points: nextPoints,
        badge_level: nextPoints >= 500 ? 'Gold' : nextPoints >= 200 ? 'Silver' : 'Bronze',
        updated_at: new Date().toISOString(),
      });
    }

    revalidateEmployee();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function submitDailyReport(input: {
  whatIDidToday: string;
  blockers?: string;
  hoursLogged?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await assertEmployeeOrAdmin();
    if (!input.whatIDidToday.trim()) return { ok: false, error: 'Describe what you did today.' };

    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin
      .from('employee_daily_reports')
      .select('id')
      .eq('employee_id', user.id)
      .eq('report_date', today)
      .maybeSingle();

    if (existing) {
      return { ok: false, error: 'You already submitted today’s standup report.' };
    }

    const { error } = await admin.from('employee_daily_reports').insert({
      employee_id: user.id,
      report_date: today,
      what_i_did_today: input.whatIDidToday.trim(),
      blockers: input.blockers?.trim() || '',
      hours_logged: Number(input.hoursLogged ?? 8),
    });
    if (error) return { ok: false, error: error.message };

    revalidateEmployee();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Report failed' };
  }
}

export async function getTodayDailyReport(): Promise<EmployeeDailyReportRow | null> {
  const user = await assertEmployeeOrAdmin();
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from('employee_daily_reports')
    .select('*')
    .eq('employee_id', user.id)
    .eq('report_date', today)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    employee_id: String(data.employee_id),
    report_date: String(data.report_date),
    what_i_did_today: String(data.what_i_did_today ?? ''),
    blockers: String(data.blockers ?? ''),
    hours_logged: Number(data.hours_logged ?? 0),
    created_at: String(data.created_at),
  };
}

export async function listCompanyAnnouncements(): Promise<CompanyAnnouncementRow[]> {
  await assertEmployeeOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('company_announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ''),
    content: String(r.content ?? ''),
    created_by: (r.created_by as string | null) ?? null,
    created_at: String(r.created_at),
  }));
}

export async function createCompanyAnnouncement(input: {
  title: string;
  content: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminUser = await assertAdmin();
    if (!input.title.trim()) return { ok: false, error: 'Title is required.' };
    const admin = createAdminClient();
    const { error } = await admin.from('company_announcements').insert({
      title: input.title.trim(),
      content: input.content.trim(),
      created_by: adminUser.id,
    });
    if (error) return { ok: false, error: error.message };
    revalidateEmployee();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getMyPersonalVault(): Promise<{
  assets: EmployeeAssetRow[];
  leaves: EmployeeLeaveRow[];
  gamification: EmployeeGamificationRow;
  leaveBalanceDays: number;
}> {
  const user = await assertEmployeeOrAdmin();
  const admin = createAdminClient();
  const [{ data: assets }, { data: leaves }, { data: gam }] = await Promise.all([
    admin.from('employee_assets').select('*').eq('employee_id', user.id).eq('status', 'assigned'),
    admin.from('employee_leaves').select('*').eq('employee_id', user.id).order('created_at', { ascending: false }),
    admin.from('employee_gamification').select('*').eq('employee_id', user.id).maybeSingle(),
  ]);

  const approvedDays = (leaves ?? [])
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => {
      const start = new Date(String(l.start_date)).getTime();
      const end = new Date(String(l.end_date)).getTime();
      const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
      return sum + days;
    }, 0);

  return {
    assets: (assets ?? []).map((a) => ({
      id: String(a.id),
      employee_id: String(a.employee_id),
      asset_name: String(a.asset_name),
      serial_number: (a.serial_number as string | null) ?? null,
      assigned_date: String(a.assigned_date),
      status: String(a.status),
    })),
    leaves: (leaves ?? []).map((l) => ({
      id: String(l.id),
      employee_id: String(l.employee_id),
      leave_type: String(l.leave_type),
      start_date: String(l.start_date),
      end_date: String(l.end_date),
      status: l.status as EmployeeLeaveRow['status'],
      admin_remarks: (l.admin_remarks as string | null) ?? null,
    })),
    gamification: {
      employee_id: user.id,
      oxy_coins: Number(gam?.oxy_coins ?? 0),
      total_points: Number(gam?.total_points ?? 0),
      badge_level: String(gam?.badge_level ?? 'Bronze'),
    },
    leaveBalanceDays: Math.max(0, 25 - approvedDays),
  };
}

export async function requestEmployeeLeave(input: {
  leaveType: string;
  startDate: string;
  endDate: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await assertEmployeeOrAdmin();
    if (!input.startDate || !input.endDate) return { ok: false, error: 'Dates are required.' };
    const admin = createAdminClient();
    const { error } = await admin.from('employee_leaves').insert({
      employee_id: user.id,
      leave_type: input.leaveType || 'annual',
      start_date: input.startDate,
      end_date: input.endDate,
      status: 'pending',
    });
    if (error) return { ok: false, error: error.message };
    revalidateEmployee();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Leave request failed' };
  }
}

export async function logEmployeeModuleEvent(
  moduleKey: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await assertEmployeeOrAdmin();
    const admin = createAdminClient();
    await admin.from('employee_module_events').insert({
      employee_id: user.id,
      module_key: moduleKey,
      payload,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function getEmployeeAnalytics(employeeId: string): Promise<EmployeeAnalyticsBundle> {
  await assertAdmin();
  const admin = createAdminClient();
  const directory = await listEmployeeDirectory();
  const profile = directory.find((d) => d.id === employeeId) ?? null;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString().slice(0, 10);

  const [{ data: tasks }, { data: reports }, { data: gam }] = await Promise.all([
    admin.from('employee_tasks').select('*').eq('assigned_to', employeeId),
    admin
      .from('employee_daily_reports')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('report_date', sinceIso)
      .order('report_date', { ascending: true }),
    admin.from('employee_gamification').select('*').eq('employee_id', employeeId).maybeSingle(),
  ]);

  const completedByDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    completedByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of tasks ?? []) {
    if (t.status !== 'completed') continue;
    const day = String(t.updated_at ?? t.created_at).slice(0, 10);
    if (completedByDay.has(day)) {
      completedByDay.set(day, (completedByDay.get(day) ?? 0) + 1);
    }
  }

  const pending = (tasks ?? []).filter((t) => t.status === 'pending').length;
  const inProgress = (tasks ?? []).filter((t) => t.status === 'in_progress').length;
  const completed = (tasks ?? []).filter((t) => t.status === 'completed').length;

  return {
    profile,
    tasksCompletedSeries: [...completedByDay.entries()].map(([date, completedCount]) => ({
      date,
      completed: completedCount,
    })),
    statusDistribution: [
      { name: 'Pending', value: pending, fill: '#737373' },
      { name: 'In Progress', value: inProgress, fill: '#F97316' },
      { name: 'Completed', value: completed, fill: '#22c55e' },
    ],
    hoursLoggedSeries: (reports ?? []).map((r) => ({
      date: String(r.report_date),
      hours: Number(r.hours_logged ?? 0),
    })),
    totals: {
      completed,
      pending,
      inProgress,
      hoursLogged: (reports ?? []).reduce((s, r) => s + Number(r.hours_logged ?? 0), 0),
      oxyCoins: Number(gam?.oxy_coins ?? 0),
    },
  };
}
