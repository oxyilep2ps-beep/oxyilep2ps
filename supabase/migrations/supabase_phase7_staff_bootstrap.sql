-- =============================================================================
-- Oxyile Phase 7b — Staff profile role promotion (run AFTER phase7 succeeds)
-- PostgreSQL requires new enum values to be committed before use (55P04).
-- Run this as a separate query in the Supabase SQL editor.
-- =============================================================================

UPDATE public.profiles p
SET role = 'HR'::public.profile_role, status = 'APPROVED', updated_at = now()
FROM auth.users u
WHERE p.id = u.id AND lower(u.email) = 'careers.oxyile@gmail.com';

UPDATE public.profiles p
SET role = 'BLOGGER'::public.profile_role, status = 'APPROVED', updated_at = now()
FROM auth.users u
WHERE p.id = u.id AND lower(u.email) = 'blogger.oxyile@gmail.com';
