'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { HrEnterpriseJobEditor } from '@/components/hr/hr-enterprise-job-editor';
import { AuthToast } from '@/components/auth-toast';

const JOB_CREATED_EVENT = 'oxyile:job-posting-created';

type HrJobEditorContextValue = {
  open: boolean;
  openCreateJob: () => void;
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
  const [toast, setToast] = useState<string | null>(null);

  const openCreateJob = useCallback(() => setOpen(true), []);
  const closeCreateJob = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openCreateJob, closeCreateJob }),
    [open, openCreateJob, closeCreateJob]
  );

  return (
    <HrJobEditorContext.Provider value={value}>
      {children}
      <HrEnterpriseJobEditor
        open={open}
        onClose={closeCreateJob}
        onCreated={() => {
          dispatchJobPostingCreated();
          setToast('Job posting saved. It is now in ATS — published roles sync to /careers.');
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
