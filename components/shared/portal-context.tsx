'use client';

import { createContext, useContext } from 'react';
import type { PortalId } from '@/components/shared/universal-dashboard-layout';

type PortalContextValue = {
  portal: PortalId;
  isAdmin: boolean;
};

const PortalContext = createContext<PortalContextValue>({
  portal: 'admin',
  isAdmin: false,
});

export function PortalContextProvider({
  children,
  portal,
  isAdmin,
}: {
  children: React.ReactNode;
  portal: PortalId;
  isAdmin: boolean;
}) {
  return (
    <PortalContext.Provider value={{ portal, isAdmin }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalContext() {
  return useContext(PortalContext);
}
