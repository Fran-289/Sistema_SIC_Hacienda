'use client';

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { fetchApi, downloadApiFile, getUser } from '@/lib/api';

interface ConsulateItem {
  id: number;
  code: string | null;
  type: string;
  region: string;
  country: string;
  location: string;
  address: string | null;
  phone: string | null;
  contactEmail: string | null;
  status: string;
}

interface ConsulateFormState {
  code: string;
  type: string;
  region: string;
  country: string;
  location: string;
  address: string;
  phone: string;
  contactEmail: string;
  status: string;
  statusReason: string;
}

type SortField = 'id' | 'code' | 'type' | 'region' | 'country' | 'location' | 'status';
type SortOrder = 'asc' | 'desc' | null;

const OFFICIAL_REGIONS = [
  'NORTEAMERICA',
  'CENTRO AMÉRICA Y EL CARIBE',
  'SURAMERICA',
  'EUROPA',
  'ASIA Y OCEANÍA',
  'ÁFRICA Y MEDIO ORIENTE',
];

const EMPTY_FORM: ConsulateFormState = {
  code: '',
  type: 'CONSULADO',
  region: 'NORTEAMERICA',
  country: '',
  location: '',
  address: '',
  phone: '',
  contactEmail: '',
  status: 'ACTIVO',
  statusReason: '',
};

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

/* ---------- Iconos ---------- */
const svg = (children: ReactNode, size = 18, sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcGlobe = () => svg(<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>, 22, 1.9);
const IcBuilding = () => svg(<><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="9.01" y2="6" /><line x1="15" y1="6" x2="15.01" y2="6" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /><line x1="9" y1="14" x2="9.01" y2="14" /><line x1="15" y1="14" x2="15.01" y2="14" /><path d="M9 22v-4h6v4" /></>, 18, 1.9);
const IcFlag = () => svg(<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>, 18, 1.9);
const IcCheckCircle = () => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, 18, 1.9);
const IcFilter = () => svg(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>, 17, 2);
const IcPlus = () => svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 17, 2.4);
const IcDownload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, 16, 2);
const IcSearch = () => svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>, 15, 2);
const IcEye = () => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 13, 2.1);
const IcEdit = () => svg(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>, 13, 2.1);
const IcPower = () => svg(<><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></>, 13, 2.2);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);
const IcPhone = () => svg(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>, 12, 2);
const IcMail = () => svg(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>, 12, 2);
const IcAlert = () => svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 16, 2);
const IcInfo = () => svg(<><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12" y2="8.1" /></>, 15, 2);

/* ---------- Subcomponentes ---------- */
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

function TipoBadge({ type }: { type: string }) {
  const upper = (type || '').toUpperCase();
  let c = '#38bdf8';
  if (upper === 'EMBAJADA') c = '#eab308';
  else if (upper.includes('MISI')) c = '#a855f7';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      backgroundColor: `${c}18`, border: `1px solid ${c}55`, color: c,
      borderRadius: '7px', padding: '2.5px 8px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {upper}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = (status || '').toUpperCase() === 'ACTIVO';
  const c = active ? '#22c55e' : '#f87171';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      backgroundColor: `${c}18`, border: `1px solid ${c}55`, color: c,
      borderRadius: '999px', padding: '2.5px 9px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: c, flexShrink: 0 }} />
      {active ? 'ACTIVO' : 'INACTIVO'}
    </span>
  );
}

function ModalShell({ children, onClose, maxWidth = 560 }: { children: ReactNode; onClose: () => void; maxWidth?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 16, 0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: '#101c30',
          border: '1px solid #2e436e',
          borderTop: '3px solid #C59B27',
          borderRadius: '18px',
          padding: '30px 28px 26px',
          maxWidth: `${maxWidth}px`,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          color: '#fff',
          boxShadow: '0 40px 90px rgba(0,0,0,0.8)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(148,163,184,.1)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s' }}
        >
          <IcX />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Página Principal ---------- */
