'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const MODULE_PATH_MAP: Record<string, string> = {
  ingresos: '/dashboard',
  reportes: '/dashboard/reportes',
  tareas: '/dashboard/tareas',
  directorio: '/dashboard/directorio',
};

function resolveModuleFromPath(pathname: string | null): string {
  if (!pathname) return 'ingresos';
  if (pathname.startsWith('/dashboard/reportes')) return 'reportes';
  if (pathname.startsWith('/dashboard/tareas')) return 'tareas';
  if (pathname.startsWith('/dashboard/directorio')) return 'directorio';
  if (pathname.startsWith('/dashboard/usuarios')) return 'usuarios';
  if (pathname.startsWith('/dashboard/configuracion')) return 'configuracion';
  return 'ingresos';
}

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
      const targetModule = resolveModuleFromPath(pathname);
      const isAdminRoute = targetModule === 'usuarios' || targetModule === 'configuracion';

      if (user && user.role !== 'ADMIN') {
        const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
        const fallbackModule = perms.find(p => MODULE_PATH_MAP[p]) || 'ingresos';
        const fallbackPath = MODULE_PATH_MAP[fallbackModule] || '/dashboard';

        if (isAdminRoute) {
          router.replace(fallbackPath);
          return;
        }

        if (perms.length > 0 && !perms.includes(targetModule)) {
          router.replace(fallbackPath);
          return;
        }
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
