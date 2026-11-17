'use client';

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { fetchApi, downloadApiFile } from '@/lib/api';
import { countBusinessDays, parseCustomHolidays } from '@/lib/businessDays';

interface CustomHolidayEntry {
  date: string;
  label: string;
}

interface SystemLogItem {
  id: number;
  userId: number | null;
  userName: string;
  action: string;
  module: string;
  details: string;
  createdAt: string | null;
}

interface SettingsFormState {
  institutionName: string;
  departmentName: string;
  bankAccountDefault: string;
  bankAccountName: string;
  concentrationMaxDays: string;
  stampRequired: boolean;
}

type ActiveTab = 'parametros' | 'asuetos' | 'bitacora';

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const clean = iso.replace('T', ' ');
  const datePart = clean.slice(0, 10);
  const timePart = clean.slice(11, 19);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return clean.slice(0, 19);
  return `${d}/${m}/${y}${timePart ? ` ${timePart.slice(0, 5)}` : ''}`;
};

const formatDateFull = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const clean = iso.replace('T', ' ');
  const datePart = clean.slice(0, 10);
  const timePart = clean.slice(11, 19);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return clean;
  return `${d}/${m}/${y}${timePart ? ` ${timePart}` : ''}`;
};

const formatIsoToDisplay = (iso: string): string => {
  const [y, m, d] = (iso || '').split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const getWeekdaySpanish = (iso: string): string => {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return '-';
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_NAMES[dt.getUTCDay()] || '-';
};

function computeEasterSundayUtc(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getOfficialHolidaysForYear(year: number): { date: string; name: string; type: 'FIJO DE LEY' | 'SEMANA SANTA' }[] {
  const easter = computeEasterSundayUtc(year);
  const offsetIso = (delta: number) => {
    const dt = new Date(easter.getTime());
    dt.setUTCDate(dt.getUTCDate() + delta);
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  };

  const items: { date: string; name: string; type: 'FIJO DE LEY' | 'SEMANA SANTA' }[] = [
    { date: `${year}-01-01`, name: 'Año Nuevo', type: 'FIJO DE LEY' },
    { date: offsetIso(-3), name: 'Jueves Santo', type: 'SEMANA SANTA' },
    { date: offsetIso(-2), name: 'Viernes Santo', type: 'SEMANA SANTA' },
    { date: offsetIso(-1), name: 'Sábado de Gloria', type: 'SEMANA SANTA' },
    { date: `${year}-05-01`, name: 'Día Internacional del Trabajo', type: 'FIJO DE LEY' },
    { date: `${year}-05-10`, name: 'Día de la Madre', type: 'FIJO DE LEY' },
    { date: `${year}-06-17`, name: 'Día del Padre', type: 'FIJO DE LEY' },
    { date: `${year}-08-03`, name: 'Fiestas Agostinas (Sector Público)', type: 'FIJO DE LEY' },
    { date: `${year}-08-04`, name: 'Fiestas Agostinas (Sector Público)', type: 'FIJO DE LEY' },
    { date: `${year}-08-05`, name: 'Fiestas Agostinas (Comercio y Banca)', type: 'FIJO DE LEY' },
    { date: `${year}-08-06`, name: 'Día del Divino Salvador del Mundo', type: 'FIJO DE LEY' },
    { date: `${year}-09-15`, name: 'Día de la Independencia Patria', type: 'FIJO DE LEY' },
    { date: `${year}-11-02`, name: 'Día de los Difuntos', type: 'FIJO DE LEY' },
    { date: `${year}-12-25`, name: 'Navidad', type: 'FIJO DE LEY' },
  ];

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- Iconos ---------- */
const svg = (children: ReactNode, size = 18, sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcSettings = () => svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>, 22, 1.9);
const IcBank = () => svg(<><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 21h18" /></>, 18, 1.9);
const IcCalendar = () => svg(<><rect x="3" y="4.5" width="18" height="17" rx="2" /><line x1="16" y1="2.5" x2="16" y2="6.5" /><line x1="8" y1="2.5" x2="8" y2="6.5" /><line x1="3" y1="10" x2="21" y2="10" /></>, 18, 1.9);
const IcShield = () => svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, 18, 1.9);
const IcClock = () => svg(<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>, 18, 1.9);
const IcBuilding = () => svg(<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2" /><path d="M10 21v-3h4v3" /></>, 16, 1.9);
const IcCheckCircle = () => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, 17, 2);
const IcSave = () => svg(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>, 16, 2);
const IcPlus = () => svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 16, 2.3);
const IcTrash = () => svg(<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>, 13, 2.1);
const IcDownload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, 16, 2);
const IcRefresh = () => svg(<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>, 15, 2);
const IcEye = () => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 13, 2.1);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);
const IcAlert = () => svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 16, 2);
const IcInfo = () => svg(<><circle cx="12" cy="12" r="9" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12" y2="8.1" /></>, 15, 2);
const IcSearch = () => svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>, 15, 2);
const IcFileText = () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>, 16, 1.9);

