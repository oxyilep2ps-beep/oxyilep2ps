import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { StoredKycData } from '@/lib/types/profile';
import { UserStatus, type UserRecord } from '@/lib/types/user';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

async function ensureStore(): Promise<UserRecord[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as UserRecord[];
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
    return [];
  }
}

async function persist(records: UserRecord[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

export async function getAllSubmissions(): Promise<UserRecord[]> {
  return ensureStore();
}

export async function getSubmissionById(id: string): Promise<UserRecord | undefined> {
  const records = await ensureStore();
  return records.find((r) => r.id === id);
}

export async function createSubmission(
  email: string,
  fullLegalName: string,
  kyc: StoredKycData
): Promise<UserRecord> {
  const records = await ensureStore();
  const record: UserRecord = {
    id: randomUUID(),
    email,
    fullLegalName,
    role: kyc.accountRole || 'lender',
    status: UserStatus.PENDING,
    submittedAt: new Date().toISOString(),
    kyc,
  };
  records.push(record);
  await persist(records);
  return record;
}

export async function updateSubmissionStatus(
  id: string,
  status: UserStatus,
  reviewedBy?: string
): Promise<UserRecord | null> {
  const records = await ensureStore();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;

  records[index] = {
    ...records[index],
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewedBy ?? 'admin',
  };
  await persist(records);
  return records[index];
}
