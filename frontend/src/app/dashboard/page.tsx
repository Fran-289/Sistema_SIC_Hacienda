'use client';

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi, downloadApiFile, getToken as getTokenSync } from "@/lib/api";

interface IngresoRegistro {
  id: number;
  depositDateIso: string;
  concentrationDateIso: string;
  fechaDeposito: string;
  fechaConcentracion: string;
  deposito: number;
  dias: number;
  region: string;
  pais: string;
  embajadaConsulado: string;
  ingreso: number;
  pasaporte: number;
  dui: number;
  consular: number;
  comision: number;
  estado: string;
  creadoPor: string;
}

type SortField = keyof IngresoRegistro;
type SortOrder = 'asc' | 'desc' | null;

const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

/* ---------- Iconos ---------- */
const svg = (children: ReactNode, size = 18, sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcInbox = () => svg(<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5l-3 6.5v6a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-6.5l-3-6.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.5z" /></>, 22, 1.9);
const IcFilter = () => svg(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>, 17, 2);
const IcPlus = () => svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 17, 2.4);
const IcDownload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, 16, 2);
const IcEye = () => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 13, 2.1);
const IcEdit = () => svg(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>, 13, 2.1);
const IcTrash = () => svg(<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>, 13, 2.1);
const IcAlert = () => svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 16, 2);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);
const IcInfo = () => svg(<><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12" y2="8.1" /></>, 16, 2);
const IcShield = () => svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="15" x2="12" y2="15.1" /></>, 16, 2);
const IcCalendar = () => svg(<><rect x="3" y="4.5" width="18" height="17" rx="2" /><line x1="16" y1="2.5" x2="16" y2="6.5" /><line x1="8" y1="2.5" x2="8" y2="6.5" /><line x1="3" y1="10" x2="21" y2="10" /></>, 15, 1.9);
const IcSearch = () => svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>, 15, 2);

/* ---------- Bloques ---------- */
function SectionTitle({ icon, color, title, subtitle, right }: { icon: ReactNode; color: string; title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0,
        background: `linear-gradient(145deg, ${color}30 0%, ${color}14 100%)`,
        border: `1px solid ${color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.14), 0 4px 14px ${color}30`,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #2e436e 0%, transparent 100%)' }} />
      {right}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const conf: Record<string, { c: string; t: string }> = {
    'Identificado Distribuido': { c: '#38bdf8', t: 'Identificado Distribuido' },
    'Identificado / No distribuido': { c: '#f59e0b', t: 'Identificado / No distribuido' },
    'No identificado': { c: '#94a3b8', t: 'No identificado' },
  };
  const { c, t } = conf[estado] || { c: '#94a3b8', t: estado };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: `${c}1c`, border: `1px solid ${c}55`, color: c, borderRadius: '999px', padding: '2px 8px', fontSize: '9.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: c, flexShrink: 0 }} />
      {t}
    </span>
  );
}