function ModuleBadge({ module }: { module: string }) {
  const m = (module || 'SISTEMA').toUpperCase();
  const palette: Record<string, { bg: string; color: string; border: string }> = {
    'AUTENTICACIÓN': { bg: 'rgba(168,85,247,.14)', color: '#d8b4fe', border: 'rgba(168,85,247,.4)' },
    'INGRESOS': { bg: 'rgba(16,185,129,.14)', color: '#6ee7b7', border: 'rgba(16,185,129,.4)' },
    'DIRECTORIO': { bg: 'rgba(59,130,246,.14)', color: '#93c5fd', border: 'rgba(59,130,246,.4)' },
    'USUARIOS': { bg: 'rgba(197,155,39,.16)', color: '#fcd34d', border: 'rgba(197,155,39,.45)' },
    'CONFIGURACIÓN': { bg: 'rgba(14,165,233,.15)', color: '#7dd3fc', border: 'rgba(14,165,233,.4)' },
  };
  const style = palette[m] || { bg: 'rgba(148,163,184,.14)', color: '#cbd5e1', border: 'rgba(148,163,184,.35)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '9.5px',
        fontWeight: 700,
        letterSpacing: '0.4px',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {m}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const u = (action || '').toUpperCase();
  let color = '#e2e8f0';
  if (u.includes('FALLIDO') || u.includes('BLOQUEAD') || u.includes('INACTIVA') || u.includes('ELIMINAR') || u.includes('ANULAR')) {
    color = '#fca5a5';
  } else if (u.includes('CREAR') || u.includes('EXITOSO') || u.includes('AGREGAR')) {
    color = '#6ee7b7';
  } else if (u.includes('ACTUALIZAR') || u.includes('EDITAR') || u.includes('PASSWORD') || u.includes('ESTADO')) {
    color = '#fcd34d';
  } else if (u.includes('EXPORTAR')) {
    color = '#93c5fd';
  }

  return (
    <span
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '10.5px',
        fontWeight: 700,
        color,
      }}
    >
      {action}
    </span>
  );
}

