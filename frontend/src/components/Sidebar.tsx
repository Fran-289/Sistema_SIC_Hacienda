'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, removeToken } from '@/lib/api';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  const activeTab = useMemo(() => {
    if (!pathname) return 'ingresos';
    if (pathname.startsWith('/dashboard/reportes')) return 'reportes';
    if (pathname.startsWith('/dashboard/tareas')) return 'tareas';
    if (pathname.startsWith('/dashboard/directorio')) return 'directorio';
    if (pathname.startsWith('/dashboard/usuarios')) return 'usuarios';
    if (pathname.startsWith('/dashboard/configuracion')) return 'configuracion';
    return 'ingresos';
  }, [pathname]);

  const allMenuItems = [
    {
      id: 'ingresos',
      label: 'Bandeja de Ingresos',
      path: '/dashboard',
      adminOnly: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
    },
    {
      id: 'reportes',
      label: 'Bandeja de Reportes',
      path: '/dashboard/reportes',
      adminOnly: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <line x1="8" y1="12" x2="8" y2="16"></line>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="16" y1="10" x2="16" y2="16"></line>
        </svg>
      ),
    },
    {
      id: 'tareas',
      label: 'Tareas Pendientes',
      path: '/dashboard/tareas',
      adminOnly: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <path d="M9 12l2 2 4-4"></path>
        </svg>
      ),
    },
    {
      id: 'directorio',
      label: 'Directorio Consular',
      path: '/dashboard/directorio',
      adminOnly: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
      ),
    },
    {
      id: 'usuarios',
      label: 'Usuarios',
      path: '/dashboard/usuarios',
      adminOnly: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      path: '/dashboard/configuracion',
      adminOnly: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
  ];

  const menuItems = useMemo(() => {
    const isAdmin = !user || user.role === 'ADMIN';
    if (isAdmin) return allMenuItems;

    const perms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
    return allMenuItems.filter((item) => {
      if (item.adminOnly) return false;
      if (perms.length === 0) return true;
      return perms.includes(item.id);
    });
  }, [user]);

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        backgroundColor: '#16243e',
        color: '#ffffff',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 50,
        borderRight: '3px solid #3b527d',
        boxShadow: '6px 0 18px rgba(0, 0, 0, 0.55)',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        flexShrink: 0,
      }}
    >
      <div>
        {/* Encabezado Superior */}
        <div style={{ padding: collapsed ? '18px 12px' : '18px 20px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '3px solid #3b527d', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img
                  src="/logo-hacienda.svg"
                  alt="Escudo El Salvador"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '400', color: '#ffffff', letterSpacing: '0.5px', lineHeight: '1.2' }}>
                  SIC - Hacienda
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#a0aec0' }}>
                  Ingresos Consulares
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Módulos */}
        <nav style={{ padding: collapsed ? '14px 8px' : '14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                title={collapsed ? item.label : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: collapsed ? '12px' : '12px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isSelected ? '#2563eb' : 'transparent',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: isSelected ? '600' : '400',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                }}
              >
                <span style={{ color: isSelected ? '#ffffff' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Perfil al Pie (incluye Cerrar sesión aun colapsado) */}
      <div style={{
        padding: collapsed ? '14px 8px' : '16px 20px',
        borderTop: '3px solid #3b527d',
        boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        gap: collapsed ? '10px' : '12px',
        marginTop: 'auto',
        backgroundColor: '#111e36',
      }}>
        <div
          title={collapsed ? (user?.name || '') : undefined}
          style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#283a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}
        >
          👤
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.name || 'Cargando...'}
            </div>
            <div style={{ fontSize: '10px', color: '#a0aec0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email || ''}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </aside>
  );
}
