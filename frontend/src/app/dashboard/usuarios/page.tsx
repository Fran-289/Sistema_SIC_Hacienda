'use client';

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { fetchApi, downloadApiFile, getUser, setUser } from '@/lib/api';

interface UserItem {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  role: string;
  status: string;
  permissions: string[];
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
}

interface UserFormState {
  name: string;
  email: string;
  jobTitle: string;
  role: string;
  status: string;
  statusReason: string;
  permissions: string[];
  password: string;
}

type SortField = 'id' | 'name' | 'email' | 'role' | 'lastLoginAt' | 'status';
type SortOrder = 'asc' | 'desc' | null;

const MODULE_OPTIONS = [
  { id: 'ingresos', label: 'Ingresos', fullLabel: 'Bandeja y Registro de Ingresos' },
  { id: 'reportes', label: 'Reportes', fullLabel: 'Bandeja de Reportes' },
  { id: 'tareas', label: 'Tareas', fullLabel: 'Tareas Pendientes' },
  { id: 'directorio', label: 'Directorio', fullLabel: 'Directorio Consular' },
];

const DEFAULT_MODULES = ['ingresos', 'reportes', 'tareas', 'directorio'];

const EMPTY_FORM: UserFormState = {
  name: '',
  email: '',
  jobTitle: '',
  role: 'USER',
  status: 'ACTIVO',
  statusReason: '',
  permissions: ['ingresos', 'directorio'],
  password: '',
};

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return 'Sin ingresos';
  const clean = iso.replace('T', ' ');
  const datePart = clean.slice(0, 10);
  const timePart = clean.slice(11, 16);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return clean.slice(0, 16);
  return `${d}/${m}/${y}${timePart ? ` ${timePart}` : ''}`;
};

/* ---------- Iconos ---------- */
const svg = (children: ReactNode, size = 18, sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcUsers = () => svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>, 22, 1.9);
const IcShield = () => svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, 18, 1.9);
const IcUserCheck = () => svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><polyline points="17 11 19 13 23 9" /></>, 18, 1.9);
const IcCheckCircle = () => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, 18, 1.9);
const IcFilter = () => svg(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>, 17, 2);
const IcPlus = () => svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 17, 2.4);
const IcDownload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, 16, 2);
const IcSearch = () => svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>, 15, 2);
const IcEye = () => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 13, 2.1);
const IcEyeOff = () => svg(<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>, 15, 2);
const IcEdit = () => svg(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>, 13, 2.1);
const IcKey = () => svg(<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></>, 13, 2.1);
const IcPower = () => svg(<><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></>, 13, 2.2);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);
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

