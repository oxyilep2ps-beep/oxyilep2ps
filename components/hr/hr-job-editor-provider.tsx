'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { JobEditorModal } from '@/components/hr/hr-enterprise-job-editor';
import { AuthToast } from '@/components/auth-toast';
import type { JobPosting } from '@/lib/hr/types';

const JOB_CREATED_EVENT = 'oxyile:job-posting-created';

type HrJobEditorContextValue = {
  open: boolean;
  openCreateJob: () => void;
  openEditJob: (job: JobPosting) => void;
  closeCreateJob: () => void;
};

const HrJobEditorContext = createContext<HrJobEditorContextValue | null>(null);

export function useHrJobEditor() {
  const ctx = useContext(HrJobEditorContext);
  if (!ctx) {
    throw new Error('useHrJobEditor must be used inside HrJobEditorProvider');
  }
  return ctx;
}

export function dispatchJobPostingCreated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(JOB_CREATED_EVENT));
}

export function subscribeJobPostingCreated(handler: () => void) {
  window.addEventListener(JOB_CREATED_EVENT, handler);
  return () => window.removeEventListener(JOB_CREATED_EVENT, handler);
}

export function HrJobEditorProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreateJob = useCallback(() => {
    setEditingJob(null);
    setOpen(true);
  }, []);

  const openEditJob = useCallback((job: JobPosting) => {
    setEditingJob(job);
    setOpen(true);
  }, []);

  const closeCreateJob = useCallback(() => {
    setOpen(false);
    setEditingJob(null);
  }, []);

  const value = useMemo(
    () => ({ open, openCreateJob, openEditJob, closeCreateJob }),
    [open, openCreateJob, openEditJob, closeCreateJob]
  );

  return (
    <HrJobEditorContext.Provider value={value}>
      {children}
      <JobEditorModal
        key={editingJob?.id ?? 'new'}
        open={open}
        initialData={editingJob}
        onClose={closeCreateJob}
        onCreated={(mode) => {
          dispatchJobPostingCreated();
          setToast(
            mode === 'update'
              ? 'Job posting updated. Published roles sync to /careers.'
              : 'Job posting saved. It is now in ATS — published roles sync to /careers.'
          );
          closeCreateJob();
        }}
      />
      <AuthToast
        open={Boolean(toast)}
        tone="success"
        message={toast ?? ''}
        onClose={() => setToast(null)}
        autoCloseMs={5000}
      />
    </HrJobEditorContext.Provider>
  );
}
