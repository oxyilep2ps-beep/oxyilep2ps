'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

export type ComplaintRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  description: string;
  issue_description: string | null;
  screenshot_url: string | null;
  priority: string;
  status: string;
  sla_deadline: string | null;
  created_at: string;
};

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessageRow[];
}

export async function listComplaints(): Promise<ComplaintRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('complaints').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ComplaintRow[];
}
