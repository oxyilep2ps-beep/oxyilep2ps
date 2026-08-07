-- STEP 1 of 2 — run this file ALONE and wait for success before the portal migration.
-- Postgres forbids using a newly added enum label in the same transaction (error 55P04).
-- This statement must commit before any function/policy references SOCIAL_MANAGER.

ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'SOCIAL_MANAGER';
