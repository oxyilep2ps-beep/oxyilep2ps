'use server';

import { createClient } from '@/lib/supabase/server';
import { isValidUkAccountNumber, isValidUkPostcode, isValidUkSortCode } from '@/lib/validation/kyc';

export async function checkUsernameAvailable(username: string, currentUserId?: string) {
  const normalized = username.trim().toLowerCase().replace(/^@/, '');
  if (!normalized || !/^[a-z0-9_]{3,30}$/.test(normalized)) {
    return { available: false, error: 'Username must be 3–30 chars: lowercase letters, numbers, underscore.' };
  }

  const supabase = await createClient();
  let query = supabase.from('profiles').select('id').eq('username', normalized).limit(1);

  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }

  const { data, error } = await query;
  if (error) return { available: false, error: error.message };

  return { available: !data?.length, normalized };
}

export async function updateProfileFields(input: {
  username?: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  postal_code?: string;
  borrower_sort_code?: string;
  borrower_account_number?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Not authenticated' };

  if (input.username) {
    const check = await checkUsernameAvailable(input.username, user.id);
    if (!check.available) {
      return { success: false, error: check.error ?? 'Username already taken' };
    }
    input.username = check.normalized;
  }

  if (input.postal_code !== undefined && input.postal_code.trim()) {
    if (!isValidUkPostcode(input.postal_code)) {
      return { success: false, error: 'Invalid UK postal code.' };
    }
    input.postal_code = input.postal_code.trim().toUpperCase();
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();

  if (profile?.role === 'BORROWER') {
    if (input.borrower_sort_code !== undefined && input.borrower_sort_code.trim()) {
      if (!isValidUkSortCode(input.borrower_sort_code)) {
        return { success: false, error: 'Invalid UK sort code.' };
      }
    }
    if (input.borrower_account_number !== undefined && input.borrower_account_number.trim()) {
      if (!isValidUkAccountNumber(input.borrower_account_number)) {
        return { success: false, error: 'Invalid UK account number (8 digits).' };
      }
    }
  }

  const patch: Record<string, string | null> = {};
  if (input.username !== undefined) patch.username = input.username;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url;
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url;
  if (input.postal_code !== undefined) patch.postal_code = input.postal_code || null;
  if (profile?.role === 'BORROWER') {
    if (input.borrower_sort_code !== undefined) patch.borrower_sort_code = input.borrower_sort_code || null;
    if (input.borrower_account_number !== undefined) {
      patch.borrower_account_number = input.borrower_account_number || null;
    }
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
