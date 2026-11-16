'use client';

import { ReactNode } from 'react';

const svg = (children: ReactNode, size = 22, sw = 1.9) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const ICONS: Record<string, ReactNode> = {
  reportes: svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="12" x2="8" y2="16" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="16" y1="10" x2="16" y2="16" /></>),
  tareas: svg(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 12l2 2 4-4" /></>),
  directorio: svg(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>),
  usuarios: svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  configuracion: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
};

const IcLock = () => svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, 34, 1.6);
const IcSpark = () => svg(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6L15.5 18.5l2.6-.9z" /></>, 15, 1.8);

export interface ModulePlaceholderProps {
  icon: keyof typeof ICONS | string;
  color?: string;
  title: string;
  subtitle: string;
  description?: string;
  features?: string[];
}

export default function ModulePlaceholder({
  icon,
  color = '#3b82f6',
  title,
  subtitle,
  description,
  features = [],
}: ModulePlaceholderProps) {
  return (
    <main style={{ flex: 1, padding: '26px 28px', overflowX: 'hidden', maxWidth: '100%' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '13px', flexShrink: 0,
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0f1a30', boxShadow: `0 6px 16px ${color}44`
        }}>
          {ICONS[icon] || ICONS.configuracion}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>{title}</h1>
            <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', backgroundColor: '#16243e', border: '1px solid #2e436e', borderRadius: '999px', padding: '3px 9px' }}>
              Próximamente
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>{subtitle}</p>
        </div>
      </div>

      {/* Tarjeta principal */}
      <div style={{ backgroundColor: '#16243e', border: '1px solid #2e436e', borderTop: `3px solid ${color}`, borderRadius: '13px', padding: '44px 32px', textAlign: 'center', boxShadow: '0 14px 32px rgba(0,0,0,0.35)' }}>
        <div style={{ width: '76px', height: '76px', borderRadius: '20px', background: `linear-gradient(135deg, ${color}22 0%, ${color}0c 100%)`, border: `1.5px solid ${color}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, margin: '0 auto 20px', boxShadow: `0 8px 24px ${color}22` }}>
          <IcLock />
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
          Módulo en desarrollo
        </h2>
        <p style={{ margin: '0 auto 24px', fontSize: '13px', color: '#94a3b8', maxWidth: '520px', lineHeight: 1.65 }}>
          {description || 'Este módulo se encuentra actualmente en construcción. Estará disponible en una próxima fase del Sistema de Ingresos Consulares.'}
        </p>

        {features.length > 0 && (
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginBottom: '13px', color: '#94a3b8' }}>
              <IcSpark />
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Funcionalidades planificadas</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {features.map((f) => (
                <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#132038', border: '1px solid #2e436e', color: '#cbd5e1', borderRadius: '999px', padding: '6px 13px', fontSize: '11.5px', fontWeight: 600 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nota al pie */}
      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '14px', textAlign: 'center' }}>
        Ministerio de Hacienda · Sistema de Ingresos Consulares (SIC)
      </div>
    </main>
  );
}
