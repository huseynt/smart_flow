'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from 'next-themes';
import { initializeDataConnect } from '@/lib/dataConnect';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Initialize Data Connect on app load
  useEffect(() => {
    initializeDataConnect();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="theme"
      disableTransitionOnChange
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
