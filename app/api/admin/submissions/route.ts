import { NextResponse } from 'next/server';
import { getAllSubmissions } from '@/lib/data/kyc-store';

/** Internal admin API — protect with auth middleware before production. */
export async function GET() {
  const submissions = await getAllSubmissions();
  return NextResponse.json({ submissions });
}
