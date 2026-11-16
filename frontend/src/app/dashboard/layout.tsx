'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const token = getToken();
      if (!token) {
        setAuthorized(false);
        router.replace('/login');
        return;
      }

      const user = getUser();
      const isAdminRoute =
        pathname?.startsWith('/dashboard/usuarios') ||
        pathname?.startsWith('/dashboard/configuracion');

      if (isAdminRoute && user && user.role !== 'ADMIN') {
        router.replace('/dashboard');
        return;
      }

      setAuthorized(true);
    };

    checkSession();
    const interval = setInterval(checkSession, 60000);
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'sic_token' && !e.newValue) {
        setAuthorized(false);
        router.replace('/login');
      }
    };
    window.addEventListener('storage', onStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorageChange);
    };
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#132038', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        Verificando sesión...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f1a30', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#ffffff' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}