export default function DirectorioPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [consulates, setConsulates] = useState<ConsulateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filtros superiores y por columna
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField | null>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Modales
  const [itemVer, setItemVer] = useState<ConsulateItem | null>(null);
  const [itemHistory, setItemHistory] = useState<{ id: number; userName: string; action: string; details: string; createdAt: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsulateItem | null>(null);
  const [form, setForm] = useState<ConsulateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Activar / Desactivar con motivo obligatorio
  const [itemToggleStatus, setItemToggleStatus] = useState<ConsulateItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const cargarConsulados = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await fetchApi('/consulates?includeInactive=true');
      setConsulates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err.message || 'No se pudo cargar el Directorio Consular');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getUser();
    setIsAdmin(u?.role === 'ADMIN');
    cargarConsulados();
  }, []);

  useEffect(() => {
    if (!itemVer) {
      setItemHistory([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    fetchApi(`/consulates/${itemVer.id}/history`)
      .then(data => {
        if (!cancelled) setItemHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setItemHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemVer]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 4500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const availableRegions = useMemo(() => {
    const set = new Set<string>(OFFICIAL_REGIONS);
    consulates.forEach(c => {
      if (c.region) set.add(c.region.toUpperCase());
    });
    return Array.from(set);
  }, [consulates]);

  const kpis = useMemo(() => {
    const total = consulates.length;
    const embajadas = consulates.filter(c => c.type?.toUpperCase() !== 'CONSULADO').length;
    const consuladosCount = consulates.filter(c => c.type?.toUpperCase() === 'CONSULADO').length;
    const activas = consulates.filter(c => c.status?.toUpperCase() === 'ACTIVO').length;
    const inactivas = total - activas;
    return { total, embajadas, consuladosCount, activas, inactivas };
  }, [consulates]);

  const filteredConsulates = useMemo(() => {
    const q = normalizeText(searchQuery);
    return consulates
      .filter(c => {
        if (regionFilter && c.region?.toUpperCase() !== regionFilter) return false;
        if (typeFilter && c.type?.toUpperCase() !== typeFilter) return false;
        if (statusFilter && c.status?.toUpperCase() !== statusFilter) return false;
        if (q) {
          const haystack = normalizeText(
            `${c.id} ${c.code || ''} ${c.type} ${c.region} ${c.country} ${c.location} ${c.address || ''} ${c.phone || ''} ${c.contactEmail || ''}`
          );
          if (!haystack.includes(q)) return false;
        }

        // Filtros por columna
        for (const [colKey, rawFilter] of Object.entries(columnFilters)) {
          const cf = normalizeText(rawFilter);
          if (!cf) continue;
          if (colKey === 'contacto') {
            const contactText = normalizeText(`${c.phone || ''} ${c.contactEmail || ''}`);
            if (!contactText.includes(cf)) return false;
          } else if (colKey === 'location') {
            const locText = normalizeText(`${c.location || ''} ${c.address || ''}`);
            if (!locText.includes(cf)) return false;
          } else {
            const cellVal = normalizeText(String((c as any)[colKey] ?? ''));
            if (!cellVal.includes(cf)) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (!sortField || !sortOrder) return 0;
        if (sortField === 'id') {
          return sortOrder === 'asc' ? a.id - b.id : b.id - a.id;
        }
        const aStr = normalizeText(String(a[sortField] || ''));
        const bStr = normalizeText(String(b[sortField] || ''));
        if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [consulates, searchQuery, regionFilter, typeFilter, statusFilter, columnFilters, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(null);
        setSortOrder(null);
      } else setSortOrder('asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const hasColumnFilters = Object.values(columnFilters).some(v => v.trim() !== '');
  const hasFilters = Boolean(searchQuery || regionFilter || typeFilter || statusFilter || hasColumnFilters);

  const limpiarFiltros = () => {
    setSearchQuery('');
    setRegionFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setColumnFilters({});
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: ConsulateItem) => {
    setEditingItem(item);
    setForm({
      code: item.code || '',
      type: item.type || 'CONSULADO',
      region: item.region || 'NORTEAMERICA',
      country: item.country || '',
      location: item.location || '',
      address: item.address || '',
      phone: item.phone || '',
      contactEmail: item.contactEmail || '',
      status: item.status || 'ACTIVO',
      statusReason: '',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const isStatusChangedInEdit = Boolean(
    editingItem && (editingItem.status || 'ACTIVO').toUpperCase() !== (form.status || 'ACTIVO').toUpperCase()
  );

  const validateForm = (): string | null => {
    const code = form.code.trim();
    if (code && !/^[A-Za-z0-9\-_]{2,30}$/.test(code)) {
      return 'El código solo permite letras, números, guiones (-) o guion bajo (_) entre 2 y 30 caracteres.';
    }
    if (!form.type.trim()) return 'Seleccione el tipo de sede.';
    if (!form.region.trim()) return 'Seleccione la región geográfica.';
    if (!form.country.trim()) return 'El país es obligatorio.';
    if (!form.location.trim()) return 'La ciudad o ubicación de la sede es obligatoria.';
    const phone = form.phone.trim();
    if (phone.length > 50) {
      return 'El teléfono no puede exceder 50 caracteres.';
    }
    const email = form.contactEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Si ingresa un correo electrónico, asegúrese de que tenga formato válido (ej. sede@rree.gob.sv).';
    }
    if (isStatusChangedInEdit && form.statusReason.trim().length < 5) {
      return 'Debe ingresar una justificación obligatoria (mínimo 5 caracteres) para cambiar el estado operativo.';
    }
    return null;
  };

  const handleSaveConsulate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateForm();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    const payload: Record<string, any> = {
      code: form.code.trim() ? form.code.trim().toUpperCase() : null,
      type: form.type.trim().toUpperCase(),
      region: form.region.trim().toUpperCase(),
      country: form.country.trim(),
      location: form.location.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      contactEmail: form.contactEmail.trim() ? form.contactEmail.trim().toLowerCase() : null,
      status: form.status.trim().toUpperCase(),
    };

    if (isStatusChangedInEdit) {
      payload.statusReason = form.statusReason.trim();
    }

    try {
      setSaving(true);
      setFormError('');
      if (editingItem) {
        await fetchApi(`/consulates/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Sede "${payload.location}" actualizada correctamente.`);
      } else {
        await fetchApi('/consulates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Sede "${payload.location}" registrada exitosamente en el directorio.`);
      }
      setShowFormModal(false);
      setEditingItem(null);
      await cargarConsulados();
    } catch (err: any) {
      setFormError(err.message || 'No se pudo guardar la sede consular.');
    } finally {
      setSaving(false);
    }
  };

  const closeStatusModal = () => {
    if (statusLoading) return;
    setItemToggleStatus(null);
    setStatusReason('');
    setStatusError('');
  };

  const handleConfirmToggleStatus = async () => {
    if (!itemToggleStatus) return;
    const cleanReason = statusReason.trim();
    if (cleanReason.length < 5) {
      setStatusError('Debe ingresar obligatoriamente el motivo o justificación (mínimo 5 caracteres).');
      return;
    }

    const nextStatus = itemToggleStatus.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      setStatusLoading(true);
      setStatusError('');
      await fetchApi(`/consulates/${itemToggleStatus.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus,
          reason: cleanReason,
        }),
      });
      setSuccessMsg(`Estado de "${itemToggleStatus.location}" cambiado a ${nextStatus}.`);
      setItemToggleStatus(null);
      setStatusReason('');
      await cargarConsulados();
    } catch (err: any) {
      setStatusError(err.message || 'No se pudo actualizar el estado de la sede.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await downloadApiFile('/consulates/export', 'directorio_consular.xlsx');
    } catch (err: any) {
      setLoadError(err.message || 'No se pudo exportar el Directorio Consular');
    } finally {
      setExporting(false);
    }
  };

  const cols: { key: SortField | 'contacto'; label: string; width?: string; align?: 'left' | 'center'; sortable: boolean }[] = [
    { key: 'id', label: 'ID', width: '48px', align: 'center', sortable: true },
    { key: 'code', label: 'Código', width: '108px', align: 'center', sortable: true },
    { key: 'type', label: 'Tipo', width: '122px', align: 'center', sortable: true },
    { key: 'region', label: 'Región', width: '150px', align: 'left', sortable: true },
    { key: 'country', label: 'País', width: '124px', align: 'left', sortable: true },
    { key: 'location', label: 'Sede / Ubicación', align: 'left', sortable: true },
    { key: 'contacto', label: 'Contacto (Opcional)', width: '175px', align: 'left', sortable: false },
    { key: 'status', label: 'Estado', width: '96px', align: 'center', sortable: true },
  ];

  const isStatusReasonValid = statusReason.trim().length >= 5;

  return (
    <>
      <style jsx global>{`
        .fl-input, .fl-select, .fl-textarea {
          background: #0f1a30;
          border: 1.5px solid #2e436e;
          color: #e2e8f0;
          padding: 8px 11px;
          border-radius: 8px;
          font-size: 12.5px;
          font-family: inherit;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          color-scheme: dark;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .fl-input:focus, .fl-select:focus, .fl-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, .16);
        }
        .fl-select {
          appearance: none;
          -webkit-appearance: none;
          padding-right: 30px;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
        }
        select option { background-color: #0f1a30; color: #fff; }

        .row-act {
          width: 30px; height: 30px;
          border-radius: 9px;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
        }
        .row-act.act-view { background: rgba(234,179,8,.12); color: #facc15; }
        .row-act.act-edit { background: rgba(56,189,248,.12); color: #38bdf8; }
        .row-act.act-off { background: rgba(239,68,68,.12); color: #f87171; }
        .row-act.act-on { background: rgba(34,197,94,.14); color: #4ade80; }
        .row-act:hover { transform: translateY(-1px) scale(1.06); }

        .sic-table tbody tr { transition: background .12s ease; }
        .sic-table tbody tr:hover { background: rgba(59, 130, 246, .07); }
      `}</style>

      <main style={{ flex: 1, padding: '18px 20px', overflowX: 'hidden', maxWidth: '100%' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
            background: 'linear-gradient(145deg, #d4a93a 0%, #C59B27 55%, #a37e1c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#0f1a30',
            boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.35), 0 8px 20px rgba(197,155,39,.38)',
            border: '1px solid rgba(255,255,255,.15)',
          }}>
            <IcGlobe />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Directorio de Consulados y Embajadas
              </h1>
              <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#0f1a30', backgroundColor: '#38bdf8', borderRadius: '999px', padding: '3px 9px' }}>
                {consulates.length} sedes
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
              Catálogo oficial de representaciones diplomáticas y consulares habilitadas · Ministerio de Hacienda
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button
                onClick={handleOpenCreate}
                style={{
                  background: '#2563eb',
                  color: '#fff', border: 'none', padding: '11px 20px', borderRadius: '10px',
                  fontSize: '13.5px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                }}
              >
                <IcPlus /> Nueva Sede
              </button>
            )}
            <button
              onClick={handleExportExcel}
              disabled={exporting || consulates.length === 0}
              style={{
                background: 'transparent',
                color: '#93c5fd', border: '2px solid #3b82f6', padding: '9px 20px', borderRadius: '10px',
                fontSize: '13.5px', fontWeight: 600,
                cursor: exporting || consulates.length === 0 ? 'not-allowed' : 'pointer',
                opacity: exporting || consulates.length === 0 ? 0.65 : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <IcDownload /> {exporting ? 'Exportando...' : 'Descargar Directorio (Excel)'}
            </button>
          </div>
        </div>

        {/* Alertas */}
        {successMsg && (
          <div style={{ marginBottom: '14px', padding: '11px 15px', borderRadius: '10px', backgroundColor: 'rgba(34, 197, 94, 0.14)', border: '1px solid rgba(34, 197, 94, 0.45)', color: '#86efac', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer' }}><IcX /></button>
          </div>
        )}

        {loadError && (
          <div style={{ marginBottom: '14px', padding: '11px 15px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#fca5a5', fontSize: '12.5px', fontWeight: 600 }}>
            {loadError}
          </div>
        )}

        {/* Tarjetas KPI con borde superior institucional */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {[
            { label: 'Total de Sedes', value: kpis.total, sub: 'Registradas en catálogo', color: '#38bdf8', icon: <IcGlobe /> },
            { label: 'Embajadas / Misiones', value: kpis.embajadas, sub: 'Representaciones diplomáticas', color: '#eab308', icon: <IcFlag /> },
            { label: 'Consulados', value: kpis.consuladosCount, sub: 'Oficinas consulares', color: '#60a5fa', icon: <IcBuilding /> },
            { label: 'Sedes Operativas', value: kpis.activas, sub: `${kpis.inactivas} inactiva(s)`, color: '#22c55e', icon: <IcCheckCircle /> },
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#16243e',
                border: '1px solid #2e436e',
                borderTop: '3px solid #C59B27',
                borderRadius: '13px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 10px 24px rgba(0,0,0,0.28)',
              }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                backgroundColor: `${card.color}1a`, border: `1px solid ${card.color}55`,
                color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{card.label}</div>
                <div style={{ fontSize: '21px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>{card.value}</div>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>{card.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tarjeta de Búsqueda y Filtros con borde superior institucional */}
        <section
          style={{
            backgroundColor: '#16243e',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '13px',
            padding: '14px 16px',
            marginBottom: '14px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 12px 28px rgba(0,0,0,0.3)',
          }}
        >
          <SectionTitle
            icon={<IcFilter />}
            color="#3b82f6"
            title="Filtros de Búsqueda"
            subtitle="Filtre por código, ubicación, región geográfica, tipo o estado operativo"
            right={hasFilters ? (
              <button
                onClick={limpiarFiltros}
                style={{ background: '#132038', border: '1.5px solid #3b527d', color: '#cbd5e1', padding: '7px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IcX /> Limpiar
              </button>
            ) : undefined}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: '2 1 240px', minWidth: '210px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                Búsqueda rápida
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex' }}>
                  <IcSearch />
                </span>
                <input
                  type="text"
                  className="fl-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Código, ciudad, país, correo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ flex: '1.2 1 175px', minWidth: '165px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                Región Geográfica
              </label>
              <select className="fl-select" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                <option value="">Todas las regiones</option>
                {availableRegions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 150px', minWidth: '145px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                Tipo de Sede
              </label>
              <select className="fl-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">Todos los tipos</option>
                <option value="EMBAJADA">EMBAJADA</option>
                <option value="CONSULADO">CONSULADO</option>
                <option value="MISIÓN PERMANENTE">MISIÓN PERMANENTE</option>
              </select>
            </div>

            <div style={{ flex: '0.8 1 130px', minWidth: '125px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                Estado
              </label>
              <select className="fl-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          </div>
        </section>

        {/* Tarjeta de Tabla del Directorio con borde superior y líneas de separación completas */}
        <section
          style={{
            backgroundColor: '#16243e',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '13px',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 14px 32px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              className="sic-table"
              style={{
                width: '100%',
                minWidth: '1080px',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                fontSize: '11.5px',
                textAlign: 'left',
              }}
            >
              <colgroup>
                {cols.map(col => (
                  <col key={col.key} style={col.width ? { width: col.width } : undefined} />
                ))}
                <col style={{ width: '106px' }} />
              </colgroup>

              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', color: '#ffffff', borderBottom: '1px solid #3b527d' }}>
                  {cols.map(col => {
                    const active = col.sortable && sortField === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key as SortField)}
                        style={{
                          padding: '9px 8px',
                          borderRight: '1px solid #3b527d',
                          verticalAlign: 'middle',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.2px',
                          color: active ? '#38bdf8' : '#e2e8f0',
                          cursor: col.sortable ? 'pointer' : 'default',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: col.align === 'center' ? 'center' : 'flex-start',
                            gap: '4px',
                          }}
                        >
                          {col.label}
                          {col.sortable && (
                            <span style={{ opacity: active ? 1 : 0.5, fontSize: '10px' }}>
                              {active ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                  <th
                    style={{
                      padding: '9px 8px',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.2px',
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Acciones
                  </th>
                </tr>

                {/* Fila de filtros por columna ajustada a cada ancho */}
                <tr style={{ backgroundColor: '#16243e', borderBottom: '2px solid #C59B27' }}>
                  {cols.map(col => (
                    <th key={col.key} style={{ padding: '6px 6px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        maxLength={100}
                        value={columnFilters[col.key] || ''}
                        onChange={e => setColumnFilters({ ...columnFilters, [col.key]: e.target.value })}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          background: '#0f1a30',
                          border: '1.5px solid #2e436e',
                          color: '#e2e8f0',
                          fontSize: '11px',
                          padding: '5px 6px',
                          borderRadius: '7px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          textAlign: col.align === 'center' ? 'center' : 'left',
                        }}
                      />
                    </th>
                  ))}
                  <th style={{ padding: '6px 6px' }}></th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '38px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Cargando catálogo consular...
                    </td>
                  </tr>
                ) : filteredConsulates.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '38px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No se encontraron sedes consulares con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredConsulates.map(item => {
                    const isActive = item.status?.toUpperCase() === 'ACTIVO';
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #3b527d', opacity: isActive ? 1 : 0.78 }}>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', color: '#64748b', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {item.id}
                        </td>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.code ? (
                            <span style={{ backgroundColor: '#0f1a30', border: '1px solid #2e436e', borderRadius: '6px', padding: '2.5px 6px', fontSize: '10.5px', color: '#93c5fd' }}>
                              {item.code}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <TipoBadge type={item.type} />
                        </td>
                        <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', color: '#cbd5e1', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.region}>
                          {item.region}
                        </td>
                        <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', color: '#f1f5f9', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.country}>
                          {item.country}
                        </td>
                        <td style={{ padding: '8px 10px', borderRight: '1px solid #3b527d', overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.location}>
                            {item.location}
                          </div>
                          {item.address && (
                            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.address}>
                              {item.address}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', fontSize: '11px', color: '#cbd5e1', overflow: 'hidden' }}>
                          {item.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.phone}>
                              <span style={{ color: '#64748b', flexShrink: 0 }}><IcPhone /></span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.phone}</span>
                            </div>
                          )}
                          {item.contactEmail && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#93c5fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.contactEmail}>
                              <span style={{ color: '#64748b', flexShrink: 0 }}><IcMail /></span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.contactEmail}</span>
                            </div>
                          )}
                          {!item.phone && !item.contactEmail && (
                            <span style={{ color: '#475569', fontSize: '10.5px', fontStyle: 'italic' }}>Sin registrar</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              className="row-act act-view"
                              title="Ver ficha detallada"
                              onClick={() => setItemVer(item)}
                            >
                              <IcEye />
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  className="row-act act-edit"
                                  title="Editar sede consular"
                                  onClick={() => handleOpenEdit(item)}
                                >
                                  <IcEdit />
                                </button>
                                <button
                                  className={`row-act ${isActive ? 'act-off' : 'act-on'}`}
                                  title={isActive ? 'Desactivar sede (requiere motivo)' : 'Activar sede (requiere motivo)'}
                                  onClick={() => {
                                    setStatusReason('');
                                    setStatusError('');
                                    setItemToggleStatus(item);
                                  }}
                                >
                                  <IcPower />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Nota al pie de la tabla */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '14px', fontSize: '11.5px', color: '#64748b', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <IcInfo />
            Mostrando <strong style={{ color: '#cbd5e1' }}>{filteredConsulates.length}</strong> de <strong style={{ color: '#cbd5e1' }}>{consulates.length}</strong> sedes registradas · Haga clic en los encabezados para ordenar
          </span>
          {!isAdmin && (
            <span>
              Modo consulta · La creación y edición están reservadas para administradores
            </span>
          )}
        </div>
      </main>

      {/* Modal: Ver Ficha Completa */}
      {itemVer && (
        <ModalShell onClose={() => setItemVer(null)} maxWidth={640}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1.5px solid #2e436e', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', backgroundColor: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.45)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcEye />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{itemVer.location}</h3>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>ID #{itemVer.id} · {itemVer.country} · {itemVer.region}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', overflow: 'hidden', fontSize: '12.5px', backgroundColor: '#0c1628' }}>
            {[
              ['Código Identificador', itemVer.code || 'Sin código asignado'],
              ['Tipo de Sede', itemVer.type],
              ['Estado Operativo', itemVer.status],
              ['Región Geográfica', itemVer.region],
              ['País', itemVer.country],
              ['Ciudad / Ubicación', itemVer.location],
              ['Dirección Oficial', itemVer.address || 'No registrada'],
              ['Teléfono Oficial', itemVer.phone || 'No registrado'],
              ['Correo Institucional', itemVer.contactEmail || 'No registrado'],
            ].map(([label, val], i, arr) => (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '165px 1fr',
                  borderBottom: i < arr.length - 1 ? '1px solid #3b527d' : 'none',
                }}
              >
                <div style={{ padding: '9px 12px', backgroundColor: '#132038', borderRight: '1px solid #3b527d', color: '#94a3b8', fontWeight: 700, fontSize: '11.5px' }}>
                  {label}
                </div>
                <div style={{ padding: '9px 12px', color: '#e2e8f0', wordBreak: 'break-word' }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {/* Historial de movimientos y cambios de estado con líneas de separación */}
          <div style={{ marginTop: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
              Historial de Cambios y Justificaciones
            </div>
            <div style={{ border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', overflow: 'hidden', backgroundColor: '#0c1628' }}>
              {loadingHistory ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                  Cargando historial...
                </div>
              ) : itemHistory.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                  Sin movimientos posteriores al registro inicial en el catálogo.
                </div>
              ) : (
                <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                    <colgroup>
                      <col style={{ width: '122px' }} />
                      <col style={{ width: '130px' }} />
                      <col />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27', color: '#e2e8f0' }}>
                        <th style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>Fecha</th>
                        <th style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>Usuario</th>
                        <th style={{ padding: '8px 9px' }}>Detalle / Justificación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemHistory.map((h, idx) => (
                        <tr key={h.id || idx} style={{ borderBottom: idx < itemHistory.length - 1 ? '1px solid #3b527d' : 'none' }}>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #3b527d', color: '#94a3b8', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                            {h.createdAt ? h.createdAt.replace('T', ' ').slice(0, 16) : '-'}
                          </td>
                          <td style={{ padding: '8px 10px', borderRight: '1px solid #3b527d', color: '#93c5fd', fontWeight: 600, verticalAlign: 'top' }}>
                            {h.userName}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#e2e8f0', lineHeight: 1.45, verticalAlign: 'top' }}>
                            {h.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
            {isAdmin && (
              <button
                onClick={() => {
                  const target = itemVer;
                  setItemVer(null);
                  handleOpenEdit(target);
                }}
                style={{ background: 'rgba(56,189,248,.16)', border: '1px solid rgba(56,189,248,.45)', color: '#38bdf8', padding: '9px 16px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Editar Sede
              </button>
            )}
            <button
              onClick={() => setItemVer(null)}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '9px 18px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal: Crear / Editar Sede */}
      {showFormModal && (
        <ModalShell onClose={() => !saving && setShowFormModal(false)} maxWidth={620}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 800 }}>
            {editingItem ? 'Editar Sede Consular' : 'Registrar Nueva Sede Consular'}
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '12px', color: '#94a3b8' }}>
            Complete los datos oficiales de identificación, ubicación y contacto de la representación.
          </p>

          {formError && (
            <div style={{ marginBottom: '14px', padding: '10px 13px', borderRadius: '9px', backgroundColor: 'rgba(239,68,68,.14)', border: '1px solid rgba(239,68,68,.45)', color: '#fca5a5', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IcAlert /> {formError}
            </div>
          )}

          <form onSubmit={handleSaveConsulate} style={{ display: 'grid', gap: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 135px', gap: '11px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Código
                </label>
                <input
                  type="text"
                  className="fl-input"
                  maxLength={30}
                  placeholder="Ej. CON-USA-MIA"
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Tipo de Sede *
                </label>
                <select
                  className="fl-select"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  required
                >
                  <option value="CONSULADO">CONSULADO</option>
                  <option value="EMBAJADA">EMBAJADA</option>
                  <option value="MISIÓN PERMANENTE">MISIÓN PERMANENTE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Estado Operativo *
                </label>
                <select
                  className="fl-select"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  required
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
            </div>

            {isStatusChangedInEdit && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.45)', borderRadius: '10px', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#fcd34d', marginBottom: '6px' }}>
                  Motivo obligatorio del cambio de estado ({editingItem?.status} → {form.status}) *
                </label>
                <textarea
                  className="fl-textarea"
                  rows={2}
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="Indique por qué se activa o inactiva esta sede consular (mínimo 5 caracteres)..."
                  value={form.statusReason}
                  onChange={e => setForm({ ...form, statusReason: e.target.value })}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Región Geográfica *
                </label>
                <select
                  className="fl-select"
                  value={form.region}
                  onChange={e => setForm({ ...form, region: e.target.value })}
                  required
                >
                  {availableRegions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  País *
                </label>
                <input
                  type="text"
                  className="fl-input"
                  maxLength={100}
                  placeholder="Ej. Estados Unidos"
                  value={form.country}
                  onChange={e => setForm({ ...form, country: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                Ciudad / Ubicación de la Sede *
              </label>
              <input
                type="text"
                className="fl-input"
                maxLength={150}
                placeholder="Ej. Miami, Florida"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '195px 1fr', gap: '11px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Teléfono <span style={{ color: '#64748b', fontWeight: 500 }}>(Opcional)</span>
                </label>
                <input
                  type="text"
                  className="fl-input"
                  maxLength={50}
                  placeholder="Ej. +1 (202) 595-7500"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Correo Electrónico <span style={{ color: '#64748b', fontWeight: 500 }}>(Opcional)</span>
                </label>
                <input
                  type="email"
                  className="fl-input"
                  maxLength={150}
                  placeholder="Ej. consulado@rree.gob.sv"
                  value={form.contactEmail}
                  onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                Dirección Oficial
              </label>
              <textarea
                className="fl-textarea"
                rows={2}
                maxLength={500}
                placeholder="Dirección física completa de la embajada o consulado..."
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowFormModal(false)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '9px 16px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || (isStatusChangedInEdit && form.statusReason.trim().length < 5)}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 20px',
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: saving || (isStatusChangedInEdit && form.statusReason.trim().length < 5) ? 'not-allowed' : 'pointer',
                  opacity: saving || (isStatusChangedInEdit && form.statusReason.trim().length < 5) ? 0.5 : 1,
                }}
              >
                {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Registrar Sede'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Activar / Desactivar Sede con Motivo Obligatorio */}
      {itemToggleStatus && (
        <ModalShell onClose={closeStatusModal} maxWidth={460}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: itemToggleStatus.status === 'ACTIVO' ? '#ffe4e6' : '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: itemToggleStatus.status === 'ACTIVO'
                  ? '0 8px 24px rgba(225,29,72,.25)'
                  : '0 8px 24px rgba(22,163,74,.25)',
              }}
            >
              <span style={{ color: itemToggleStatus.status === 'ACTIVO' ? '#be123c' : '#15803d' }}>
                {svg(
                  itemToggleStatus.status === 'ACTIVO'
                    ? <><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>
                    : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
                  34,
                  2.2
                )}
              </span>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '19px', fontWeight: 800, color: '#fff' }}>
              {itemToggleStatus.status === 'ACTIVO' ? '¿Desactivar sede consular?' : '¿Reactivar sede consular?'}
            </h3>

            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '370px' }}>
              {itemToggleStatus.status === 'ACTIVO' ? (
                <>
                  Está por inactivar <strong style={{ color: '#e2e8f0' }}>{itemToggleStatus.type} — {itemToggleStatus.location}</strong> ({itemToggleStatus.country}). Dejará de mostrarse para nuevos ingresos, conservando su historial.
                </>
              ) : (
                <>
                  Está por reactivar <strong style={{ color: '#e2e8f0' }}>{itemToggleStatus.type} — {itemToggleStatus.location}</strong> ({itemToggleStatus.country}) para habilitar nuevamente el registro de ingresos.
                </>
              )}
            </p>

            <div style={{ width: '100%', textAlign: 'left', marginBottom: '18px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                <span>
                  Motivo / Justificación <span style={{ color: '#f43f5e' }}>*</span>
                </span>
                <span style={{ fontSize: '10.5px', color: isStatusReasonValid ? '#4ade80' : '#f59e0b' }}>
                  {isStatusReasonValid ? 'Listo' : `Mínimo 5 caracteres (${statusReason.trim().length}/5)`}
                </span>
              </label>
              <textarea
                rows={3}
                required
                minLength={5}
                maxLength={500}
                placeholder={
                  itemToggleStatus.status === 'ACTIVO'
                    ? 'Escriba obligatoriamente por qué se inactiva esta sede (ej. Cierre temporal, fusión consular, instrucción oficial...)'
                    : 'Escriba obligatoriamente por qué se reactiva esta sede (ej. Reapertura autorizada, habilitación oficial...)'
                }
                value={statusReason}
                onChange={e => {
                  setStatusReason(e.target.value);
                  if (statusError) setStatusError('');
                }}
                style={{
                  width: '100%',
                  background: '#0a1526',
                  border: `1.5px solid ${statusError ? '#ef4444' : '#2e436e'}`,
                  borderRadius: '11px',
                  color: '#e2e8f0',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {statusError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', padding: '10px 13px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px', width: '100%', textAlign: 'left', boxSizing: 'border-box' }}>
                <IcAlert /> {statusError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                disabled={statusLoading}
                onClick={closeStatusModal}
                style={{
                  flex: 1,
                  background: '#ffe4e6',
                  border: 'none',
                  color: '#be123c',
                  padding: '13px 18px',
                  borderRadius: '11px',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: statusLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={statusLoading || !isStatusReasonValid}
                onClick={handleConfirmToggleStatus}
                style={{
                  flex: 1,
                  border: 'none',
                  color: '#fff',
                  background: itemToggleStatus.status === 'ACTIVO'
                    ? 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)'
                    : 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                  padding: '13px 18px',
                  borderRadius: '11px',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: statusLoading || !isStatusReasonValid ? 'not-allowed' : 'pointer',
                  opacity: statusLoading || !isStatusReasonValid ? 0.42 : 1,
                }}
              >
                {statusLoading
                  ? 'Procesando...'
                  : itemToggleStatus.status === 'ACTIVO'
                    ? 'Confirmar Inactivación'
                    : 'Confirmar Activación'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