function ModalShell({ children, onClose, maxWidth = 480 }: { children: ReactNode; danger?: boolean; onClose: () => void; maxWidth?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 16, 0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', backgroundColor: '#101c30', border: '1px solid #243552', borderRadius: '20px', padding: '34px 30px 28px', maxWidth: `${maxWidth}px`, width: '100%', maxHeight: '90vh', overflowY: 'auto', color: '#fff', boxShadow: '0 40px 90px rgba(0,0,0,0.8)' }}>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(148,163,184,.1)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,.22)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(148,163,184,.1)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <IcX />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Página ---------- */
export default function BandejaIngresosPage() {
  const router = useRouter();
  const [showOpenModal, setShowOpenModal] = useState(false);

  // Filtros Superiores
  const [fechaDel, setFechaDel] = useState('');
  const [fechaAl, setFechaAl] = useState('');
  const [tipoFecha, setTipoFecha] = useState<'deposito' | 'concentracion'>('deposito');
  const [embajadaConsuladoSearch, setEmbajadaConsuladoSearch] = useState('');
  const [montoDeposito, setMontoDeposito] = useState('');
  const [estadoSelect, setEstadoSelect] = useState('');

  // Filtros de columna
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Modales Tabla
  const [itemVer, setItemVer] = useState<IngresoRegistro | null>(null);
  const [itemEditar, setItemEditar] = useState<IngresoRegistro | null>(null);
  const [itemEliminar, setItemEliminar] = useState<IngresoRegistro | null>(null);
  const [motivoEliminacion, setMotivoEliminacion] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Registros
  const [registros, setRegistros] = useState<IngresoRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const formatDate = (iso: string | null): string => {
    if (!iso) return '-';
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return '-';
    return `${day}/${month}/${year}`;
  };

  const mapRecord = (r: any): IngresoRegistro => {
    const pasaporte = parseFloat(r.passportValue) || 0;
    const dui = parseFloat(r.duiValue) || 0;
    const consular = parseFloat(r.consularValue) || 0;
    const comision = parseFloat(r.commissionValue) || 0;
    const upperStatus = (r.status || '').toUpperCase();

    return {
      id: r.id,
      depositDateIso: r.depositDate || '',
      concentrationDateIso: r.concentrationDate || '',
      fechaDeposito: formatDate(r.depositDate),
      fechaConcentracion: formatDate(r.concentrationDate),
      deposito: parseFloat(r.depositAmount) || 0,
      dias: r.days ?? 0,
      region: r.region || '-',
      pais: r.country || '-',
      embajadaConsulado: r.location || r.country || 'NO IDENTIFICADA',
      ingreso: pasaporte + dui + consular + comision,
      pasaporte,
      dui,
      consular,
      comision,
      estado:
        upperStatus === 'NO IDENTIFICADO'
          ? 'No identificado'
          : upperStatus === 'IDENTIFICADO / NO DISTRIBUIDO' || upperStatus === 'IDENTIFICADO NO DISTRIBUIDO'
          ? 'Identificado / No distribuido'
          : upperStatus === 'IDENTIFICADO DISTRIBUIDO'
          ? 'Identificado Distribuido'
          : r.status,
      creadoPor: r.createdBy?.name || 'Sistema',
    };
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await fetchApi('/records');
      setRegistros(Array.isArray(data) ? data.map(mapRecord) : []);
    } catch (err: any) {
      setLoadError(err.message || 'Error al cargar los registros');
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleLimpiarFiltros = () => {
    setFechaDel('');
    setFechaAl('');
    setEmbajadaConsuladoSearch('');
    setMontoDeposito('');
    setEstadoSelect('');
    setColumnFilters({});
    setSortField(null);
    setSortOrder(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const registrosProcesados = useMemo(() => {
    const searchNormalized = normalizeText(embajadaConsuladoSearch);

    return registros.filter(item => {
      if (searchNormalized && !normalizeText(item.embajadaConsulado).includes(searchNormalized)) return false;
      if (montoDeposito.trim() && !item.deposito.toFixed(2).includes(montoDeposito.trim())) return false;
      if (estadoSelect && item.estado !== estadoSelect) return false;

      if (fechaDel || fechaAl) {
        const targetIso = tipoFecha === 'deposito' ? item.depositDateIso : item.concentrationDateIso;
        if (!targetIso) return false;
        if (fechaDel && targetIso < fechaDel) return false;
        if (fechaAl && targetIso > fechaAl) return false;
      }

      for (const [key, val] of Object.entries(columnFilters)) {
        if (val && val.trim()) {
          if (!normalizeText(String((item as any)[key] ?? '')).includes(normalizeText(val))) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (!sortField || !sortOrder) return 0;

      if (sortField === 'fechaDeposito') {
        return sortOrder === 'asc'
          ? a.depositDateIso.localeCompare(b.depositDateIso)
          : b.depositDateIso.localeCompare(a.depositDateIso);
      }
      if (sortField === 'fechaConcentracion') {
        return sortOrder === 'asc'
          ? a.concentrationDateIso.localeCompare(b.concentrationDateIso)
          : b.concentrationDateIso.localeCompare(a.concentrationDateIso);
      }

      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = normalizeText(String(aVal));
      const bStr = normalizeText(String(bVal));
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [registros, embajadaConsuladoSearch, montoDeposito, estadoSelect, fechaDel, fechaAl, tipoFecha, columnFilters, sortField, sortOrder]);

  const handleConfirmarEdicion = () => {
    if (!itemEditar) return;
    const id = itemEditar.id;
    setItemEditar(null);
    router.push(`/dashboard/ingresos/nuevo?editar=${id}`);
  };

  const handleOpenSamePage = () => {
    setShowOpenModal(false);
    router.push('/dashboard/ingresos/nuevo');
  };

  const handleOpenNewTab = () => {
    getTokenSync();
    setShowOpenModal(false);
    window.open('/dashboard/ingresos/nuevo', '_blank');
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await downloadApiFile('/records/export', 'ingresos_consulares.xlsx');
    } catch (err: any) {
      setLoadError(err.message || 'No se pudo exportar la lista en Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async (id: number) => {
    try {
      await downloadApiFile(`/records/${id}/pdf`, `ingreso_${id}.pdf`);
    } catch (err: any) {
      setLoadError(err.message || 'No se pudo descargar el comprobante PDF');
    }
  };

  const formatMoneda = (val: number) => {
    if (val === 0) return '$-';
    return `$${val.toFixed(2)}`;
  };

  const cols = [
    { key: 'id', label: 'ID', minWidth: '50px' },
    { key: 'fechaDeposito', label: 'Fecha Depósito', minWidth: '100px' },
    { key: 'fechaConcentracion', label: 'Fecha Concentración', minWidth: '114px' },
    { key: 'deposito', label: 'Depósito', minWidth: '92px' },
    { key: 'dias', label: 'Días', minWidth: '52px', align: 'center' as const },
    { key: 'embajadaConsulado', label: 'Embajada/Consulado', minWidth: '180px' },
    { key: 'ingreso', label: 'Ingreso', minWidth: '88px' },
    { key: 'pasaporte', label: 'Pasaporte', minWidth: '96px' },
    { key: 'dui', label: 'DUI', minWidth: '92px' },
    { key: 'consular', label: 'Consular', minWidth: '92px' },
    { key: 'comision', label: 'Comisión', minWidth: '92px' },
    { key: 'estado', label: 'Estado', minWidth: '140px' },
  ];

  return (
    <>
      <style jsx global>{`
        .fl-input, .fl-select {
          background: #0f1a30;
          border: 1.5px solid #2e436e;
          color: #e2e8f0;
          padding: 7px 11px;
          border-radius: 8px;
          font-size: 12px;
          font-family: inherit;
          outline: none;
          color-scheme: dark;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .fl-input:focus, .fl-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, .16);
        }
        .fl-select { appearance: none; -webkit-appearance: none; padding-right: 30px; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; }
        select option { background-color: #0f1a30; color: #fff; }

        .row-act {
          width: 30px; height: 30px;
          border-radius: 9px;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
        }
        .row-act.act-download { background: rgba(34,197,94,.12); color: #4ade80; }
        .row-act.act-view { background: rgba(234,179,8,.12); color: #facc15; }
        .row-act.act-edit { background: rgba(56,189,248,.12); color: #38bdf8; }
        .row-act.act-delete { background: rgba(239,68,68,.12); color: #f87171; }
        .row-act:hover { transform: translateY(-1px) scale(1.06); }
        .row-act.act-download:hover { background: rgba(34,197,94,.25); box-shadow: 0 4px 14px rgba(34,197,94,.3); }
        .row-act.act-view:hover { background: rgba(234,179,8,.25); box-shadow: 0 4px 14px rgba(234,179,8,.3); }
        .row-act.act-edit:hover { background: rgba(56,189,248,.25); box-shadow: 0 4px 14px rgba(56,189,248,.3); }
        .row-act.act-delete:hover { background: rgba(239,68,68,.25); box-shadow: 0 4px 14px rgba(239,68,68,.3); }

        .sic-table tbody tr { transition: background .12s ease; }
        .sic-table tbody tr:hover { background: rgba(59, 130, 246, .06); }

        .btn-full {
          width: 100%; background: linear-gradient(135deg, #2563eb, #3b82f6);
          border: none; color: #fff;
          padding: 11px; border-radius: 10px;
          font-size: 13.5px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: all .15s ease;
          box-shadow: 0 5px 14px rgba(37, 99, 235, .4);
        }
        .btn-full:hover { transform: translateY(-1px); }
      `}</style>

      <main style={{ flex: 1, padding: "18px 20px", overflowX: "hidden", maxWidth: "100%" }}>

        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
            background: 'linear-gradient(145deg, #d4a93a 0%, #C59B27 55%, #a37e1c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0f1a30',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.35), inset 0 -2px 4px rgba(0,0,0,.18), 0 8px 20px rgba(197,155,39,.38)',
            border: '1px solid rgba(255,255,255,.12)',
          }}>
            <IcInbox />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>
                Bandeja de Ingresos Consulares
              </h1>
              <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#0f1a30', backgroundColor: '#38bdf8', borderRadius: '999px', padding: '3px 9px' }}>
                {registros.length} reg.
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#94a3b8" }}>
              Control y seguimiento de depósitos consulares · Ministerio de Hacienda
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <button
              onClick={() => setShowOpenModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#2563eb', border: 'none', color: '#ffffff',
                padding: '12px 24px', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(37,99,235,.35)',
              }}
            >
              <IcPlus /> Registrar Ingreso
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'transparent', border: '2px solid #3b82f6', color: '#93c5fd',
                padding: '10px 24px', borderRadius: '10px',
                fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
                cursor: exporting ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                opacity: exporting ? 0.65 : 1,
              }}
            >
              <IcDownload /> {exporting ? 'Exportando...' : 'Descargar Lista (Excel)'}
            </button>
          </div>
        </div>

        {/* Tarjeta de Filtros */}
        <div style={{ backgroundColor: "#16243e", border: "1px solid #2e436e", borderTop: "3px solid #C59B27", borderRadius: "13px", padding: "14px 16px", marginBottom: "14px", boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 12px 28px rgba(0,0,0,0.3)' }}>
          <SectionTitle icon={<IcFilter />} color="#3b82f6" title="Filtros de Búsqueda" subtitle="Refine los resultados por fecha, sede o estado"
            right={
              <button onClick={handleLimpiarFiltros} style={{ background: '#132038', border: '1.5px solid #3b527d', color: '#cbd5e1', padding: '7px 15px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IcX /> Limpiar
              </button>
            }
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Rango de Fechas</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <input type="date" className="fl-input" value={fechaDel} onChange={e => setFechaDel(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>al</span>
                <input type="date" className="fl-input" value={fechaAl} onChange={e => setFechaAl(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Tipo de Fecha</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([['deposito', 'Depósito'], ['concentracion', 'Concentración']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTipoFecha(v)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '8px 10px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '12px', fontWeight: 600,
                      border: `1.5px solid ${tipoFecha === v ? '#38bdf8' : '#2e436e'}`,
                      backgroundColor: tipoFecha === v ? 'rgba(56,189,248,.13)' : '#0f1a30',
                      color: tipoFecha === v ? '#38bdf8' : '#94a3b8',
                      transition: 'all .15s ease',
                    }}
                  >
                    <IcCalendar /> {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Embajada / Consulado</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', pointerEvents: 'none' }}><IcSearch /></span>
                <input type="text" className="fl-input" maxLength={150} placeholder="Escriba para buscar..." value={embajadaConsuladoSearch} onChange={e => setEmbajadaConsuladoSearch(e.target.value)} style={{ width: '100%', paddingLeft: '34px' }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Monto Depósito</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', pointerEvents: 'none', fontSize: '13px', fontWeight: 700 }}>$</span>
                <input type="text" className="fl-input" maxLength={20} placeholder="0.00" value={montoDeposito} onChange={e => setMontoDeposito(e.target.value)} style={{ width: '100%', paddingLeft: '26px' }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Estado</div>
              <select className="fl-select" value={estadoSelect} onChange={e => setEstadoSelect(e.target.value)} style={{ width: '100%' }}>
                <option value="">Todos los estados</option>
                <option value="No identificado">No identificado</option>
                <option value="Identificado / No distribuido">Identificado / No distribuido</option>
                <option value="Identificado Distribuido">Identificado Distribuido</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ backgroundColor: "#16243e", border: "1px solid #2e436e", borderTop: "3px solid #C59B27", borderRadius: "13px", overflowX: "auto", boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 14px 32px rgba(0,0,0,0.35)' }}>
          <table className="sic-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#1c2d4f", color: "#ffffff", borderBottom: "1px solid #3b527d" }}>
                {cols.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as SortField)}
                    style={{ padding: "10px 10px", borderRight: "1px solid #3b527d", verticalAlign: "middle", minWidth: col.minWidth, cursor: "pointer", userSelect: "none", fontSize: '11px', fontWeight: 700, letterSpacing: '0.2px', color: sortField === col.key ? '#38bdf8' : '#e2e8f0' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: col.align === 'center' ? 'center' : 'flex-start', whiteSpace: 'nowrap' }}>
                      {col.label}
                      <span style={{ fontSize: "10px", opacity: sortField === col.key ? 1 : 0.5, flexShrink: 0 }}>{sortField === col.key ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}</span>
                    </span>
                  </th>
                ))}
                <th style={{ padding: "10px 10px", verticalAlign: "middle", minWidth: "160px", fontSize: '11px', fontWeight: 700, letterSpacing: '0.2px', color: '#e2e8f0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>Acciones</span>
                </th>
              </tr>

              <tr style={{ backgroundColor: "#16243e", borderBottom: "2px solid #C59B27" }}>
                {cols.map((col) => (
                  <th key={col.key} style={{ padding: "7px 8px", borderRight: "1px solid #3b527d", minWidth: col.minWidth }}>
                    <input
                      type="text"
                      maxLength={100}
                      placeholder=""
                      value={columnFilters[col.key] || ''}
                      onChange={e => setColumnFilters({ ...columnFilters, [col.key]: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#0f1a30',
                        border: '1.5px solid #2e436e',
                        color: '#e2e8f0',
                        fontSize: '11.5px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                    />
                  </th>
                ))}
                <th style={{ padding: "7px 8px", minWidth: "160px" }}></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13} style={{ padding: "34px", textAlign: "center", color: "#94a3b8" }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 16, height: 16, border: '2.5px solid #2e436e', borderTopColor: '#38bdf8', borderRadius: '50%', display: 'inline-block', animation: 'sic-spin 0.9s linear infinite' }} />
                      Cargando registros...
                    </span>
                    <style>{`@keyframes sic-spin { to { transform: rotate(360deg); } }`}</style>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={13} style={{ padding: "34px", textAlign: "center" }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: '#fca5a5', backgroundColor: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', padding: '11px 17px', borderRadius: '10px', fontSize: '13px' }}>
                      <IcAlert /> {loadError}
                    </div>
                  </td>
                </tr>
              ) : registrosProcesados.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: "44px", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#3b527d' }}><IcInbox /></span>
                      <span style={{ fontSize: '13px' }}>No se encontraron registros que coincidan con la búsqueda.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                registrosProcesados.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #3b527d" }}>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", color: "#64748b", fontWeight: 600, whiteSpace: 'nowrap' }}>{row.id}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", whiteSpace: 'nowrap' }}>{row.fechaDeposito}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", whiteSpace: 'nowrap' }}>{row.fechaConcentracion}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", fontWeight: "700", color: '#e2e8f0', whiteSpace: 'nowrap' }}>${row.deposito.toFixed(2)}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", textAlign: "center" }}>
                      <span style={{ display: 'inline-flex', minWidth: '24px', justifyContent: 'center', backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '5px', padding: '2px 7px', fontSize: '10.5px', fontWeight: 700, color: row.dias > 2 ? '#f59e0b' : '#94a3b8' }}>{row.dias}</span>
                    </td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", color: row.embajadaConsulado === 'NO IDENTIFICADA' ? '#64748b' : '#e2e8f0', fontStyle: row.embajadaConsulado === 'NO IDENTIFICADA' ? 'italic' : 'normal', whiteSpace: 'nowrap' }}>{row.embajadaConsulado}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", fontWeight: 600, whiteSpace: 'nowrap' }}>{formatMoneda(row.ingreso)}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", color: '#cbd5e1', whiteSpace: 'nowrap' }}>{formatMoneda(row.pasaporte)}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", color: '#cbd5e1', whiteSpace: 'nowrap' }}>{formatMoneda(row.dui)}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", color: '#cbd5e1', whiteSpace: 'nowrap' }}>{formatMoneda(row.consular)}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", color: '#C59B27', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatMoneda(row.comision)}</td>
                    <td style={{ padding: "8px 10px", borderRight: "1px solid #3b527d", whiteSpace: 'nowrap' }}><EstadoBadge estado={row.estado} /></td>

                    <td style={{ padding: "8px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                        <button onClick={() => handleDownloadPdf(row.id)} title="Descargar comprobante PDF" className="row-act act-download" style={{ color: "#22c55e" }}>
                          <IcDownload />
                        </button>
                        <button onClick={() => setItemVer(row)} title="Ver detalles" className="row-act act-view" style={{ color: "#eab308" }}>
                          <IcEye />
                        </button>
                        <button onClick={() => setItemEditar(row)} title="Editar registro" className="row-act act-edit" style={{ color: "#38bdf8" }}>
                          <IcEdit />
                        </button>
                        <button onClick={() => setItemEliminar(row)} title="Anular registro" className="row-act act-delete" style={{ color: "#ef4444" }}>
                          <IcTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Nota de pie de tabla */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '11.5px', color: '#64748b' }}>
          <IcInfo />
          Mostrando {registrosProcesados.length} de {registros.length} registros activos · Haga clic en los encabezados para ordenar
        </div>

      </main>

      {/* MODAL: ¿Cómo abrir? */}
      {showOpenModal && (
        <ModalShell onClose={() => setShowOpenModal(false)} maxWidth={460}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "700", color: "#ffffff" }}>
              ¿Cómo deseas abrir el registro?
            </h3>
            <p style={{ margin: "0 0 26px 0", fontSize: "14px", color: "#cbd5e1", lineHeight: "1.65", maxWidth: '360px' }}>
              Puedes abrir el formulario en una <strong style={{ color: '#ffffff' }}>nueva pestaña</strong> si quieres seguir viendo esta bandeja de ingresos sin cerrarla.
            </p>
            <div style={{ display: "flex", gap: "14px", width: '100%', marginBottom: "14px" }}>
              <button
                onClick={handleOpenSamePage}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: '2px solid #3b82f6', color: '#ffffff',
                  padding: '13px 20px', borderRadius: '10px',
                  fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Misma página
              </button>
              <button
                onClick={handleOpenNewTab}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#2563eb', border: 'none', color: '#ffffff',
                  padding: '14px 20px', borderRadius: '10px',
                  fontSize: '15px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,.35)',
                }}
              >
                Nueva pestaña
              </button>
            </div>
            <button
              onClick={() => setShowOpenModal(false)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#ffe4e6', border: 'none', color: '#dc2626',
                padding: '13px 20px', borderRadius: '10px',
                fontSize: '15px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal Ver */}
      {itemVer && (
        <ModalShell onClose={() => setItemVer(null)} maxWidth={520}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1.5px solid #2e436e', marginBottom: '16px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', backgroundColor: 'rgba(234,179,8,.15)', border: '1px solid rgba(234,179,8,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
              <IcEye />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Detalle del Registro</div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>ID #{itemVer.id} · Registrado por {itemVer.creadoPor}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '8px', marginBottom: '20px', fontSize: '12.5px' }}>
            {[
              ['Estado', itemVer.estado],
              ['Región', itemVer.region],
              ['País', itemVer.pais],
              ['Embajada / Consulado', itemVer.embajadaConsulado],
              ['Fecha Depósito', itemVer.fechaDeposito],
              ['Fecha Concentración BCR', itemVer.fechaConcentracion],
              ['Días de Concentración (Hábiles)', String(itemVer.dias)],
              ['Monto Depósito', `$${itemVer.deposito.toFixed(2)}`],
              ['Total Ingresos', formatMoneda(itemVer.ingreso)],
              ['Valor Pasaporte', formatMoneda(itemVer.pasaporte)],
              ['Valor DUI', formatMoneda(itemVer.dui)],
              ['Valor Consular', formatMoneda(itemVer.consular)],
              ['Comisión por Envío', formatMoneda(itemVer.comision)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', backgroundColor: '#0f1a30', border: '1px solid #243552', borderRadius: '9px', padding: '8px 13px' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>{k}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setItemVer(null)} className="btn-full">Cerrar</button>
        </ModalShell>
      )}

      {/* Modal Editar */}
      {itemEditar && (
        <ModalShell onClose={() => setItemEditar(null)} maxWidth={440}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '78px', height: '78px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '22px', boxShadow: '0 8px 24px rgba(37,99,235,.25)' }}>
              <span style={{ color: '#1d4ed8' }}>{svg(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>, 34, 2.2)}</span>
            </div>

            <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              ¿Editar registro?
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.65', maxWidth: '330px' }}>
              ¿Está seguro de modificar el registro de <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>{itemEditar.embajadaConsulado}</strong> por <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>${itemEditar.deposito.toFixed(2)}</strong>?
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(197,155,39,.08)', border: '1px solid rgba(197,155,39,.35)', borderLeft: '4px solid #C59B27', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', color: '#f8fafc', marginBottom: '24px', width: '100%', textAlign: 'left' }}>
              <span style={{ color: '#C59B27', display: 'flex', flexShrink: 0, marginTop: 1 }}><IcShield /></span>
              <span><strong>Aviso Institucional:</strong> Se registrará un evento de auditoría imborrable en la bitácora del sistema.</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={() => setItemEditar(null)}
                style={{
                  flex: 1, background: '#f1f5f9', border: 'none', color: '#334155',
                  padding: '14px 20px', borderRadius: '12px',
                  fontSize: '14.5px', fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer', transition: 'all .15s ease',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEdicion}
                style={{
                  flex: 1, border: 'none', color: '#fff',
                  background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                  padding: '14px 20px', borderRadius: '12px',
                  fontSize: '14.5px', fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer', transition: 'all .15s ease',
                  boxShadow: '0 6px 20px rgba(37,99,235,.45)',
                }}
              >
                Sí, Editar
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Modal Eliminar / Anular */}
      {itemEliminar && (
        <ModalShell danger onClose={() => { setItemEliminar(null); setMotivoEliminacion(''); setActionError(''); }} maxWidth={440}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '78px', height: '78px', borderRadius: '50%', backgroundColor: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '22px', boxShadow: '0 8px 24px rgba(225,29,72,.25)' }}>
              <span style={{ color: '#be123c' }}>{svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 36, 2.2)}</span>
            </div>

            <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
              ¿Anular registro?
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.65', maxWidth: '330px' }}>
              ¿Está seguro de anular el registro de <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>{itemEliminar.embajadaConsulado}</strong> por <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>${itemEliminar.deposito.toFixed(2)}</strong>? Ingrese el motivo (mínimo 5 caracteres).
            </p>

            <div style={{ width: '100%', marginBottom: '22px' }}>
              <textarea
                rows={3}
                required
                minLength={5}
                maxLength={500}
                placeholder="Motivo (Ej. Error de digitación, duplicado...)"
                value={motivoEliminacion}
                onChange={e => setMotivoEliminacion(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a1526',
                  border: '1.5px solid #2e436e',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  padding: '14px 16px',
                  fontSize: '13.5px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {actionError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '18px', width: '100%' }}>
                <IcAlert /> {actionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={() => { setItemEliminar(null); setMotivoEliminacion(''); setActionError(''); }}
                style={{
                  flex: 1, background: '#ffe4e6', border: 'none', color: '#be123c',
                  padding: '14px 20px', borderRadius: '12px',
                  fontSize: '14.5px', fontWeight: 700, fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                disabled={actionLoading || motivoEliminacion.trim().length < 5}
                style={{
                  flex: 1, border: 'none', color: '#fff',
                  background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)',
                  padding: '14px 20px', borderRadius: '12px',
                  fontSize: '14.5px', fontWeight: 700, fontFamily: 'inherit',
                  cursor: actionLoading || motivoEliminacion.trim().length < 5 ? 'not-allowed' : 'pointer',
                  opacity: actionLoading || motivoEliminacion.trim().length < 5 ? .45 : 1,
                }}
                onClick={async () => {
                  if (motivoEliminacion.trim().length < 5) return;
                  setActionLoading(true);
                  setActionError('');
                  try {
                    await fetchApi(`/records/${itemEliminar.id}`, {
                      method: 'DELETE',
                      body: JSON.stringify({ motivo: motivoEliminacion.trim() }),
                    });
                    setRegistros(registros.filter(r => r.id !== itemEliminar.id));
                    setItemEliminar(null);
                    setMotivoEliminacion('');
                  } catch (err: any) {
                    setActionError(err.message || 'Error al anular');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? 'Anulando...' : 'Anular Registro'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