export default function ConfiguracionSistemaPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('parametros');

  // Configuración general
  const [form, setForm] = useState<SettingsFormState>({
    institutionName: 'Ministerio de Hacienda - Dirección General de Tesorería',
    departmentName: 'División de Fondos Ajenos en Custodia - Ingresos Consulares',
    bankAccountDefault: '00110000112233',
    bankAccountName: 'INGRESOS CONSULARES',
    concentrationMaxDays: '5',
    stampRequired: true,
  });
  const [initialForm, setInitialForm] = useState<SettingsFormState | null>(null);
  const [customHolidays, setCustomHolidays] = useState<CustomHolidayEntry[]>([]);
  const [customHolidaySet, setCustomHolidaySet] = useState<Set<string>>(new Set());

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Asuetos adicionales
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayError, setHolidayError] = useState('');
  const [holidayToDelete, setHolidayToDelete] = useState<CustomHolidayEntry | null>(null);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  // Simulador de días hábiles
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [simStart, setSimStart] = useState(todayIso);
  const [simEnd, setSimEnd] = useState(todayIso);

  // Bitácora de auditoría
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [exportingLogs, setExportingLogs] = useState(false);

  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [globalLogSearch, setGlobalLogSearch] = useState('');
  const [logColFilters, setLogColFilters] = useState<Record<string, string>>({});
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);

  const applySettingsPayload = (data: Record<string, string>) => {
    const loaded: SettingsFormState = {
      institutionName: data.INSTITUTION_NAME || 'Ministerio de Hacienda - Dirección General de Tesorería',
      departmentName: data.DEPARTMENT_NAME || 'División de Fondos Ajenos en Custodia - Ingresos Consulares',
      bankAccountDefault: data.BANK_ACCOUNT_DEFAULT || '00110000112233',
      bankAccountName: data.BANK_ACCOUNT_NAME || 'INGRESOS CONSULARES',
      concentrationMaxDays: data.CONCENTRATION_MAX_DAYS || '2',
      stampRequired: String(data.STAMP_REQUIRED ?? 'true').toLowerCase() === 'true',
    };
    setForm(loaded);
    setInitialForm(loaded);

    let parsedMeta: CustomHolidayEntry[] = [];
    if (data.CUSTOM_HOLIDAYS_META) {
      try {
        const arr = JSON.parse(data.CUSTOM_HOLIDAYS_META);
        if (Array.isArray(arr)) {
          parsedMeta = arr.filter((x) => x && typeof x.date === 'string');
        }
      } catch {
        parsedMeta = [];
      }
    }
    setCustomHolidays(parsedMeta);
    setCustomHolidaySet(parseCustomHolidays(data.CUSTOM_HOLIDAYS));
  };

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      setSettingsError('');
      const data = await fetchApi('/settings');
      if (data) {
        applySettingsPayload(data);
      }
    } catch (err: any) {
      setSettingsError(err.message || 'No se pudo cargar la configuración del sistema');
    } finally {
      setLoadingSettings(false);
    }
  };

  const buildLogsQueryString = () => {
    const params = new URLSearchParams();
    if (moduleFilter && moduleFilter !== 'ALL') params.set('module', moduleFilter);
    if (dateFromFilter) params.set('dateFrom', dateFromFilter);
    if (dateToFilter) params.set('dateTo', dateToFilter);
    if (globalLogSearch.trim()) params.set('search', globalLogSearch.trim());
    params.set('limit', '400');
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      setLogsError('');
      const data = await fetchApi(`/logs${buildLogsQueryString()}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLogsError(err.message || 'No se pudo cargar la bitácora de auditoría');
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  // Recargar bitácora cuando cambian filtros principales del servidor
  useEffect(() => {
    loadLogs();
  }, [moduleFilter, dateFromFilter, dateToFilter]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4200);
  };

  const isFormDirty = useMemo(() => {
    if (!initialForm) return false;
    return (
      form.institutionName !== initialForm.institutionName ||
      form.departmentName !== initialForm.departmentName ||
      form.bankAccountDefault !== initialForm.bankAccountDefault ||
      form.bankAccountName !== initialForm.bankAccountName ||
      form.concentrationMaxDays !== initialForm.concentrationMaxDays ||
      form.stampRequired !== initialForm.stampRequired
    );
  }, [form, initialForm]);

  const handleSaveSettings = async () => {
    const inst = form.institutionName.trim();
    const dept = form.departmentName.trim();
    const acc = form.bankAccountDefault.trim();
    const accName = form.bankAccountName.trim();
    const days = parseInt(form.concentrationMaxDays, 10);

    if (inst.length < 5) {
      setSettingsError('El nombre de la institución debe contener al menos 5 caracteres.');
      return;
    }
    if (dept.length < 5) {
      setSettingsError('El nombre de la unidad o división debe contener al menos 5 caracteres.');
      return;
    }
    if (acc.length < 4) {
      setSettingsError('Ingrese un número de cuenta concentradora válido (mínimo 4 caracteres).');
      return;
    }
    if (accName.length < 3) {
      setSettingsError('Ingrese la denominación de la cuenta bancaria.');
      return;
    }
    if (Number.isNaN(days) || days < 1 || days > 30) {
      setSettingsError('El plazo máximo de concentración debe estar entre 1 y 30 días hábiles.');
      return;
    }

    try {
      setSavingSettings(true);
      setSettingsError('');
      const updated = await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          institutionName: inst,
          departmentName: dept,
          bankAccountDefault: acc,
          bankAccountName: accName,
          concentrationMaxDays: days,
          stampRequired: form.stampRequired,
        }),
      });
      applySettingsPayload(updated);
      showToast('Parámetros institucionales actualizados y registrados en bitácora.');
      loadLogs();
    } catch (err: any) {
      setSettingsError(err.message || 'No se pudieron guardar los parámetros');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate) {
      setHolidayError('Seleccione la fecha del asueto o decreto institucional.');
      return;
    }
    if (newHolidayLabel.trim().length < 3) {
      setHolidayError('Ingrese la descripción o decreto del asueto (mínimo 3 caracteres).');
      return;
    }

    try {
      setHolidayLoading(true);
      setHolidayError('');
      const updated = await fetchApi('/settings/holidays', {
        method: 'POST',
        body: JSON.stringify({
          date: newHolidayDate,
          label: newHolidayLabel.trim(),
        }),
      });
      applySettingsPayload(updated);
      setNewHolidayDate('');
      setNewHolidayLabel('');
      showToast('Asueto institucional guardado correctamente.');
      loadLogs();
    } catch (err: any) {
      setHolidayError(err.message || 'No se pudo registrar el asueto');
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleConfirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    try {
      setHolidayLoading(true);
      setHolidayError('');
      const updated = await fetchApi(`/settings/holidays/${holidayToDelete.date}`, {
        method: 'DELETE',
      });
      applySettingsPayload(updated);
      setHolidayToDelete(null);
      showToast('Asueto eliminado del calendario institucional.');
      loadLogs();
    } catch (err: any) {
      setHolidayError(err.message || 'No se pudo eliminar el asueto');
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      setExportingLogs(true);
      const params = new URLSearchParams();
      if (moduleFilter && moduleFilter !== 'ALL') params.set('module', moduleFilter);
      if (dateFromFilter) params.set('dateFrom', dateFromFilter);
      if (dateToFilter) params.set('dateTo', dateToFilter);
      if (globalLogSearch.trim()) params.set('search', globalLogSearch.trim());
      const qs = params.toString();
      await downloadApiFile(`/logs/export${qs ? `?${qs}` : ''}`, 'bitacora_auditoria_sic.xlsx');
      showToast('Bitácora de auditoría exportada a Excel.');
      loadLogs();
    } catch (err: any) {
      setLogsError(err.message || 'No se pudo exportar la bitácora');
    } finally {
      setExportingLogs(false);
    }
  };

  const officialHolidays = useMemo(() => getOfficialHolidaysForYear(calendarYear), [calendarYear]);

  const simulatedDays = useMemo(() => {
    if (!simStart || !simEnd) return 0;
    return countBusinessDays(simStart, simEnd, customHolidaySet);
  }, [simStart, simEnd, customHolidaySet]);

  const maxAllowedDays = useMemo(() => {
    const parsed = parseInt(form.concentrationMaxDays, 10);
    return !Number.isNaN(parsed) && parsed >= 1 ? parsed : 2;
  }, [form.concentrationMaxDays]);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (globalLogSearch.trim()) {
        const q = normalizeText(globalLogSearch);
        const hay = normalizeText(`${item.id} ${item.userName} ${item.action} ${item.module} ${item.details}`);
        if (!hay.includes(q)) return false;
      }
      if (logColFilters.id && !String(item.id).includes(logColFilters.id.trim())) return false;
      if (logColFilters.fecha && !normalizeText(formatDateTime(item.createdAt)).includes(normalizeText(logColFilters.fecha))) return false;
      if (logColFilters.modulo && !normalizeText(item.module).includes(normalizeText(logColFilters.modulo))) return false;
      if (logColFilters.accion && !normalizeText(item.action).includes(normalizeText(logColFilters.accion))) return false;
      if (logColFilters.usuario && !normalizeText(item.userName).includes(normalizeText(logColFilters.usuario))) return false;
      if (logColFilters.detalle && !normalizeText(item.details).includes(normalizeText(logColFilters.detalle))) return false;
      return true;
    });
  }, [logs, globalLogSearch, logColFilters]);

  const securityAlertCount = useMemo(() => {
    return logs.filter((l) => {
      const a = (l.action || '').toUpperCase();
      return a.includes('FALLIDO') || a.includes('BLOQUEAD') || a.includes('INACTIVA') || a.includes('ANULAR');
    }).length;
  }, [logs]);

  const colFilterInputStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    backgroundColor: '#132038',
    border: '1px solid #2e436e',
    borderRadius: '4px',
    padding: '4px 6px',
    color: '#e2e8f0',
    fontSize: '11px',
    outline: 'none',
  };

  const formInputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#132038',
    border: '1px solid #2e436e',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <style>{`
        .cfg-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all .16s ease;
          border: 1px solid #2e436e;
          background: #132038;
          color: #94a3b8;
        }
        .cfg-tab-btn:hover {
          color: #e2e8f0;
          border-color: #47659e;
        }
        .cfg-tab-btn.active {
          background: linear-gradient(135deg, rgba(197,155,39,.22) 0%, rgba(197,155,39,.08) 100%);
          color: #fcd34d;
          border-color: #C59B27;
          box-shadow: 0 4px 14px rgba(197,155,39,.15);
        }
        .cfg-row:hover td {
          background-color: rgba(59, 130, 246, 0.06);
        }
        .cfg-act-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid #2e436e;
          background: #132038;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .15s ease;
        }
        .cfg-act-btn:hover {
          border-color: #C59B27;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Encabezado Principal */}
      <div
        style={{
          backgroundColor: '#233559',
          border: '1px solid #2e436e',
          borderTop: '3px solid #C59B27',
          borderRadius: '12px',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(197, 155, 39, 0.16)',
              border: '1px solid rgba(197, 155, 39, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C59B27',
            }}
          >
            <IcSettings />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.2px' }}>
              Configuración del Sistema y Auditoría
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              Parámetros institucionales DGT, cuenta concentradora BCR, calendario de días hábiles y bitácora de seguridad
            </p>
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`cfg-tab-btn ${activeTab === 'parametros' ? 'active' : ''}`}
            onClick={() => setActiveTab('parametros')}
          >
            <IcBank /> Parámetros Institucionales
          </button>
          <button
            type="button"
            className={`cfg-tab-btn ${activeTab === 'asuetos' ? 'active' : ''}`}
            onClick={() => setActiveTab('asuetos')}
          >
            <IcCalendar /> Calendario y Asuetos ({14 + customHolidays.length})
          </button>
          <button
            type="button"
            className={`cfg-tab-btn ${activeTab === 'bitacora' ? 'active' : ''}`}
            onClick={() => setActiveTab('bitacora')}
          >
            <IcShield /> Bitácora de Auditoría ({logs.length})
          </button>
        </div>
      </div>

      {/* Notificación flotante de éxito */}
      {toastMsg && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            borderTop: '3px solid #C59B27',
            borderRadius: '10px',
            padding: '11px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#6ee7b7',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <IcCheckCircle /> {toastMsg}
          </span>
          <button
            type="button"
            onClick={() => setToastMsg('')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <IcX />
          </button>
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '11px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,.16)', border: '1px solid rgba(59,130,246,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
            <IcBank />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Cuenta Concentradora BCR
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.bankAccountDefault || '-'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.bankAccountName}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '11px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(197,155,39,.16)', border: '1px solid rgba(197,155,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C59B27', flexShrink: 0 }}>
            <IcClock />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Umbral Concentración
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {maxAllowedDays} {maxAllowedDays === 1 ? 'día hábil' : 'días hábiles'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Plazo operativo sin alerta</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '11px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,.16)', border: '1px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', flexShrink: 0 }}>
            <IcCalendar />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Asuetos Configurados
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              14 Ley + {customHolidays.length} Extra
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Excluidos de días hábiles</div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '11px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '13px',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: securityAlertCount > 0 ? 'rgba(244,63,94,.16)' : 'rgba(148,163,184,.14)', border: `1px solid ${securityAlertCount > 0 ? 'rgba(244,63,94,.45)' : 'rgba(148,163,184,.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: securityAlertCount > 0 ? '#fb7185' : '#cbd5e1', flexShrink: 0 }}>
            <IcShield />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Eventos en Bitácora
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {logs.length} <span style={{ fontSize: '11.5px', fontWeight: 600, color: securityAlertCount > 0 ? '#fda4af' : '#94a3b8' }}>({securityAlertCount} alertas)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Trazabilidad auditable</div>
          </div>
        </div>
      </div>

      {/* ========================================================================
          PESTAÑA 1: PARÁMETROS INSTITUCIONALES Y BANCARIOS
         ======================================================================== */}
      {activeTab === 'parametros' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
          {/* Formulario Principal */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #2e436e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#C59B27' }}><IcBuilding /></span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    Parámetros Institucionales y Cuenta Concentradora
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                    Estos valores alimentan el registro de ingresos, alertas operativas y encabezados oficiales PDF
                  </p>
                </div>
              </div>
              {isFormDirty && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fcd34d', backgroundColor: 'rgba(197,155,39,.15)', border: '1px solid rgba(197,155,39,.45)', padding: '3px 10px', borderRadius: '999px' }}>
                  Cambios sin guardar
                </span>
              )}
            </div>

            {settingsError && (
              <div style={{ marginBottom: '16px', padding: '11px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IcAlert /> {settingsError}
              </div>
            )}

            {loadingSettings ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Cargando parámetros del sistema...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Nombre Oficial de la Institución <span style={{ color: '#f43f5e' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.institutionName}
                      onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                      style={formInputStyle}
                      placeholder="Ministerio de Hacienda - Dirección General de Tesorería"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Unidad / División Responsable <span style={{ color: '#f43f5e' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={form.departmentName}
                      onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
                      style={formInputStyle}
                      placeholder="División de Fondos Ajenos en Custodia"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Número de Cuenta Concentradora BCR <span style={{ color: '#f43f5e' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={form.bankAccountDefault}
                      onChange={(e) => setForm({ ...form, bankAccountDefault: e.target.value })}
                      style={formInputStyle}
                      placeholder="00110000112233"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Denominación de la Cuenta <span style={{ color: '#f43f5e' }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      value={form.bankAccountName}
                      onChange={(e) => setForm({ ...form, bankAccountName: e.target.value.toUpperCase() })}
                      style={formInputStyle}
                      placeholder="INGRESOS CONSULARES"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Plazo Máx. Concentración (Días Hábiles) <span style={{ color: '#f43f5e' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={form.concentrationMaxDays}
                      onChange={(e) => setForm({ ...form, concentrationMaxDays: e.target.value })}
                      style={formInputStyle}
                    />
                  </div>
                </div>

                {/* Interruptor Sello PDF */}
                <div
                  style={{
                    backgroundColor: '#132038',
                    border: '1px solid #2e436e',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                      Incluir Leyenda y Sello Institucional en Comprobantes PDF
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      Estampa el pie de validación oficial DGT / SIC al descargar comprobantes individuales y reportes PDF.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, stampRequired: !form.stampRequired })}
                    style={{
                      width: '50px',
                      height: '27px',
                      borderRadius: '999px',
                      border: '1px solid',
                      borderColor: form.stampRequired ? '#10b981' : '#475569',
                      backgroundColor: form.stampRequired ? 'rgba(16, 185, 129, 0.35)' : '#1e293b',
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all .18s ease',
                    }}
                    title={form.stampRequired ? 'Sello PDF Activo' : 'Sello PDF Inactivo'}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: form.stampRequired ? '24px' : '3px',
                        width: '21px',
                        height: '21px',
                        borderRadius: '50%',
                        backgroundColor: form.stampRequired ? '#34d399' : '#94a3b8',
                        transition: 'left .18s ease',
                      }}
                    />
                  </button>
                </div>

                {/* Botonera */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' }}>
                  {isFormDirty && initialForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(initialForm);
                        setSettingsError('');
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid #3b527d',
                        backgroundColor: '#132038',
                        color: '#cbd5e1',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Restablecer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #d4a72c',
                      background: 'linear-gradient(135deg, #C59B27 0%, #a67f19 100%)',
                      color: '#0f172a',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: savingSettings ? 'not-allowed' : 'pointer',
                      opacity: savingSettings ? 0.7 : 1,
                    }}
                  >
                    <IcSave /> {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vista Previa Institucional */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
              <span style={{ color: '#60a5fa' }}><IcFileText /></span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Vista Previa en Documentos y Formularios</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Representación en comprobantes PDF y ficha de ingreso</div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#132038',
                border: '1px solid #2e436e',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {form.institutionName || 'MINISTERIO DE HACIENDA'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
                {form.departmentName || 'Dirección General de Tesorería'}
              </div>
              <div style={{ height: '1px', backgroundColor: '#2e436e', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#94a3b8' }}>Cuenta Bancaria en Registro:</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>
                  {form.bankAccountDefault} - {form.bankAccountName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#94a3b8' }}>Alerta de Mora Operativa:</span>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                  Mayor a {maxAllowedDays} {maxAllowedDays === 1 ? 'día hábil' : 'días hábiles'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span style={{ color: '#94a3b8' }}>Sello Oficial PDF:</span>
                <span style={{ color: form.stampRequired ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
                  {form.stampRequired ? 'HABILITADO' : 'DESHABILITADO'}
                </span>
              </div>
              {form.stampRequired && (
                <div style={{ marginTop: '6px', padding: '8px 10px', borderRadius: '6px', border: '1px dashed rgba(197,155,39,.5)', backgroundColor: 'rgba(197,155,39,.08)', color: '#fcd34d', fontSize: '10.5px', fontWeight: 700, textAlign: 'center' }}>
                  [ SELLO DE CONTROL INSTITUCIONAL - DGT / SIC ]
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', color: '#bfdbfe', fontSize: '11.5px', lineHeight: 1.45 }}>
              <span style={{ flexShrink: 0, marginTop: '1px' }}><IcInfo /></span>
              <span>
                Todo cambio efectuado en esta sección queda registrado automáticamente en la <strong>Bitácora de Auditoría</strong> indicando el valor anterior y el nuevo valor.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          PESTAÑA 2: CALENDARIO DE ASUETOS Y SIMULADOR DE DÍAS HÁBILES
         ======================================================================== */}
      {activeTab === 'asuetos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: '18px', alignItems: 'start' }}>
            {/* Gestor de Asuetos Institucionales Adicionales */}
            <div
              style={{
                backgroundColor: '#233559',
                border: '1px solid #2e436e',
                borderTop: '3px solid #C59B27',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div style={{ marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  Asuetos Institucionales Adicionales y Decretos Legislativos
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                  Agregue cierres extraordinarios, vacaciones de fin de año o decretos especiales para excluirlos del conteo de días de concentración.
                </p>
              </div>

              {holidayError && (
                <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IcAlert /> {holidayError}
                </div>
              )}

              {/* Barra para agregar fecha */}
              <div style={{ display: 'grid', gridTemplateColumns: '155px minmax(0, 1fr) auto', gap: '10px', alignItems: 'end', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Fecha Asueto <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    style={{ ...formInputStyle, padding: '8px 10px', fontSize: '12.5px', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Descripción / Decreto <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={newHolidayLabel}
                    onChange={(e) => setNewHolidayLabel(e.target.value)}
                    placeholder="Ej. Vacación Fin de Año DGT / Decreto Legislativo"
                    style={{ ...formInputStyle, padding: '8px 12px', fontSize: '12.5px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  disabled={holidayLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '37px',
                    padding: '0 15px',
                    borderRadius: '8px',
                    border: '1px solid #d4a72c',
                    background: 'linear-gradient(135deg, #C59B27 0%, #a67f19 100%)',
                    color: '#0f172a',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: holidayLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <IcPlus /> Agregar
                </button>
              </div>

              {/* Tabla de Asuetos Adicionales con líneas completas */}
              <div style={{ border: '1px solid #2e436e', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                  <colgroup>
                    <col style={{ width: '46px' }} />
                    <col style={{ width: '104px' }} />
                    <col style={{ width: '98px' }} />
                    <col />
                    <col style={{ width: '64px' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27' }}>
                      <th style={{ padding: '9px 8px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>#</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Fecha</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Día</th>
                      <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Descripción / Referencia</th>
                      <th style={{ padding: '9px 8px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>Quitar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customHolidays.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px 14px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>
                          No hay decretos o asuetos adicionales registrados actualmente. Se aplican los 14 asuetos oficiales de ley.
                        </td>
                      </tr>
                    ) : (
                      customHolidays.map((item, idx) => (
                        <tr key={item.date} className="cfg-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#fcd34d', fontWeight: 700, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                            {formatIsoToDisplay(item.date)}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                            {getWeekdaySpanish(item.date)}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#e2e8f0', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                            {item.label}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setHolidayToDelete(item)}
                              className="cfg-act-btn"
                              style={{ color: '#fb7185' }}
                              title="Eliminar fecha de asueto"
                            >
                              <IcTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulador de Días Hábiles */}
            <div
              style={{
                backgroundColor: '#233559',
                border: '1px solid #2e436e',
                borderTop: '3px solid #C59B27',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  Simulador de Días Hábiles de Concentración
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                  Verifique el cálculo exacto entre Fecha de Depósito y Fecha de Concentración BCR
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Fecha de Depósito
                  </label>
                  <input
                    type="date"
                    value={simStart}
                    onChange={(e) => setSimStart(e.target.value)}
                    style={{ ...formInputStyle, padding: '8px 10px', fontSize: '12.5px', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Fecha Concentración BCR
                  </label>
                  <input
                    type="date"
                    value={simEnd}
                    onChange={(e) => setSimEnd(e.target.value)}
                    style={{ ...formInputStyle, padding: '8px 10px', fontSize: '12.5px', colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#132038',
                  border: '1px solid #2e436e',
                  borderTop: `3px solid ${simulatedDays > maxAllowedDays ? '#f59e0b' : '#10b981'}`,
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Resultado Calculado
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {simulatedDays} {simulatedDays === 1 ? 'día hábil' : 'días hábiles'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '3px' }}>
                    Excluye fines de semana, Semana Santa, asuetos de ley y decretos extra.
                  </div>
                </div>
                <span
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: simulatedDays > maxAllowedDays ? 'rgba(245,158,11,.18)' : 'rgba(16,185,129,.18)',
                    color: simulatedDays > maxAllowedDays ? '#fcd34d' : '#6ee7b7',
                    border: `1px solid ${simulatedDays > maxAllowedDays ? 'rgba(245,158,11,.45)' : 'rgba(16,185,129,.45)'}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {simulatedDays > maxAllowedDays ? 'EXCEDE UMBRAL' : 'DENTRO DE PLAZO'}
                </span>
              </div>
            </div>
          </div>

          {/* Catálogo Oficial de Asuetos de Ley — El Salvador */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  Calendario Oficial de Asuetos de Ley — República de El Salvador ({calendarYear})
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                  Fechas nacionales fijas y Semana Santa móvil calculada automáticamente por el motor del SIC
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1' }}>Año de consulta:</span>
                <select
                  value={calendarYear}
                  onChange={(e) => setCalendarYear(Number(e.target.value))}
                  style={{
                    backgroundColor: '#132038',
                    border: '1px solid #2e436e',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ border: '1px solid #2e436e', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col style={{ width: '115px' }} />
                  <col style={{ width: '125px' }} />
                  <col />
                  <col style={{ width: '135px' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27' }}>
                    <th style={{ padding: '9px 8px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>#</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Fecha</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Día Semana</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Conmemoración Oficial</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {officialHolidays.map((h, idx) => (
                    <tr key={h.date + h.name} className="cfg-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: 700, borderRight: '1px solid #3b527d' }}>
                        {formatIsoToDisplay(h.date)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>
                        {getWeekdaySpanish(h.date)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#ffffff', fontWeight: 500, borderRight: '1px solid #3b527d' }}>
                        {h.name}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            backgroundColor: h.type === 'SEMANA SANTA' ? 'rgba(168,85,247,.16)' : 'rgba(59,130,246,.16)',
                            color: h.type === 'SEMANA SANTA' ? '#d8b4fe' : '#93c5fd',
                            border: `1px solid ${h.type === 'SEMANA SANTA' ? 'rgba(168,85,247,.4)' : 'rgba(59,130,246,.4)'}`,
                          }}
                        >
                          {h.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          PESTAÑA 3: BITÁCORA DE AUDITORÍA DEL SISTEMA
         ======================================================================== */}
      {activeTab === 'bitacora' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Panel de Filtros de Bitácora */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              padding: '16px 18px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '175px 150px 150px minmax(180px, 1fr) auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Módulo / Categoría
                </label>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  style={{ ...formInputStyle, padding: '8px 10px', fontSize: '12.5px' }}
                >
                  <option value="ALL">Todos los módulos</option>
                  <option value="AUTH">Autenticación y Accesos</option>
                  <option value="INGRESOS">Ingresos Consulares</option>
                  <option value="DIRECTORIO">Directorio Consular</option>
                  <option value="USUARIOS">Usuarios y Roles</option>
                  <option value="CONFIGURACION">Configuración y Asuetos</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Fecha Del
                </label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  style={{ ...formInputStyle, padding: '8px 10px', fontSize: '12.5px', colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Fecha Al
                </label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  style={{ ...formInputStyle, padding: '8px 10px', fontSize: '12.5px', colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Búsqueda Rápida
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={globalLogSearch}
                    onChange={(e) => setGlobalLogSearch(e.target.value)}
                    placeholder="Usuario, acción o detalle..."
                    style={{ ...formInputStyle, padding: '8px 12px 8px 34px', fontSize: '12.5px' }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex' }}>
                    <IcSearch />
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModuleFilter('ALL');
                    setDateFromFilter('');
                    setDateToFilter('');
                    setGlobalLogSearch('');
                    setLogColFilters({});
                  }}
                  style={{
                    height: '37px',
                    padding: '0 13px',
                    borderRadius: '8px',
                    border: '1px solid #3b527d',
                    backgroundColor: '#132038',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={loadLogs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '37px',
                    padding: '0 13px',
                    borderRadius: '8px',
                    border: '1px solid #3b527d',
                    backgroundColor: '#1c2d4f',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <IcRefresh /> Actualizar
                </button>
                <button
                  type="button"
                  onClick={handleExportLogs}
                  disabled={exportingLogs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    height: '37px',
                    padding: '0 15px',
                    borderRadius: '8px',
                    border: '1px solid rgba(16,185,129,.5)',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: exportingLogs ? 'not-allowed' : 'pointer',
                  }}
                >
                  <IcDownload /> {exportingLogs ? 'Exportando...' : 'Exportar Excel'}
                </button>
              </div>
            </div>
          </div>

          {/* Tabla Principal de Bitácora con bordes superiores dorados y líneas de separación completas */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                Registro Cronológico de Eventos de Auditoría
              </span>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Mostrando <strong style={{ color: '#fcd34d' }}>{filteredLogs.length}</strong> eventos
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '54px' }} />
                  <col style={{ width: '134px' }} />
                  <col style={{ width: '124px' }} />
                  <col style={{ width: '178px' }} />
                  <col style={{ width: '196px' }} />
                  <col />
                  <col style={{ width: '56px' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '1px solid #3b527d' }}>
                    <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>ID</th>
                    <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Fecha y Hora</th>
                    <th style={{ padding: '9px 8px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Módulo</th>
                    <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Acción</th>
                    <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Usuario / Actor</th>
                    <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Detalle de Operación</th>
                    <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>Ver</th>
                  </tr>
                  <tr style={{ backgroundColor: '#192847', borderBottom: '2px solid #C59B27' }}>
                    <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        placeholder="ID"
                        value={logColFilters.id || ''}
                        onChange={(e) => setLogColFilters({ ...logColFilters, id: e.target.value })}
                        style={{ ...colFilterInputStyle, textAlign: 'center' }}
                      />
                    </th>
                    <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        placeholder="dd/mm/aaaa"
                        value={logColFilters.fecha || ''}
                        onChange={(e) => setLogColFilters({ ...logColFilters, fecha: e.target.value })}
                        style={colFilterInputStyle}
                      />
                    </th>
                    <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        placeholder="Filtrar..."
                        value={logColFilters.modulo || ''}
                        onChange={(e) => setLogColFilters({ ...logColFilters, modulo: e.target.value })}
                        style={{ ...colFilterInputStyle, textAlign: 'center' }}
                      />
                    </th>
                    <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        placeholder="Código acción..."
                        value={logColFilters.accion || ''}
                        onChange={(e) => setLogColFilters({ ...logColFilters, accion: e.target.value })}
                        style={colFilterInputStyle}
                      />
                    </th>
                    <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        placeholder="Nombre o correo..."
                        value={logColFilters.usuario || ''}
                        onChange={(e) => setLogColFilters({ ...logColFilters, usuario: e.target.value })}
                        style={colFilterInputStyle}
                      />
                    </th>
                    <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                      <input
                        type="text"
                        size={1}
                        placeholder="Buscar en descripción..."
                        value={logColFilters.detalle || ''}
                        onChange={(e) => setLogColFilters({ ...logColFilters, detalle: e.target.value })}
                        style={colFilterInputStyle}
                      />
                    </th>
                    <th style={{ padding: '5px', textAlign: 'center', color: '#64748b', fontSize: '10px' }}>—</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '34px', textAlign: 'center', color: '#94a3b8' }}>
                        Consultando bitácora de auditoría...
                      </td>
                    </tr>
                  ) : logsError ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '28px', textAlign: 'center', color: '#fca5a5' }}>
                        {logsError}
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No se encontraron eventos en la bitácora para los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="cfg-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                          {log.id}
                        </td>
                        <td style={{ padding: '8px 9px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #3b527d' }}>
                          <ModuleBadge module={log.module} />
                        </td>
                        <td style={{ padding: '8px 9px', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.action}>
                          <ActionBadge action={log.action} />
                        </td>
                        <td style={{ padding: '8px 9px', color: '#e2e8f0', fontWeight: 600, borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.userName}>
                          {log.userName || 'Sistema'}
                        </td>
                        <td style={{ padding: '8px 9px', color: '#cbd5e1', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>
                          {log.details || '-'}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="cfg-act-btn"
                            style={{ color: '#eab308' }}
                            title="Ver detalle completo del evento"
                          >
                            <IcEye />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación de Asueto */}
      {holidayToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 15, 29, 0.78)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              padding: '22px',
              boxShadow: '0 22px 50px rgba(0,0,0,.55)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                Eliminar Asueto Institucional
              </h3>
              <button
                type="button"
                onClick={() => setHolidayToDelete(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IcX />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 18px' }}>
              ¿Confirma que desea retirar la fecha <strong style={{ color: '#fcd34d' }}>{formatIsoToDisplay(holidayToDelete.date)}</strong> ({holidayToDelete.label}) del calendario de días inhábiles?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setHolidayToDelete(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #3b527d',
                  backgroundColor: '#132038',
                  color: '#cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteHoliday}
                disabled={holidayLoading}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(244,63,94,.5)',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: holidayLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {holidayLoading ? 'Eliminando...' : 'Sí, Eliminar Asueto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Evento de Bitácora */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(8, 15, 29, 0.78)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '580px',
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              padding: '22px',
              boxShadow: '0 22px 50px rgba(0,0,0,.55)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #2e436e', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#C59B27' }}><IcShield /></span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#ffffff' }}>
                    Detalle de Evento de Auditoría #{selectedLog.id}
                  </h3>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                    Registro inmutable de trazabilidad del sistema
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <IcX />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Fecha y Hora Exacta</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '3px' }}>
                  {formatDateFull(selectedLog.createdAt)}
                </div>
              </div>
              <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Módulo / Acción</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <ModuleBadge module={selectedLog.module} />
                  <ActionBadge action={selectedLog.action} />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Usuario / Actor Responsable</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginTop: '3px' }}>
                {selectedLog.userName || 'Sistema'}
              </div>
            </div>

            <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px' }}>
                Descripción Completa de la Operación
              </div>
              <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedLog.details || 'Sin detalles adicionales.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #C59B27',
                  backgroundColor: '#1c2d4f',
                  color: '#fcd34d',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