function RoleBadge({ role }: { role: string }) {
  const isAdmin = (role || '').toUpperCase() === 'ADMIN';
  const c = isAdmin ? '#eab308' : '#38bdf8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      backgroundColor: `${c}18`, border: `1px solid ${c}55`, color: c,
      borderRadius: '7px', padding: '2.5px 8px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {isAdmin ? 'ADMIN' : 'OPERADOR'}
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

function checkPasswordRules(pw: string) {
  return {
    length: pw.length >= 8 && pw.length <= 72,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
  };
}

function isPasswordCompliant(pw: string): boolean {
  const r = checkPasswordRules(pw);
  return r.length && r.upper && r.lower && r.digit;
}

/* ---------- Página Principal ---------- */
export default function UsuariosPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField | null>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Modal Ver Ficha e Historial
  const [itemVer, setItemVer] = useState<UserItem | null>(null);
  const [userHistory, setUserHistory] = useState<{ id: number; userName: string; action: string; details: string; createdAt: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal Crear / Editar
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Restablecer Contraseña
  const [itemPasswordReset, setItemPasswordReset] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordNote, setPasswordNote] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');

  // Modal Activar / Desactivar con motivo obligatorio
  const [itemToggleStatus, setItemToggleStatus] = useState<UserItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await fetchApi('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLoadError(err.message || 'No se pudo cargar el listado de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getUser());
    cargarUsuarios();
  }, []);

  useEffect(() => {
    if (!itemVer) {
      setUserHistory([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    fetchApi(`/users/${itemVer.id}/history`)
      .then(data => {
        if (!cancelled) setUserHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setUserHistory([]);
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

  const kpis = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role?.toUpperCase() === 'ADMIN').length;
    const operadores = users.filter(u => u.role?.toUpperCase() !== 'ADMIN').length;
    const activos = users.filter(u => u.status?.toUpperCase() === 'ACTIVO').length;
    const inactivos = total - activos;
    return { total, admins, operadores, activos, inactivos };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = normalizeText(searchQuery);
    return users
      .filter(u => {
        if (roleFilter && u.role?.toUpperCase() !== roleFilter) return false;
        if (statusFilter && u.status?.toUpperCase() !== statusFilter) return false;
        if (q) {
          const haystack = normalizeText(
            `${u.id} ${u.name} ${u.email} ${u.jobTitle || ''} ${u.role} ${(u.permissions || []).join(' ')}`
          );
          if (!haystack.includes(q)) return false;
        }

        for (const [colKey, rawFilter] of Object.entries(columnFilters)) {
          const cf = normalizeText(rawFilter);
          if (!cf) continue;
          if (colKey === 'name') {
            const nameJob = normalizeText(`${u.name} ${u.jobTitle || ''}`);
            if (!nameJob.includes(cf)) return false;
          } else if (colKey === 'modulos') {
            const modStr = u.role?.toUpperCase() === 'ADMIN'
              ? 'acceso total admin ingresos reportes tareas directorio'
              : normalizeText((u.permissions || []).join(' '));
            if (!modStr.includes(cf)) return false;
          } else if (colKey === 'lastLoginAt') {
            const loginStr = normalizeText(formatDateTime(u.lastLoginAt));
            if (!loginStr.includes(cf)) return false;
          } else if (colKey === 'role') {
            const roleLabel = u.role?.toUpperCase() === 'ADMIN' ? 'admin administrador' : 'user operador';
            if (!roleLabel.includes(cf)) return false;
          } else {
            const cellVal = normalizeText(String((u as any)[colKey] ?? ''));
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
  }, [users, searchQuery, roleFilter, statusFilter, columnFilters, sortField, sortOrder]);

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
  const hasFilters = Boolean(searchQuery || roleFilter || statusFilter || hasColumnFilters);

  const limpiarFiltros = () => {
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
    setColumnFilters({});
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: UserItem) => {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      email: item.email || '',
      jobTitle: item.jobTitle || '',
      role: item.role || 'USER',
      status: item.status || 'ACTIVO',
      statusReason: '',
      permissions: Array.isArray(item.permissions) && item.permissions.length > 0 ? item.permissions : DEFAULT_MODULES,
      password: '',
    });
    setShowPassword(false);
    setFormError('');
    setShowFormModal(true);
  };

  const togglePermission = (modId: string) => {
    setForm(prev => {
      const exists = prev.permissions.includes(modId);
      const next = exists ? prev.permissions.filter(p => p !== modId) : [...prev.permissions, modId];
      return { ...prev, permissions: next };
    });
  };

  const isStatusChangedInEdit = Boolean(
    editingItem && (editingItem.status || 'ACTIVO').toUpperCase() !== (form.status || 'ACTIVO').toUpperCase()
  );

  const isEditingSelf = Boolean(editingItem && currentUser && editingItem.id === currentUser.id);

  const validateUserForm = (): string | null => {
    if (form.name.trim().length < 3) return 'El nombre completo debe tener al menos 3 caracteres.';
    const email = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ingrese un correo electrónico institucional válido.';
    if (form.role === 'USER' && form.permissions.length === 0) {
      return 'Seleccione al menos un módulo habilitado para el operador.';
    }
    if (!editingItem) {
      if (!isPasswordCompliant(form.password)) {
        return 'La contraseña inicial debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';
      }
    } else if (form.password.trim() !== '' && !isPasswordCompliant(form.password)) {
      return 'Si desea actualizar la contraseña, debe cumplir con al menos 8 caracteres, mayúscula, minúscula y número.';
    }
    if (isStatusChangedInEdit && form.statusReason.trim().length < 5) {
      return 'Debe ingresar una justificación obligatoria (mínimo 5 caracteres) para cambiar el estado del usuario.';
    }
    return null;
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUserForm();
    if (err) {
      setFormError(err);
      return;
    }

    const payload: Record<string, any> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      jobTitle: form.jobTitle.trim() || null,
      role: form.role,
      status: form.status,
      permissions: form.role === 'ADMIN' ? DEFAULT_MODULES : form.permissions,
    };

    if (!editingItem || form.password.trim() !== '') {
      payload.password = form.password;
    }
    if (isStatusChangedInEdit) {
      payload.statusReason = form.statusReason.trim();
    }

    try {
      setSaving(true);
      setFormError('');
      if (editingItem) {
        const updated = await fetchApi(`/users/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        // Si actualizó su propio perfil en sesión, refrescar datos locales
        if (currentUser && editingItem.id === currentUser.id && updated) {
          const nextLocal = { ...currentUser, name: updated.name, email: updated.email, jobTitle: updated.jobTitle };
          setUser(nextLocal);
          setCurrentUser(nextLocal);
        }
        setSuccessMsg(`Usuario "${payload.name}" actualizado correctamente.`);
      } else {
        await fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuccessMsg(`Usuario "${payload.name}" creado exitosamente.`);
      }
      setShowFormModal(false);
      setEditingItem(null);
      await cargarUsuarios();
    } catch (ex: any) {
      setFormError(ex.message || 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemPasswordReset) return;
    if (!isPasswordCompliant(newPassword)) {
      setResetError('La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    try {
      setResetSaving(true);
      setResetError('');
      await fetchApi(`/users/${itemPasswordReset.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({
          newPassword,
          reason: passwordNote.trim() || null,
        }),
      });
      setSuccessMsg(`Contraseña restablecida correctamente para "${itemPasswordReset.name}".`);
      setItemPasswordReset(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordNote('');
    } catch (ex: any) {
      setResetError(ex.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setResetSaving(false);
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
      await fetchApi(`/users/${itemToggleStatus.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus,
          reason: cleanReason,
        }),
      });
      setSuccessMsg(`Cuenta de "${itemToggleStatus.name}" cambiada a ${nextStatus}.`);
      setItemToggleStatus(null);
      setStatusReason('');
      await cargarUsuarios();
    } catch (ex: any) {
      setStatusError(ex.message || 'No se pudo actualizar el estado del usuario.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await downloadApiFile('/users/export', 'usuarios_sic.xlsx');
    } catch (ex: any) {
      setLoadError(ex.message || 'No se pudo exportar el listado de usuarios');
    } finally {
      setExporting(false);
    }
  };

  const cols: { key: SortField | 'modulos'; label: string; width?: string; align?: 'left' | 'center'; sortable: boolean }[] = [
    { key: 'id', label: 'ID', width: '48px', align: 'center', sortable: true },
    { key: 'name', label: 'Usuario / Cargo', align: 'left', sortable: true },
    { key: 'email', label: 'Correo Institucional', width: '215px', align: 'left', sortable: true },
    { key: 'role', label: 'Rol', width: '112px', align: 'center', sortable: true },
    { key: 'modulos', label: 'Módulos Habilitados', width: '215px', align: 'left', sortable: false },
    { key: 'lastLoginAt', label: 'Último Acceso', width: '132px', align: 'center', sortable: true },
    { key: 'status', label: 'Estado', width: '96px', align: 'center', sortable: true },
  ];

  const isStatusReasonValid = statusReason.trim().length >= 5;
  const pwRules = checkPasswordRules(form.password);
  const resetPwRules = checkPasswordRules(newPassword);

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
          width: 29px; height: 29px;
          border-radius: 8px;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
        }
        .row-act.act-view { background: rgba(234,179,8,.12); color: #facc15; }
        .row-act.act-edit { background: rgba(56,189,248,.12); color: #38bdf8; }
        .row-act.act-key { background: rgba(168,85,247,.14); color: #c084fc; }
        .row-act.act-off { background: rgba(239,68,68,.12); color: #f87171; }
        .row-act.act-on { background: rgba(34,197,94,.14); color: #4ade80; }
        .row-act:hover:not(:disabled) { transform: translateY(-1px) scale(1.06); }
        .row-act:disabled { opacity: 0.32; cursor: not-allowed; }

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
            <IcUsers />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Gestión de Usuarios y Roles
              </h1>
              <span style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#0f1a30', backgroundColor: '#38bdf8', borderRadius: '999px', padding: '3px 9px' }}>
                {users.length} cuentas
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
              Administración de cuentas institucionales, permisos por módulo y seguridad de acceso · Ministerio de Hacienda
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
              <IcPlus /> Nuevo Usuario
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting || users.length === 0}
              style={{
                background: 'transparent',
                color: '#93c5fd', border: '2px solid #3b82f6', padding: '9px 20px', borderRadius: '10px',
                fontSize: '13.5px', fontWeight: 600,
                cursor: exporting || users.length === 0 ? 'not-allowed' : 'pointer',
                opacity: exporting || users.length === 0 ? 0.65 : 1,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              <IcDownload /> {exporting ? 'Exportando...' : 'Descargar Usuarios (Excel)'}
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

        {/* Tarjetas KPI con borde superior dorado institucional */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {[
            { label: 'Total de Cuentas', value: kpis.total, sub: 'Registradas en el sistema', color: '#38bdf8', icon: <IcUsers /> },
            { label: 'Administradores', value: kpis.admins, sub: 'Control total y auditoría', color: '#eab308', icon: <IcShield /> },
            { label: 'Operadores', value: kpis.operadores, sub: 'Acceso por módulos', color: '#60a5fa', icon: <IcUserCheck /> },
            { label: 'Cuentas Activas', value: kpis.activos, sub: `${kpis.inactivos} inactiva(s)`, color: '#22c55e', icon: <IcCheckCircle /> },
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

        {/* Tarjeta de Filtros con borde superior institucional */}
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
            subtitle="Filtre cuentas por nombre, correo institucional, rol asignado o estado operativo"
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
            <div style={{ flex: '2 1 250px', minWidth: '210px' }}>
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
                  placeholder="Nombre, correo, cargo o módulo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
                Rol del Sistema
              </label>
              <select className="fl-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="">Todos los roles</option>
                <option value="ADMIN">ADMIN (Administrador)</option>
                <option value="USER">OPERADOR (USER)</option>
              </select>
            </div>

            <div style={{ flex: '0.85 1 140px', minWidth: '135px' }}>
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

        {/* Tarjeta de Tabla de Usuarios con borde superior y líneas de separación completas */}
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
                minWidth: '1060px',
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
                <col style={{ width: '138px' }} />
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

                {/* Fila de filtros por columna */}
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
                    <td colSpan={8} style={{ padding: '38px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Cargando cuentas de usuario...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '38px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      No se encontraron usuarios con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(item => {
                    const isActive = item.status?.toUpperCase() === 'ACTIVO';
                    const isSelf = Boolean(currentUser && item.id === currentUser.id);
                    const isAdminRole = item.role?.toUpperCase() === 'ADMIN';

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #3b527d', opacity: isActive ? 1 : 0.76 }}>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', color: '#64748b', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {item.id}
                        </td>
                        <td style={{ padding: '8px 10px', borderRight: '1px solid #3b527d', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                              {item.name}
                            </span>
                            {isSelf && (
                              <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: 'rgba(56,189,248,.16)', border: '1px solid rgba(56,189,248,.4)', color: '#38bdf8', borderRadius: '999px', padding: '1px 6px', flexShrink: 0 }}>
                                TÚ
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: item.jobTitle ? '#94a3b8' : '#475569', fontStyle: item.jobTitle ? 'normal' : 'italic', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.jobTitle || 'Cargo sin especificar'}
                          </div>
                        </td>
                        <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', color: '#93c5fd', fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.email}>
                          {item.email}
                        </td>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <RoleBadge role={item.role} />
                        </td>
                        <td style={{ padding: '8px 8px', borderRight: '1px solid #3b527d', overflow: 'hidden' }}>
                          {isAdminRole ? (
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#fde047', backgroundColor: 'rgba(234,179,8,.12)', border: '1px solid rgba(234,179,8,.35)', borderRadius: '6px', padding: '2px 7px' }}>
                              Acceso Total (6 módulos)
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {MODULE_OPTIONS.filter(m => (item.permissions || []).includes(m.id)).map(m => (
                                <span
                                  key={m.id}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#cbd5e1',
                                    backgroundColor: '#0f1a30',
                                    border: '1px solid #2e436e',
                                    borderRadius: '5px',
                                    padding: '1.5px 6px',
                                  }}
                                >
                                  {m.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', textAlign: 'center', fontSize: '11px', color: item.lastLoginAt ? '#cbd5e1' : '#64748b', whiteSpace: 'nowrap' }}>
                          {formatDateTime(item.lastLoginAt)}
                        </td>
                        <td style={{ padding: '8px 6px', borderRight: '1px solid #3b527d', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={item.status} />
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <button
                              className="row-act act-view"
                              title="Ver ficha e historial de accesos"
                              onClick={() => setItemVer(item)}
                            >
                              <IcEye />
                            </button>
                            <button
                              className="row-act act-edit"
                              title="Editar datos y permisos"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <IcEdit />
                            </button>
                            <button
                              className="row-act act-key"
                              title="Restablecer contraseña"
                              onClick={() => {
                                setNewPassword('');
                                setConfirmNewPassword('');
                                setPasswordNote('');
                                setResetError('');
                                setShowResetPw(false);
                                setItemPasswordReset(item);
                              }}
                            >
                              <IcKey />
                            </button>
                            <button
                              className={`row-act ${isActive ? 'act-off' : 'act-on'}`}
                              disabled={isSelf && isActive}
                              title={
                                isSelf && isActive
                                  ? 'No puede desactivar su propia cuenta en sesión'
                                  : isActive
                                    ? 'Desactivar usuario (requiere motivo)'
                                    : 'Reactivar usuario (requiere motivo)'
                              }
                              onClick={() => {
                                setStatusReason('');
                                setStatusError('');
                                setItemToggleStatus(item);
                              }}
                            >
                              <IcPower />
                            </button>
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

        {/* Pie de tabla */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '14px', fontSize: '11.5px', color: '#64748b', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
            <IcInfo />
            Mostrando <strong style={{ color: '#cbd5e1' }}>{filteredUsers.length}</strong> de <strong style={{ color: '#cbd5e1' }}>{users.length}</strong> cuentas registradas · Contraseñas cifradas con BCrypt
          </span>
        </div>
      </main>

      {/* Modal: Ver Ficha e Historial */}
      {itemVer && (
        <ModalShell onClose={() => setItemVer(null)} maxWidth={650}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1.5px solid #2e436e', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', backgroundColor: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.45)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcEye />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>{itemVer.name}</h3>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>ID #{itemVer.id} · {itemVer.email}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', overflow: 'hidden', fontSize: '12.5px', backgroundColor: '#0c1628' }}>
            {[
              ['Nombre Completo', itemVer.name],
              ['Correo Institucional', itemVer.email],
              ['Cargo (Opcional)', itemVer.jobTitle || 'No especificado'],
              ['Rol en el Sistema', itemVer.role === 'ADMIN' ? 'ADMIN (Administrador General)' : 'USER (Operador Institucional)'],
              ['Estado Operativo', itemVer.status],
              ['Módulos Habilitados', itemVer.role === 'ADMIN'
                ? 'Acceso Total (Ingresos, Reportes, Tareas, Directorio, Usuarios y Configuración)'
                : MODULE_OPTIONS.filter(m => (itemVer.permissions || []).includes(m.id)).map(m => m.fullLabel).join(' · ') || 'Ninguno'],
              ['Último Inicio de Sesión', formatDateTime(itemVer.lastLoginAt)],
              ['Fecha de Alta', formatDateTime(itemVer.createdAt)],
            ].map(([label, val], i, arr) => (
              <div
                key={label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '175px 1fr',
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

          {/* Historial de Accesos y Cambios */}
          <div style={{ marginTop: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
              Historial de Accesos y Auditoría de la Cuenta
            </div>
            <div style={{ border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', overflow: 'hidden', backgroundColor: '#0c1628' }}>
              {loadingHistory ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                  Cargando bitácora del usuario...
                </div>
              ) : userHistory.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                  Sin registros recientes en la bitácora de auditoría.
                </div>
              ) : (
                <div style={{ maxHeight: '215px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                    <colgroup>
                      <col style={{ width: '122px' }} />
                      <col style={{ width: '148px' }} />
                      <col />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27', color: '#e2e8f0' }}>
                        <th style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>Fecha</th>
                        <th style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>Acción</th>
                        <th style={{ padding: '8px 9px' }}>Detalle / Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userHistory.map((h, idx) => (
                        <tr key={h.id || idx} style={{ borderBottom: idx < userHistory.length - 1 ? '1px solid #3b527d' : 'none' }}>
                          <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', color: '#94a3b8', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                            {formatDateTime(h.createdAt)}
                          </td>
                          <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', color: '#93c5fd', fontWeight: 700, fontSize: '10.5px', verticalAlign: 'top', wordBreak: 'break-word' }}>
                            {h.action}
                          </td>
                          <td style={{ padding: '8px 9px', color: '#e2e8f0', lineHeight: 1.45, verticalAlign: 'top' }}>
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
            <button
              onClick={() => {
                const target = itemVer;
                setItemVer(null);
                handleOpenEdit(target);
              }}
              style={{ background: 'rgba(56,189,248,.16)', border: '1px solid rgba(56,189,248,.45)', color: '#38bdf8', padding: '9px 16px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              Editar Usuario
            </button>
            <button
              onClick={() => setItemVer(null)}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '9px 18px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal: Crear / Editar Usuario */}
      {showFormModal && (
        <ModalShell onClose={() => !saving && setShowFormModal(false)} maxWidth={620}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 800 }}>
            {editingItem ? 'Editar Cuenta de Usuario' : 'Registrar Nuevo Usuario'}
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '12px', color: '#94a3b8' }}>
            Configure los datos institucionales, el rol y los módulos autorizados para el usuario.
          </p>

          {formError && (
            <div style={{ marginBottom: '14px', padding: '10px 13px', borderRadius: '9px', backgroundColor: 'rgba(239,68,68,.14)', border: '1px solid rgba(239,68,68,.45)', color: '#fca5a5', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IcAlert /> {formError}
            </div>
          )}

          <form onSubmit={handleSaveUser} style={{ display: 'grid', gap: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '11px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  className="fl-input"
                  required
                  minLength={3}
                  maxLength={150}
                  placeholder="Ej. Ana María López"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Cargo Institucional <span style={{ color: '#64748b', fontWeight: 500 }}>(Opcional)</span>
                </label>
                <input
                  type="text"
                  className="fl-input"
                  maxLength={100}
                  placeholder="Ej. Analista de Ingresos Consulares"
                  value={form.jobTitle}
                  onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 165px 135px', gap: '11px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Correo Institucional *
                </label>
                <input
                  type="email"
                  className="fl-input"
                  required
                  maxLength={150}
                  placeholder="Ej. usuario@hacienda.gob.sv"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Rol *
                </label>
                <select
                  className="fl-select"
                  value={form.role}
                  disabled={isEditingSelf}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                >
                  <option value="USER">OPERADOR (USER)</option>
                  <option value="ADMIN">ADMINISTRADOR</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                  Estado *
                </label>
                <select
                  className="fl-select"
                  value={form.status}
                  disabled={isEditingSelf}
                  onChange={e => setForm({ ...form, status: e.target.value })}
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
                  placeholder="Indique por qué se activa o inactiva esta cuenta (mínimo 5 caracteres)..."
                  value={form.statusReason}
                  onChange={e => setForm({ ...form, statusReason: e.target.value })}
                />
              </div>
            )}

            {/* Permisos de Módulos */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Permisos de Acceso por Módulo {form.role === 'USER' && '*'}
              </label>

              {form.role === 'ADMIN' ? (
                <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: '10px', padding: '11px 13px', fontSize: '12px', color: '#fde047' }}>
                  El rol <strong>ADMINISTRADOR</strong> posee acceso completo a los 6 módulos del sistema (Ingresos, Reportes, Tareas, Directorio, Usuarios y Configuración).
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {MODULE_OPTIONS.map(mod => {
                    const checked = form.permissions.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '9px',
                          padding: '9px 11px',
                          borderRadius: '9px',
                          cursor: 'pointer',
                          backgroundColor: checked ? 'rgba(59, 130, 246, 0.14)' : '#0f1a30',
                          border: `1.5px solid ${checked ? '#3b82f6' : '#2e436e'}`,
                          transition: 'all .15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(mod.id)}
                          style={{ accentColor: '#3b82f6', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: checked ? 700 : 500, color: checked ? '#fff' : '#94a3b8' }}>
                          {mod.fullLabel}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                {editingItem ? (
                  <>Nueva Contraseña <span style={{ color: '#64748b', fontWeight: 500 }}>(Opcional · deje en blanco para mantener la actual)</span></>
                ) : (
                  'Contraseña Inicial *'
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="fl-input"
                  style={{ paddingRight: '38px' }}
                  required={!editingItem}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder={editingItem ? 'Dejar vacío para no modificar...' : 'Mínimo 8 caracteres (mayúscula, minúscula y número)'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                >
                  {showPassword ? <IcEyeOff /> : <IcEye />}
                </button>
              </div>

              {(!editingItem || form.password.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '7px', fontSize: '10.5px' }}>
                  {[
                    [pwRules.length, '8+ caracteres'],
                    [pwRules.upper, '1 mayúscula'],
                    [pwRules.lower, '1 minúscula'],
                    [pwRules.digit, '1 número'],
                  ].map(([ok, txt], idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 700,
                        backgroundColor: ok ? 'rgba(34,197,94,.14)' : 'rgba(148,163,184,.1)',
                        color: ok ? '#4ade80' : '#94a3b8',
                        border: `1px solid ${ok ? 'rgba(34,197,94,.4)' : 'rgba(148,163,184,.25)'}`,
                      }}
                    >
                      {ok ? '✓ ' : '• '}{txt as string}
                    </span>
                  ))}
                </div>
              )}
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
                {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Restablecer Contraseña */}
      {itemPasswordReset && (
        <ModalShell onClose={() => !resetSaving && setItemPasswordReset(null)} maxWidth={480}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', backgroundColor: 'rgba(168,85,247,.16)', border: '1px solid rgba(168,85,247,.45)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcKey />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800 }}>Restablecer Contraseña</h3>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{itemPasswordReset.name} · {itemPasswordReset.email}</div>
            </div>
          </div>

          {resetError && (
            <div style={{ marginBottom: '13px', padding: '10px 13px', borderRadius: '9px', backgroundColor: 'rgba(239,68,68,.14)', border: '1px solid rgba(239,68,68,.45)', color: '#fca5a5', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IcAlert /> {resetError}
            </div>
          )}

          <form onSubmit={handleConfirmResetPassword} style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                Nueva Contraseña *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showResetPw ? 'text' : 'password'}
                  className="fl-input"
                  style={{ paddingRight: '38px' }}
                  required
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="Ingrese la nueva contraseña segura..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPw(!showResetPw)}
                  style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                >
                  {showResetPw ? <IcEyeOff /> : <IcEye />}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '7px', fontSize: '10px' }}>
                {[
                  [resetPwRules.length, '8+ caracteres'],
                  [resetPwRules.upper, '1 mayúscula'],
                  [resetPwRules.lower, '1 minúscula'],
                  [resetPwRules.digit, '1 número'],
                ].map(([ok, txt], idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '2px 7px',
                      borderRadius: '999px',
                      fontWeight: 700,
                      backgroundColor: ok ? 'rgba(34,197,94,.14)' : 'rgba(148,163,184,.1)',
                      color: ok ? '#4ade80' : '#94a3b8',
                    }}
                  >
                    {ok ? '✓ ' : '• '}{txt as string}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                Confirmar Nueva Contraseña *
              </label>
              <input
                type={showResetPw ? 'text' : 'password'}
                className="fl-input"
                required
                maxLength={72}
                autoComplete="new-password"
                placeholder="Repita la contraseña..."
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                Observación para Bitácora <span style={{ color: '#64748b', fontWeight: 500 }}>(Opcional)</span>
              </label>
              <input
                type="text"
                className="fl-input"
                maxLength={300}
                placeholder="Ej. Solicitud de restablecimiento por olvido de clave"
                value={passwordNote}
                onChange={e => setPasswordNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={resetSaving}
                onClick={() => setItemPasswordReset(null)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '9px 16px', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={resetSaving || !isPasswordCompliant(newPassword) || newPassword !== confirmNewPassword}
                style={{
                  background: 'linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 18px',
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: resetSaving || !isPasswordCompliant(newPassword) || newPassword !== confirmNewPassword ? 'not-allowed' : 'pointer',
                  opacity: resetSaving || !isPasswordCompliant(newPassword) || newPassword !== confirmNewPassword ? 0.45 : 1,
                }}
              >
                {resetSaving ? 'Actualizando...' : 'Confirmar Nueva Contraseña'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Activar / Desactivar Usuario con Motivo Obligatorio */}
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
              {itemToggleStatus.status === 'ACTIVO' ? '¿Desactivar cuenta de usuario?' : '¿Reactivar cuenta de usuario?'}
            </h3>

            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '370px' }}>
              {itemToggleStatus.status === 'ACTIVO' ? (
                <>
                  Está por inactivar a <strong style={{ color: '#e2e8f0' }}>{itemToggleStatus.name}</strong> ({itemToggleStatus.email}). El usuario no podrá iniciar sesión hasta ser reactivado, manteniendo intacta su trazabilidad histórica.
                </>
              ) : (
                <>
                  Está por reactivar la cuenta de <strong style={{ color: '#e2e8f0' }}>{itemToggleStatus.name}</strong> ({itemToggleStatus.email}), habilitando nuevamente su acceso al sistema.
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
                    ? 'Escriba obligatoriamente por qué se desactiva esta cuenta (ej. Cambio de área, licencia, cese de funciones...)'
                    : 'Escriba obligatoriamente por qué se reactiva esta cuenta (ej. Reincorporación autorizada, alta operativa...)'
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
