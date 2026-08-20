'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PortalId } from '@/components/shared/universal-dashboard-layout';
import type { MemberRole } from '@/lib/chat/types';
import {
  financialStanceFromPortal,
  readActivePortalClient,
  resolveFinancialCapabilities,
  setActivePortalClient,
  type FinancialCapabilities,
} from '@/lib/auth/financial-capabilities';

type PortalContextValue = {
  portal: PortalId;
  isAdmin: boolean;
  capabilities: FinancialCapabilities;
  /** Handshake stance derived from active portal + capabilities. */
  financialStance: MemberRole | null;
  setActivePortal: (portal: PortalId) => void;
};

const PortalContext = createContext<PortalContextValue>({
  portal: 'admin',
  isAdmin: false,
  capabilities: { is_investor: false, is_borrower: false },
  financialStance: null,
  setActivePortal: () => {},
});

export function PortalContextProvider({
  children,
  portal,
  isAdmin,
  isInvestor = false,
  isBorrower = false,
}: {
  children: React.ReactNode;
  portal: PortalId;
  isAdmin: boolean;
  isInvestor?: boolean;
  isBorrower?: boolean;
}) {
  const [activePortal, setActivePortalState] = useState<PortalId>(portal);

  useEffect(() => {
    setActivePortalState(portal);
    setActivePortalClient(portal);
  }, [portal]);

  useEffect(() => {
    const stored = readActivePortalClient();
    if (stored && stored !== activePortal) {
      // Prefer server-resolved portal for the current route; keep cookie warm.
      setActivePortalClient(portal);
    }
  }, [activePortal, portal]);

  const setActivePortal = useCallback((next: PortalId) => {
    setActivePortalState(next);
    setActivePortalClient(next);
  }, []);

  const capabilities = useMemo(
    () =>
      resolveFinancialCapabilities({
        role: isAdmin ? 'ADMIN' : '',
        is_investor: isInvestor,
        is_borrower: isBorrower,
      }),
    [isAdmin, isBorrower, isInvestor]
  );

  // Prefer explicit flags from server; fall back already handled in resolveFinancialCapabilities.
  const caps: FinancialCapabilities = {
    is_investor: isInvestor || capabilities.is_investor,
    is_borrower: isBorrower || capabilities.is_borrower,
  };

  const financialStance = financialStanceFromPortal(activePortal, caps);

  const value = useMemo(
    () => ({
      portal: activePortal,
      isAdmin,
      capabilities: caps,
      financialStance,
      setActivePortal,
    }),
    [activePortal, caps, financialStance, isAdmin, setActivePortal]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalContext() {
  return useContext(PortalContext);
}
