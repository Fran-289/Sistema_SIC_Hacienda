'use client';

import { useState, useMemo, useEffect, ReactNode } from 'react';
import { fetchApi, downloadApiFile, fetchApiBlobUrl } from '@/lib/api';

interface TotalsSummary {
  recordCount: number;
  identifiedCount: number;
  distributedCount: number;
  undistributedCount: number;
  unidentifiedCount: number;
  totalDepositAmount: number;
  totalIncome: number;
  totalPassport: number;
  totalDui: number;
  totalConsular: number;
  totalCommission: number;
  pendingBalance: number;
}

interface SedeSummaryRow {
  region: string;
  country: string;
  location: string;
  recordCount: number;
  depositAmount: number;
  totalIncome: number;
  passportValue: number;
  duiValue: number;
  consularValue: number;
  commissionValue: number;
  pendingAmount: number;
}

interface MonthSummaryRow {
  periodKey: string;
  year: number;
  month: number;
  periodLabel: string;
  recordCount: number;
  depositAmount: number;
  totalIncome: number;
  passportValue: number;
  duiValue: number;
  consularValue: number;
  commissionValue: number;
  pendingAmount: number;
}

interface StatusSummaryRow {
  status: string;
  recordCount: number;
  depositAmount: number;
  percentage: number;
}

interface InformeCajaItem {
  id: number;
  correlative: string;
  bankAccount: string;
  month: number;
  year: number;
  periodLabel: string;
  saldoAnterior: number;
  totalDepositos: number;
  totalPasaporte: number;
  totalDui: number;
  totalConsulares: number;
  totalComision: number;
  totalDistribuido: number;
  saldoPendiente: number;
  status: string;
  observaciones: string;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ReportHistoryItem {
  id: number;
  reportType: string;
  periodMonth: number;
  periodYear: number;
  periodLabel: string;
  status: string;
  format: string;
  fileName: string;
  userName: string;
  createdAt: string | null;
}

interface AuditEntry {
  id: number;
  userName: string;
  action: string;
  details: string;
  createdAt: string | null;
}

interface ConsulateCatalogItem {
  id: number;
  region: string;
  country: string;
  location: string;
}

interface FinalizedReportDoc {
  id: number;
  reportType: string;
  statusLabel: string;
  hasSignedPdf: boolean;
  signedFileName: string | null;
  uploadedAt: string | null;
}

interface FinalizedReportGroup {
  id: number;
  correlative: string;
  groupType: string;
  periodMonth: number;
  monthName: string;
  periodYear: number;
  status: string;
  processStatus: string;
  createdBy: string;
  createdAt: string | null;
  createdAtFormatted: string;
  updatedAt?: string | null;
  updatedAtFormatted?: string;
  uploadedSignedCount: number;
  requiredSignedCount: number;
  documents: FinalizedReportDoc[];
}

type ReportTab = 'finalizados' | 'sedes' | 'mensual' | 'cierres' | 'historial';

const MONTHS = [
  { value: 0, label: 'Todos los meses (Anual)' },
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const formatMoney = (val: number | string | null | undefined): string => {
  const num = Number(val) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  const clean = iso.replace('T', ' ');
  const datePart = clean.slice(0, 10);
  const timePart = clean.slice(11, 16);
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return clean.slice(0, 16);
  return `${d}/${m}/${y}${timePart ? ` ${timePart}` : ''}`;
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

const IcChart = () => svg(<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>, 22, 2);
const IcDollar = () => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.4 0-2.5.9-2.5 2s1.1 2 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1.1 0-2-.5-2.5-1.5" /></>, 19, 1.9);
const IcCheckCircle = () => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, 18, 1.9);
const IcClock = () => svg(<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>, 18, 1.9);
const IcBuilding = () => svg(<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2" /><path d="M10 21v-3h4v3" /></>, 17, 1.9);
const IcCalendar = () => svg(<><rect x="3" y="4.5" width="18" height="17" rx="2" /><line x1="16" y1="2.5" x2="16" y2="6.5" /><line x1="8" y1="2.5" x2="8" y2="6.5" /><line x1="3" y1="10" x2="21" y2="10" /></>, 17, 1.9);
const IcFilePdf = () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></>, 15, 2);
const IcDownload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, 15, 2);
const IcPlus = () => svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 16, 2.3);
const IcEye = () => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 13, 2.1);
const IcLock = () => svg(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, 13, 2.1);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);
const IcAlert = () => svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 16, 2);
const IcRefresh = () => svg(<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>, 14, 2);
const IcChevronRight = () => svg(<polyline points="9 18 15 12 9 6" />, 14, 2.3);
const IcChevronDown = () => svg(<polyline points="6 9 12 15 18 9" />, 14, 2.3);

function InformeStatusBadge({ status }: { status: string }) {
  const s = (status || 'PRELIMINAR').toUpperCase();
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    DEFINITIVO: { bg: 'rgba(16,185,129,.16)', color: '#6ee7b7', border: 'rgba(16,185,129,.45)' },
    'DEFINITIVO MODIFICADO': { bg: 'rgba(245,158,11,.18)', color: '#fbbf24', border: 'rgba(245,158,11,.45)' },
    PRELIMINAR: { bg: 'rgba(37,99,235,.18)', color: '#60a5fa', border: 'rgba(59,130,246,.45)' },
    'N/A': { bg: 'rgba(59,130,246,.14)', color: '#60a5fa', border: 'rgba(59,130,246,.35)' },
    ANULADO: { bg: 'rgba(244,63,94,.16)', color: '#fda4af', border: 'rgba(244,63,94,.45)' },
  };
  const st = styles[s] || styles.PRELIMINAR;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '9.5px',
        fontWeight: 800,
        letterSpacing: '0.4px',
        backgroundColor: st.bg,
        color: st.color,
        border: `1px solid ${st.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s}
    </span>
  );
}

const EMPTY_TOTALS: TotalsSummary = {
  recordCount: 0,
  identifiedCount: 0,
  distributedCount: 0,
  undistributedCount: 0,
  unidentifiedCount: 0,
  totalDepositAmount: 0,
  totalIncome: 0,
  totalPassport: 0,
  totalDui: 0,
  totalConsular: 0,
  totalCommission: 0,
  pendingBalance: 0,
};

export default function BandejaReportesPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [activeTab, setActiveTab] = useState<ReportTab>('finalizados');

  // Filtros de Consolidación
  const [filterMode, setFilterMode] = useState<'periodo' | 'rango'>('periodo');
  const [yearFilter, setYearFilter] = useState<number>(0); // 0 = Histórico acumulado para mostrar todos de inmediato
  const [monthFilter, setMonthFilter] = useState<number>(0);
  const [dateType, setDateType] = useState<'deposito' | 'concentracion'>('deposito');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Catálogo para combos
  const [consulates, setConsulates] = useState<ConsulateCatalogItem[]>([]);

  // Datos de Resumen Consolidado
  const [periodLabel, setPeriodLabel] = useState('Histórico Acumulado');
  const [totals, setTotals] = useState<TotalsSummary>(EMPTY_TOTALS);
  const [byConsulate, setByConsulate] = useState<SedeSummaryRow[]>([]);
  const [byMonth, setByMonth] = useState<MonthSummaryRow[]>([]);
  const [byStatus, setByStatus] = useState<StatusSummaryRow[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  // Filtros por columna en Consolidado por Sede
  const [sedeColFilters, setSedeColFilters] = useState<Record<string, string>>({});

  // Cierres Mensuales de Caja (informes_caja)
  const [informes, setInformes] = useState<InformeCajaItem[]>([]);
  const [loadingInformes, setLoadingInformes] = useState(true);
  const [showCreateInformeModal, setShowCreateInformeModal] = useState(false);
  const [newInfYear, setNewInfYear] = useState<number>(currentYear);
  const [newInfMonth, setNewInfMonth] = useState<number>(currentMonth);
  const [newInfSaldoAnterior, setNewInfSaldoAnterior] = useState<string>('0.00');
  const [newInfObs, setNewInfObs] = useState<string>('');
  const [creatingInforme, setCreatingInforme] = useState(false);
  const [informeActionError, setInformeActionError] = useState('');

  // Modal Cambio de Estado de Informe (justificación obligatoria >= 5 chars)
  const [statusModalTarget, setStatusModalTarget] = useState<{ item: InformeCajaItem; nextStatus: string } | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Modal Detalle + Historial de Informe
  const [detailInforme, setDetailInforme] = useState<InformeCajaItem | null>(null);
  const [detailHistory, setDetailHistory] = useState<AuditEntry[]>([]);
  const [loadingDetailHistory, setLoadingDetailHistory] = useState(false);

  // Historial de Descargas (report_histories)
  const [historyList, setHistoryList] = useState<ReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyColFilters, setHistoryColFilters] = useState<Record<string, string>>({});

  // Trámites Finalizados (provenientes de Tareas Pendientes — Solo Lectura)
  const [finalizedGroups, setFinalizedGroups] = useState<FinalizedReportGroup[]>([]);
  const [loadingFinalized, setLoadingFinalized] = useState(true);
  const [expandedFinalizedId, setExpandedFinalizedId] = useState<number | null>(null);
  const [finalizedColFilters, setFinalizedColFilters] = useState<Record<string, string>>({});
  const [pdfPreviewModal, setPdfPreviewModal] = useState<{ title: string; url: string; isSigned: boolean } | null>(null);

  // Exportación en curso & Toast
  const [exportingFormat, setExportingFormat] = useState<'PDF' | 'EXCEL' | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4200);
  };

  const buildSummaryQueryString = (reportType?: string) => {
    const p = new URLSearchParams();
    if (reportType) p.set('reportType', reportType);
    p.set('dateType', dateType);
    if (filterMode === 'rango') {
      if (dateFrom) p.set('dateFrom', dateFrom);
      if (dateTo) p.set('dateTo', dateTo);
    } else if (yearFilter > 0) {
      p.set('year', String(yearFilter));
      if (monthFilter >= 1 && monthFilter <= 12) {
        p.set('month', String(monthFilter));
      }
    }
    if (regionFilter !== 'ALL') p.set('region', regionFilter);
    if (countryFilter !== 'ALL') p.set('country', countryFilter);
    if (statusFilter !== 'ALL') p.set('status', statusFilter);
    const qs = p.toString();
    return qs ? `?${qs}` : '';
  };

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      setSummaryError('');
      const data = await fetchApi(`/reports/summary${buildSummaryQueryString()}`);
      if (data) {
        setPeriodLabel(data.periodLabel || 'Histórico Acumulado');
        setTotals({ ...EMPTY_TOTALS, ...(data.totals || {}) });
        setByConsulate(Array.isArray(data.byConsulate) ? data.byConsulate : []);
        setByMonth(Array.isArray(data.byMonth) ? data.byMonth : []);
        setByStatus(Array.isArray(data.byStatus) ? data.byStatus : []);
      }
    } catch (err: any) {
      setSummaryError(err.message || 'No se pudo cargar el consolidado de reportes');
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadInformes = async () => {
    try {
      setLoadingInformes(true);
      const data = await fetchApi('/reports/informes');
      setInformes(Array.isArray(data) ? data : []);
    } catch {
      setInformes([]);
    } finally {
      setLoadingInformes(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await fetchApi('/reports/history');
      setHistoryList(Array.isArray(data) ? data : []);
    } catch {
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadFinalizedGroups = async () => {
    try {
      setLoadingFinalized(true);
      const data = await fetchApi('/report-groups?scope=finalized');
      const list: FinalizedReportGroup[] = Array.isArray(data) ? data : [];
      setFinalizedGroups(list);
      if (expandedFinalizedId !== null && !list.some((g) => g.id === expandedFinalizedId)) {
        setExpandedFinalizedId(null);
      }
    } catch {
      setFinalizedGroups([]);
    } finally {
      setLoadingFinalized(false);
    }
  };

  useEffect(() => {
    fetchApi('/consulates')
      .then((list) => {
        if (Array.isArray(list)) setConsulates(list);
      })
      .catch(() => {});
    loadInformes();
    loadHistory();
    loadFinalizedGroups();
  }, []);

  useEffect(() => {
    loadSummary();
  }, [filterMode, yearFilter, monthFilter, dateType, dateFrom, dateTo, regionFilter, countryFilter, statusFilter]);

  const availableRegions = useMemo(() => {
    const s = new Set<string>(consulates.map((c) => c.region).filter(Boolean));
    return Array.from(s).sort();
  }, [consulates]);

  const availableCountries = useMemo(() => {
    const list = regionFilter === 'ALL' ? consulates : consulates.filter((c) => c.region === regionFilter);
    const s = new Set<string>(list.map((c) => c.country).filter(Boolean));
    return Array.from(s).sort();
  }, [consulates, regionFilter]);

  const filteredSedes = useMemo(() => {
    return byConsulate.filter((row) => {
      if (sedeColFilters.region && !normalizeText(row.region).includes(normalizeText(sedeColFilters.region))) return false;
      if (sedeColFilters.country && !normalizeText(row.country).includes(normalizeText(sedeColFilters.country))) return false;
      if (sedeColFilters.location && !normalizeText(row.location).includes(normalizeText(sedeColFilters.location))) return false;
      return true;
    });
  }, [byConsulate, sedeColFilters]);

  const filteredHistory = useMemo(() => {
    return historyList.filter((h) => {
      if (historyColFilters.tipo && !normalizeText(h.reportType).includes(normalizeText(historyColFilters.tipo))) return false;
      if (historyColFilters.periodo && !normalizeText(h.periodLabel).includes(normalizeText(historyColFilters.periodo))) return false;
      if (historyColFilters.archivo && !normalizeText(h.fileName).includes(normalizeText(historyColFilters.archivo))) return false;
      if (historyColFilters.usuario && !normalizeText(h.userName).includes(normalizeText(historyColFilters.usuario))) return false;
      return true;
    });
  }, [historyList, historyColFilters]);

  const filteredFinalizedGroups = useMemo(() => {
    return finalizedGroups.filter((g) => {
      if (finalizedColFilters.correlative && !normalizeText(g.correlative).includes(normalizeText(finalizedColFilters.correlative))) return false;
      if (finalizedColFilters.groupType && !normalizeText(g.groupType).includes(normalizeText(finalizedColFilters.groupType))) return false;
      if (finalizedColFilters.monthName && !normalizeText(g.monthName).includes(normalizeText(finalizedColFilters.monthName))) return false;
      if (finalizedColFilters.periodYear && !String(g.periodYear).includes(finalizedColFilters.periodYear.trim())) return false;
      if (finalizedColFilters.status && !normalizeText(g.status).includes(normalizeText(finalizedColFilters.status))) return false;
      if (finalizedColFilters.createdBy && !normalizeText(g.createdBy).includes(normalizeText(finalizedColFilters.createdBy))) return false;
      if (finalizedColFilters.updatedAt && !normalizeText(g.updatedAtFormatted || g.createdAtFormatted).includes(normalizeText(finalizedColFilters.updatedAt))) return false;
      return true;
    });
  }, [finalizedGroups, finalizedColFilters]);

  const handlePreviewFinalizedPdf = async (docId: number, label: string, signed: boolean) => {
    try {
      const endpoint = signed
        ? `/report-groups/documents/${docId}/signed-pdf`
        : `/report-groups/documents/${docId}/pdf?inline=true`;
      const blobUrl = await fetchApiBlobUrl(endpoint);
      if (pdfPreviewModal?.url) {
        window.URL.revokeObjectURL(pdfPreviewModal.url);
      }
      setPdfPreviewModal({
        title: signed
          ? `${label} — Documento Firmado Archivado (Solo Lectura)`
          : `${label} — Documento Generado Archivado (Solo Lectura)`,
        url: blobUrl,
        isSigned: signed,
      });
    } catch (err: any) {
      setSummaryError(err.message || 'No se pudo abrir la vista previa del documento PDF');
    }
  };

  const handleClosePdfPreview = () => {
    if (pdfPreviewModal?.url) {
      window.URL.revokeObjectURL(pdfPreviewModal.url);
    }
    setPdfPreviewModal(null);
  };

  const handleDownloadFinalizedDoc = async (docId: number, reportType: string, format: 'pdf' | 'excel') => {
    try {
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      await downloadApiFile(`/report-groups/documents/${docId}/${format}`, `${reportType.toLowerCase()}.${ext}`);
      showToast(`Documento ${reportType} (${ext.toUpperCase()}) descargado.`);
    } catch (err: any) {
      setSummaryError(err.message || 'No se pudo descargar el documento');
    }
  };

  const handleExportConsolidated = async (format: 'PDF' | 'EXCEL') => {
    try {
      setExportingFormat(format);
      const reportType = activeTab === 'mensual' ? 'MENSUAL_ANUAL' : 'POR_SEDE';
      const qs = buildSummaryQueryString(reportType);
      if (format === 'EXCEL') {
        await downloadApiFile(`/reports/export/excel${qs}`, 'reporte_consolidado_sic.xlsx');
        showToast('Reporte consolidado en Excel descargado exitosamente.');
      } else {
        await downloadApiFile(`/reports/export/pdf${qs}`, 'reporte_consolidado_sic.pdf');
        showToast('Reporte consolidado en PDF descargado exitosamente.');
      }
      loadHistory();
    } catch (err: any) {
      setSummaryError(err.message || 'No se pudo exportar el reporte');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCreateInforme = async () => {
    const saldo = parseFloat(newInfSaldoAnterior || '0');
    if (Number.isNaN(saldo) || saldo < 0) {
      setInformeActionError('El saldo anterior debe ser un monto mayor o igual a $0.00.');
      return;
    }
    try {
      setCreatingInforme(true);
      setInformeActionError('');
      await fetchApi('/reports/informes', {
        method: 'POST',
        body: JSON.stringify({
          year: newInfYear,
          month: newInfMonth,
          saldoAnterior: saldo,
          observaciones: newInfObs.trim() || undefined,
        }),
      });
      setShowCreateInformeModal(false);
      setNewInfObs('');
      showToast('Informe Mensual de Caja calculado y guardado correctamente.');
      loadInformes();
    } catch (err: any) {
      setInformeActionError(err.message || 'No se pudo generar el Informe Mensual de Caja');
    } finally {
      setCreatingInforme(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModalTarget) return;
    const trimmed = statusReason.trim();
    if (trimmed.length < 5) {
      setInformeActionError('Es obligatorio ingresar una justificación de al menos 5 caracteres.');
      return;
    }
    try {
      setUpdatingStatus(true);
      setInformeActionError('');
      await fetchApi(`/reports/informes/${statusModalTarget.item.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusModalTarget.nextStatus,
          reason: trimmed,
        }),
      });
      setStatusModalTarget(null);
      setStatusReason('');
      showToast(`Estado del Informe actualizado a ${statusModalTarget.nextStatus}.`);
      loadInformes();
    } catch (err: any) {
      setInformeActionError(err.message || 'No se pudo actualizar el estado del informe');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenDetailInforme = async (inf: InformeCajaItem) => {
    setDetailInforme(inf);
    setDetailHistory([]);
    try {
      setLoadingDetailHistory(true);
      const hist = await fetchApi(`/reports/informes/${inf.id}/history`);
      setDetailHistory(Array.isArray(hist) ? hist : []);
    } catch {
      setDetailHistory([]);
    } finally {
      setLoadingDetailHistory(false);
    }
  };

  const handleDownloadInformePdf = async (inf: InformeCajaItem) => {
    try {
      await downloadApiFile(`/reports/informes/${inf.id}/pdf`, `${inf.correlative.toLowerCase()}.pdf`);
      showToast(`PDF del Informe ${inf.correlative} descargado.`);
      loadHistory();
    } catch (err: any) {
      setSummaryError(err.message || 'No se pudo descargar el PDF del Informe de Caja');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#132038',
    border: '1px solid #2e436e',
    borderRadius: '8px',
    padding: '8px 10px',
    color: '#ffffff',
    fontSize: '12.5px',
    outline: 'none',
  };

  const colFilterStyle: React.CSSProperties = {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <style>{`
        .rep-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all .16s ease;
          border: 1px solid #2e436e;
          background: #132038;
          color: #94a3b8;
        }
        .rep-tab-btn:hover {
          color: #e2e8f0;
          border-color: #47659e;
        }
        .rep-tab-btn.active {
          background: linear-gradient(135deg, rgba(197,155,39,.22) 0%, rgba(197,155,39,.08) 100%);
          color: #fcd34d;
          border-color: #C59B27;
          box-shadow: 0 4px 14px rgba(197,155,39,.15);
        }
        .rep-row:hover td {
          background-color: rgba(59, 130, 246, 0.06);
        }
        .rep-act-btn {
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
        .rep-act-btn:hover {
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
              backgroundColor: 'rgba(59, 130, 246, 0.16)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
            }}
          >
            <IcChart />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#ffffff' }}>
              Bandeja de Reportes y Consolidación Consular
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              Período activo: <strong style={{ color: '#fcd34d' }}>{periodLabel}</strong> — Reportes por sede, cortes mensuales de caja y exportación PDF / Excel
            </p>
          </div>
        </div>

        {/* Botones de Exportación Oficial */}
        <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleExportConsolidated('PDF')}
            disabled={exportingFormat !== null}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(244,63,94,.45)',
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: exportingFormat ? 'not-allowed' : 'pointer',
            }}
          >
            <IcFilePdf /> {exportingFormat === 'PDF' ? 'Generando PDF...' : 'Descargar Consolidado PDF'}
          </button>

          <button
            type="button"
            onClick={() => handleExportConsolidated('EXCEL')}
            disabled={exportingFormat !== null}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(16,185,129,.5)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: exportingFormat ? 'not-allowed' : 'pointer',
            }}
          >
            <IcDownload /> {exportingFormat === 'EXCEL' ? 'Generando Excel...' : 'Descargar Consolidado Excel'}
          </button>
        </div>
      </div>

      {/* Toast */}
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
          <button type="button" onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <IcX />
          </button>
        </div>
      )}

      {/* Panel de Filtros de Período y Alcance */}
      <div
        style={{
          backgroundColor: '#233559',
          border: '1px solid #2e436e',
          borderTop: '3px solid #C59B27',
          borderRadius: '12px',
          padding: '16px 18px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
              Modo de Consulta
            </label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as 'periodo' | 'rango')}
              style={inputStyle}
            >
              <option value="periodo">Por Año / Mes</option>
              <option value="rango">Rango Exacto de Fechas</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
              Criterio de Fecha
            </label>
            <select
              value={dateType}
              onChange={(e) => setDateType(e.target.value as 'deposito' | 'concentracion')}
              style={inputStyle}
            >
              <option value="deposito">Fecha de Depósito</option>
              <option value="concentracion">Fecha Concentración BCR</option>
            </select>
          </div>

          {filterMode === 'periodo' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Año Fiscal
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYearFilter(y);
                    if (y === 0) setMonthFilter(0);
                  }}
                  style={inputStyle}
                >
                  <option value={0}>Histórico Acumulado</option>
                  {[2026, 2025, 2024, 2023].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Mes
                </label>
                <select
                  value={monthFilter}
                  disabled={yearFilter === 0}
                  onChange={(e) => setMonthFilter(Number(e.target.value))}
                  style={{ ...inputStyle, opacity: yearFilter === 0 ? 0.55 : 1 }}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
              Región Geográfica
            </label>
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setCountryFilter('ALL');
              }}
              style={inputStyle}
            >
              <option value="ALL">Todas las regiones</option>
              {availableRegions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
              País
            </label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="ALL">Todos los países</option>
              {availableCountries.map((ctry) => (
                <option key={ctry} value={ctry}>
                  {ctry}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
              Estado Operativo
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="ALL">Todos los estados</option>
              <option value="Identificado Distribuido">Identificado Distribuido</option>
              <option value="Identificado / No distribuido">Identificado / No distribuido</option>
              <option value="No identificado">No identificado</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setFilterMode('periodo');
                setYearFilter(0);
                setMonthFilter(0);
                setDateFrom('');
                setDateTo('');
                setRegionFilter('ALL');
                setCountryFilter('ALL');
                setStatusFilter('ALL');
                setSedeColFilters({});
              }}
              style={{
                width: '100%',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #3b527d',
                backgroundColor: '#132038',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI Financieras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))', gap: '13px' }}>
        <div style={{ backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Depositado ({totals.recordCount} reg.)</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>{formatMoney(totals.totalDepositAmount)}</div>
          <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>Ingresos distribuidos: {formatMoney(totals.totalIncome)}</div>
        </div>

        <div style={{ backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Pasaporte + DUI</div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#6ee7b7', marginTop: '4px' }}>
            {formatMoney(Number(totals.totalPassport) + Number(totals.totalDui))}
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
            Pasaporte: {formatMoney(totals.totalPassport)} | DUI: {formatMoney(totals.totalDui)}
          </div>
        </div>

        <div style={{ backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Consular + Comisión</div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#fcd34d', marginTop: '4px' }}>
            {formatMoney(Number(totals.totalConsular) + Number(totals.totalCommission))}
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
            Consular: {formatMoney(totals.totalConsular)} | Com.: {formatMoney(totals.totalCommission)}
          </div>
        </div>

        <div style={{ backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '11px', padding: '14px 16px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Saldo Pendiente por Aplicar</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: Number(totals.pendingBalance) > 0 ? '#fb7185' : '#34d399', marginTop: '4px' }}>
            {formatMoney(totals.pendingBalance)}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            Sin identif.: {totals.unidentifiedCount} | Sin dist.: {totals.undistributedCount}
          </div>
        </div>
      </div>

      {/* Pestañas de Vistas de Reporte */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className={`rep-tab-btn ${activeTab === 'finalizados' ? 'active' : ''}`} onClick={() => setActiveTab('finalizados')}>
          <IcCheckCircle /> Trámites Finalizados ({finalizedGroups.length})
        </button>
        <button type="button" className={`rep-tab-btn ${activeTab === 'sedes' ? 'active' : ''}`} onClick={() => setActiveTab('sedes')}>
          <IcBuilding /> Consolidado por Sede ({byConsulate.length})
        </button>
        <button type="button" className={`rep-tab-btn ${activeTab === 'mensual' ? 'active' : ''}`} onClick={() => setActiveTab('mensual')}>
          <IcCalendar /> Histórico Mensual y Distribución
        </button>
        <button type="button" className={`rep-tab-btn ${activeTab === 'cierres' ? 'active' : ''}`} onClick={() => setActiveTab('cierres')}>
          <IcDollar /> Informes Mensuales de Caja ({informes.length})
        </button>
        <button type="button" className={`rep-tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
          <IcClock /> Bitácora de Descargas ({historyList.length})
        </button>
      </div>

      {summaryError && (
        <div style={{ padding: '11px 14px', borderRadius: '9px', backgroundColor: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IcAlert /> {summaryError}
        </div>
      )}

      {/* ========================================================================
          VISTA 0: TRÁMITES FINALIZADOS (PROCEDENTES DE TAREAS PENDIENTES — SOLO LECTURA)
         ======================================================================== */}
      {activeTab === 'finalizados' && (
        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Trámites y Reportes Finalizados (Consulta Histórica)</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(16,185,129,.16)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,.4)' }}>
                  <IcLock /> Solo lectura
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                Expedientes que completaron todas las fases en Tareas Pendientes; puede consultar y descargar todo su contenido sin admitir modificaciones.
              </div>
            </div>

            <button
              type="button"
              onClick={loadFinalizedGroups}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '7px',
                border: '1px solid #3b527d',
                backgroundColor: '#132038',
                color: '#e2e8f0',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <IcRefresh /> Actualizar
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '980px', fontSize: '12px' }}>
              <colgroup>
                <col style={{ width: '38px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '215px' }} />
                <col style={{ width: '95px' }} />
                <col style={{ width: '75px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '135px' }} />
                <col style={{ width: '140px' }} />
              </colgroup>

              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '1px solid #3b527d' }}>
                  <th style={{ padding: '10px 6px', borderRight: '1px solid #3b527d' }} />
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Correlativo</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Tipo de Reporte</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Mes</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Año</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Estado</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Generado Por</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>Fecha Finalizado</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: '#cbd5e1', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>Estado Proceso</th>
                </tr>

                <tr style={{ backgroundColor: '#16243f', borderBottom: '2px solid #C59B27' }}>
                  <th style={{ padding: '6px 4px', borderRight: '1px solid #3b527d' }} />
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.correlative || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, correlative: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.groupType || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, groupType: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.monthName || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, monthName: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.periodYear || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, periodYear: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.status || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, status: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.createdBy || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, createdBy: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} value={finalizedColFilters.updatedAt || ''} onChange={(e) => setFinalizedColFilters({ ...finalizedColFilters, updatedAt: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: '10px' }}>Inmutable</th>
                </tr>
              </thead>

              <tbody>
                {loadingFinalized ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>
                      Cargando trámites finalizados...
                    </td>
                  </tr>
                ) : filteredFinalizedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>
                      Aún no hay trámites en estado Finalizado. Cuando un trámite complete sus fases en Tareas Pendientes aparecerá automáticamente aquí.
                    </td>
                  </tr>
                ) : (
                  filteredFinalizedGroups.map((grp) => {
                    const isExp = expandedFinalizedId === grp.id;
                    return (
                      <FinalizedAccordionRow
                        key={grp.id}
                        grp={grp}
                        isExpanded={isExp}
                        onToggle={() => setExpandedFinalizedId((prev) => (prev === grp.id ? null : grp.id))}
                        onPreview={handlePreviewFinalizedPdf}
                        onDownload={handleDownloadFinalizedDoc}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          VISTA 1: CONSOLIDADO POR EMBAJADA / CONSULADO
         ======================================================================== */}
      {activeTab === 'sedes' && (
        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
               Consolidado Financiero por Representación Diplomática / Consular
            </span>
            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
              Sedes con movimiento: <strong style={{ color: '#fcd34d' }}>{filteredSedes.length}</strong>
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1040px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <colgroup>
                <col style={{ width: '46px' }} />
                <col style={{ width: '128px' }} />
                <col style={{ width: '126px' }} />
                <col />
                <col style={{ width: '58px' }} />
                <col style={{ width: '102px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '88px' }} />
                <col style={{ width: '102px' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '1px solid #3b527d' }}>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>#</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Región</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>País</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Embajada / Consulado</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Reg.</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Depositado</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Pasaporte</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>DUI</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Consular</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Comisión</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700 }}>Pendiente</th>
                </tr>
                <tr style={{ backgroundColor: '#192847', borderBottom: '2px solid #C59B27' }}>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d', color: '#64748b', fontSize: '10px', textAlign: 'center' }}>—</th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                    <input
                      type="text"
                      size={1}
                      placeholder="Región..."
                      value={sedeColFilters.region || ''}
                      onChange={(e) => setSedeColFilters({ ...sedeColFilters, region: e.target.value })}
                      style={colFilterStyle}
                    />
                  </th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                    <input
                      type="text"
                      size={1}
                      placeholder="País..."
                      value={sedeColFilters.country || ''}
                      onChange={(e) => setSedeColFilters({ ...sedeColFilters, country: e.target.value })}
                      style={colFilterStyle}
                    />
                  </th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                    <input
                      type="text"
                      size={1}
                      placeholder="Filtrar sede..."
                      value={sedeColFilters.location || ''}
                      onChange={(e) => setSedeColFilters({ ...sedeColFilters, location: e.target.value })}
                      style={colFilterStyle}
                    />
                  </th>
                  <th colSpan={7} style={{ padding: '5px 10px', textAlign: 'right', color: '#94a3b8', fontSize: '10.5px', fontWeight: 600 }}>
                    Cifras expresadas en USD ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingSummary ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '34px', textAlign: 'center', color: '#94a3b8' }}>
                      Calculando consolidado por sede...
                    </td>
                  </tr>
                ) : filteredSedes.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No existen depósitos registrados para los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredSedes.map((row, idx) => (
                    <tr key={`${row.region}-${row.country}-${row.location}`} className="rep-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px', color: '#93c5fd', fontSize: '11px', fontWeight: 700, borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.region}>
                        {row.region}
                      </td>
                      <td style={{ padding: '8px', color: '#cbd5e1', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.country}>
                        {row.country}
                      </td>
                      <td style={{ padding: '8px', color: row.location === 'NO IDENTIFICADA' ? '#fda4af' : '#ffffff', fontWeight: 600, fontStyle: row.location === 'NO IDENTIFICADA' ? 'italic' : 'normal', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.location}>
                        {row.location}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#e2e8f0', fontWeight: 700, borderRight: '1px solid #3b527d' }}>
                        {row.recordCount}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ffffff', fontWeight: 700, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {formatMoney(row.depositAmount)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {formatMoney(row.passportValue)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {formatMoney(row.duiValue)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {formatMoney(row.consularValue)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#C59B27', fontWeight: 700, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {formatMoney(row.commissionValue)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: Number(row.pendingAmount) > 0 ? '#fda4af' : '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {formatMoney(row.pendingAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          VISTA 2: HISTÓRICO MENSUAL Y DISTRIBUCIÓN POR ESTADO
         ======================================================================== */}
      {activeTab === 'mensual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Tabla Distribución vs. Sin Identificar */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                Composición por Estado Operativo (Distribuido vs. Pendiente de Identificar / Distribuir)
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12.5px' }}>
              <colgroup>
                <col style={{ width: '48px' }} />
                <col />
                <col style={{ width: '110px' }} />
                <col style={{ width: '155px' }} />
                <col style={{ width: '180px' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27' }}>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>#</th>
                  <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Estado del Depósito</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Registros</th>
                  <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Monto Acumulado</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center', color: '#cbd5e1' }}>Participación (%)</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.map((st, idx) => (
                  <tr key={st.status} className="rep-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                    <td style={{ padding: '9px 6px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{idx + 1}</td>
                    <td style={{ padding: '9px 10px', color: '#ffffff', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{st.status}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', color: '#e2e8f0', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{st.recordCount}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: '#fcd34d', fontWeight: 800, borderRight: '1px solid #3b527d' }}>{formatMoney(st.depositAmount)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>{Number(st.percentage).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabla Consolidado Mensual */}
          <div
            style={{
              backgroundColor: '#233559',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                Consolidado Mensual de Ingresos Consulares
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '880px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '48px' }} />
                  <col />
                  <col style={{ width: '74px' }} />
                  <col style={{ width: '115px' }} />
                  <col style={{ width: '105px' }} />
                  <col style={{ width: '98px' }} />
                  <col style={{ width: '105px' }} />
                  <col style={{ width: '98px' }} />
                  <col style={{ width: '112px' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27' }}>
                    <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>#</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Mes / Año</th>
                    <th style={{ padding: '9px 8px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Reg.</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Depositado</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Pasaporte</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>DUI</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Consular</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Comisión</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right', color: '#cbd5e1' }}>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        Sin registros mensuales en el período consultado.
                      </td>
                    </tr>
                  ) : (
                    byMonth.map((m, idx) => (
                      <tr key={m.periodKey} className="rep-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', color: '#ffffff', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{m.periodLabel}</td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#e2e8f0', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{m.recordCount}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ffffff', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{formatMoney(m.depositAmount)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>{formatMoney(m.passportValue)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>{formatMoney(m.duiValue)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>{formatMoney(m.consularValue)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#C59B27', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{formatMoney(m.commissionValue)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: Number(m.pendingAmount) > 0 ? '#fda4af' : '#64748b', fontWeight: 700 }}>{formatMoney(m.pendingAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          VISTA 3: INFORMES MENSUALES DE CAJA (informes_caja)
         ======================================================================== */}
      {activeTab === 'cierres' && (
        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                Cortes e Informes Mensuales de Caja DGT
              </div>
              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Consolida depósitos mensuales, ingresos distribuidos y saldo pendiente con correlativo oficial auditable
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setInformeActionError('');
                setShowCreateInformeModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #d4a72c',
                background: 'linear-gradient(135deg, #C59B27 0%, #a67f19 100%)',
                color: '#0f172a',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <IcPlus /> Generar / Recalcular Corte Mensual
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <colgroup>
                <col style={{ width: '48px' }} />
                <col style={{ width: '125px' }} />
                <col style={{ width: '122px' }} />
                <col style={{ width: '104px' }} />
                <col style={{ width: '108px' }} />
                <col style={{ width: '112px' }} />
                <col style={{ width: '108px' }} />
                <col style={{ width: '104px' }} />
                <col />
                <col style={{ width: '102px' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27' }}>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>ID</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Correlativo</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Período</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Saldo Ant.</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Depósitos Mes</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Distribuido</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Pendiente</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Estado</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Elaborado por</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingInformes ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Cargando informes mensuales de caja...
                    </td>
                  </tr>
                ) : informes.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      Aún no se han emitido cortes mensuales de caja. Use el botón superior para generar el primer corte.
                    </td>
                  </tr>
                ) : (
                  informes.map((inf) => (
                    <tr key={inf.id} className="rep-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{inf.id}</td>
                      <td style={{ padding: '8px', color: '#fcd34d', fontWeight: 800, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>{inf.correlative}</td>
                      <td style={{ padding: '8px', color: '#ffffff', fontWeight: 600, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>{inf.periodLabel}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>{formatMoney(inf.saldoAnterior)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ffffff', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{formatMoney(inf.totalDepositos)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#6ee7b7', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{formatMoney(inf.totalDistribuido)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: Number(inf.saldoPendiente) > 0 ? '#fda4af' : '#94a3b8', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{formatMoney(inf.saldoPendiente)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #3b527d' }}>
                        <InformeStatusBadge status={inf.status} />
                      </td>
                      <td style={{ padding: '8px', color: '#cbd5e1', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inf.createdBy}>
                        {inf.createdBy}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button type="button" onClick={() => handleDownloadInformePdf(inf)} className="rep-act-btn" style={{ color: '#22c55e' }} title="Descargar PDF del Informe">
                            <IcDownload />
                          </button>
                          <button type="button" onClick={() => handleOpenDetailInforme(inf)} className="rep-act-btn" style={{ color: '#eab308' }} title="Ver detalle e historial">
                            <IcEye />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInformeActionError('');
                              setStatusReason('');
                              const next = inf.status === 'PRELIMINAR' ? 'DEFINITIVO' : 'PRELIMINAR';
                              setStatusModalTarget({ item: inf, nextStatus: next });
                            }}
                            className="rep-act-btn"
                            style={{ color: '#38bdf8' }}
                            title="Cambiar estado del cierre (justificación obligatoria)"
                          >
                            <IcLock />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          VISTA 4: BITÁCORA DE DESCARGAS DE REPORTES (report_histories)
         ======================================================================== */}
      {activeTab === 'historial' && (
        <div
          style={{
            backgroundColor: '#233559',
            border: '1px solid #2e436e',
            borderTop: '3px solid #C59B27',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
              Historial de Emisión y Descarga de Reportes Oficiales
            </span>
            <button
              type="button"
              onClick={loadHistory}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '7px', border: '1px solid #3b527d', backgroundColor: '#132038', color: '#cbd5e1', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              <IcRefresh /> Actualizar
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <colgroup>
                <col style={{ width: '52px' }} />
                <col style={{ width: '138px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '84px' }} />
                <col />
                <col style={{ width: '165px' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '1px solid #3b527d' }}>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>ID</th>
                  <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Fecha Emisión</th>
                  <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Tipo Reporte</th>
                  <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Período</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Formato</th>
                  <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Archivo Generado</th>
                  <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1' }}>Emitido por</th>
                </tr>
                <tr style={{ backgroundColor: '#192847', borderBottom: '2px solid #C59B27' }}>
                  <th style={{ padding: '5px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #3b527d' }}>—</th>
                  <th style={{ padding: '5px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #3b527d' }}>—</th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Tipo..." value={historyColFilters.tipo || ''} onChange={(e) => setHistoryColFilters({ ...historyColFilters, tipo: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Período..." value={historyColFilters.periodo || ''} onChange={(e) => setHistoryColFilters({ ...historyColFilters, periodo: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px', textAlign: 'center', color: '#64748b', borderRight: '1px solid #3b527d' }}>—</th>
                  <th style={{ padding: '5px 6px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Nombre archivo..." value={historyColFilters.archivo || ''} onChange={(e) => setHistoryColFilters({ ...historyColFilters, archivo: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px 6px' }}>
                    <input type="text" size={1} placeholder="Usuario..." value={historyColFilters.usuario || ''} onChange={(e) => setHistoryColFilters({ ...historyColFilters, usuario: e.target.value })} style={colFilterStyle} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Cargando historial...</td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '34px', textAlign: 'center', color: '#94a3b8' }}>No se registran descargas de reportes aún.</td>
                  </tr>
                ) : (
                  filteredHistory.map((h) => (
                    <tr key={h.id} className="rep-row" style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{h.id}</td>
                      <td style={{ padding: '8px 9px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>{formatDateTime(h.createdAt)}</td>
                      <td style={{ padding: '8px 9px', color: '#93c5fd', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{h.reportType}</td>
                      <td style={{ padding: '8px 9px', color: '#e2e8f0', borderRight: '1px solid #3b527d' }}>{h.periodLabel}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #3b527d' }}>
                        <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, backgroundColor: h.format === 'PDF' ? 'rgba(244,63,94,.16)' : 'rgba(16,185,129,.16)', color: h.format === 'PDF' ? '#fda4af' : '#6ee7b7', border: `1px solid ${h.format === 'PDF' ? 'rgba(244,63,94,.4)' : 'rgba(16,185,129,.4)'}` }}>
                          {h.format}
                        </span>
                      </td>
                      <td style={{ padding: '8px 9px', color: '#ffffff', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.fileName}>{h.fileName}</td>
                      <td style={{ padding: '8px 9px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.userName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: GENERAR / RECALCULAR INFORME MENSUAL DE CAJA
         ======================================================================== */}
      {showCreateInformeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(8,15,29,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '12px', padding: '22px', boxShadow: '0 22px 50px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                Generar / Recalcular Informe Mensual de Caja
              </h3>
              <button type="button" onClick={() => setShowCreateInformeModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <IcX />
              </button>
            </div>

            {informeActionError && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', fontSize: '12px' }}>
                {informeActionError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>Año Fiscal *</label>
                  <select value={newInfYear} onChange={(e) => setNewInfYear(Number(e.target.value))} style={inputStyle}>
                    {[2026, 2025, 2024, 2023].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>Mes *</label>
                  <select value={newInfMonth} onChange={(e) => setNewInfMonth(Number(e.target.value))} style={inputStyle}>
                    {MONTHS.filter((m) => m.value > 0).map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Saldo Anterior Pendiente ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newInfSaldoAnterior}
                  onChange={(e) => setNewInfSaldoAnterior(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Observaciones (Opcional)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={newInfObs}
                  onChange={(e) => setNewInfObs(e.target.value)}
                  placeholder="Notas de conciliación bancaria del mes..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowCreateInformeModal(false)} style={{ padding: '9px 15px', borderRadius: '8px', border: '1px solid #3b527d', backgroundColor: '#132038', color: '#cbd5e1', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateInforme}
                  disabled={creatingInforme}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d4a72c', background: 'linear-gradient(135deg, #C59B27 0%, #a67f19 100%)', color: '#0f172a', fontSize: '12.5px', fontWeight: 800, cursor: creatingInforme ? 'not-allowed' : 'pointer' }}
                >
                  {creatingInforme ? 'Procesando...' : 'Generar Corte Mensual'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: CAMBIAR ESTADO DE INFORME (JUSTIFICACIÓN OBLIGATORIA)
         ======================================================================== */}
      {statusModalTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(8,15,29,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '490px', backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '12px', padding: '22px', boxShadow: '0 22px 50px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                Cambiar Estado — {statusModalTarget.item.correlative}
              </h3>
              <button type="button" onClick={() => setStatusModalTarget(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <IcX />
              </button>
            </div>

            {informeActionError && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.4)', color: '#fca5a5', fontSize: '12px' }}>
                {informeActionError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Nuevo Estado del Cierre <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <select
                  value={statusModalTarget.nextStatus}
                  onChange={(e) => setStatusModalTarget({ ...statusModalTarget, nextStatus: e.target.value })}
                  style={inputStyle}
                >
                  <option value="DEFINITIVO">DEFINITIVO (Cierre Oficial Bloqueado)</option>
                  <option value="PRELIMINAR">PRELIMINAR (Habilitar Recálculo)</option>
                  <option value="ANULADO">ANULADO (Desvincular Registros)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Motivo / Justificación Obligatoria <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Explique obligatoriamente el motivo del cambio de estado (mínimo 5 caracteres)..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <div style={{ fontSize: '11px', color: statusReason.trim().length >= 5 ? '#6ee7b7' : '#fbbf24', marginTop: '4px' }}>
                  {statusReason.trim().length >= 5
                    ? `Justificación válida (${statusReason.trim().length}/500 caracteres)`
                    : 'Requerido: ingrese al menos 5 caracteres para habilitar la confirmación.'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setStatusModalTarget(null)} style={{ padding: '9px 15px', borderRadius: '8px', border: '1px solid #3b527d', backgroundColor: '#132038', color: '#cbd5e1', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusChange}
                  disabled={updatingStatus || statusReason.trim().length < 5}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #d4a72c',
                    background: 'linear-gradient(135deg, #C59B27 0%, #a67f19 100%)',
                    color: '#0f172a',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: updatingStatus || statusReason.trim().length < 5 ? 'not-allowed' : 'pointer',
                    opacity: updatingStatus || statusReason.trim().length < 5 ? 0.5 : 1,
                  }}
                >
                  {updatingStatus ? 'Guardando...' : 'Confirmar Cambio de Estado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: VER DETALLE E HISTORIAL DE INFORME DE CAJA
         ======================================================================== */}
      {detailInforme && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(8,15,29,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '12px', padding: '22px', boxShadow: '0 22px 50px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #2e436e', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  Informe Mensual de Caja {detailInforme.correlative} — {detailInforme.periodLabel}
                </h3>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                  Cuenta BCR: {detailInforme.bankAccount} | Elaborado por: {detailInforme.createdBy}
                </div>
              </div>
              <button type="button" onClick={() => setDetailInforme(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <IcX />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Saldo Anterior</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#cbd5e1', marginTop: '3px' }}>{formatMoney(detailInforme.saldoAnterior)}</div>
              </div>
              <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Depósitos del Mes</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginTop: '3px' }}>{formatMoney(detailInforme.totalDepositos)}</div>
              </div>
              <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Distribuido</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#6ee7b7', marginTop: '3px' }}>{formatMoney(detailInforme.totalDistribuido)}</div>
              </div>
              <div style={{ backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Saldo Pendiente</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fda4af', marginTop: '3px' }}>{formatMoney(detailInforme.saldoPendiente)}</div>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fcd34d', marginBottom: '8px' }}>
              Historial de Auditoría del Informe
            </div>
            <div style={{ border: '1px solid #2e436e', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11.5px' }}>
                <colgroup>
                  <col style={{ width: '125px' }} />
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '145px' }} />
                  <col />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '2px solid #C59B27' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Fecha</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Usuario</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#cbd5e1', borderRight: '1px solid #3b527d' }}>Acción</th>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#cbd5e1' }}>Detalle / Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDetailHistory ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>Cargando historial...</td>
                    </tr>
                  ) : detailHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>Sin eventos adicionales registrados.</td>
                    </tr>
                  ) : (
                    detailHistory.map((h) => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                        <td style={{ padding: '7px 8px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>{formatDateTime(h.createdAt)}</td>
                        <td style={{ padding: '7px 8px', color: '#e2e8f0', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.userName}</td>
                        <td style={{ padding: '7px 8px', color: '#fcd34d', fontWeight: 700, borderRight: '1px solid #3b527d' }}>{h.action}</td>
                        <td style={{ padding: '7px 8px', color: '#ffffff' }}>{h.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleDownloadInformePdf(detailInforme)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 15px', borderRadius: '8px', border: '1px solid rgba(16,185,129,.45)', backgroundColor: '#059669', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                <IcDownload /> Descargar PDF
              </button>
              <button
                type="button"
                onClick={() => setDetailInforme(null)}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #C59B27', backgroundColor: '#1c2d4f', color: '#fcd34d', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa PDF de Trámites Finalizados (Solo Lectura) */}
      {pdfPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 12, 24, 0.84)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '18px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '940px',
              height: '86vh',
              backgroundColor: '#1a2946',
              border: '1px solid #2e436e',
              borderTop: '3px solid #C59B27',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 54px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: pdfPreviewModal.isSigned ? '#4ade80' : '#ffffff' }}>
                  {pdfPreviewModal.title}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(16,185,129,.16)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,.4)' }}>
                  Solo lectura
                </span>
              </div>
              <button
                type="button"
                onClick={handleClosePdfPreview}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <IcX />
              </button>
            </div>

            <div style={{ flex: 1, backgroundColor: '#0f172a' }}>
              <iframe
                src={pdfPreviewModal.url}
                title={pdfPreviewModal.title}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid #2e436e', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#16243f' }}>
              <a
                href={pdfPreviewModal.url}
                download={`${pdfPreviewModal.title.replace(/[^A-Za-z0-9_-]/g, '_').toLowerCase()}.pdf`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '7px', border: '1px solid rgba(16,185,129,.45)', backgroundColor: '#059669', color: '#ffffff', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
              >
                <IcDownload /> Descargar copia PDF
              </a>
              <button
                type="button"
                onClick={handleClosePdfPreview}
                style={{ padding: '7px 16px', borderRadius: '7px', border: '1px solid #C59B27', backgroundColor: '#1c2d4f', color: '#fcd34d', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinalizedAccordionRow({
  grp,
  isExpanded,
  onToggle,
  onPreview,
  onDownload,
}: {
  grp: FinalizedReportGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onPreview: (docId: number, label: string, signed: boolean) => void;
  onDownload: (docId: number, reportType: string, format: 'pdf' | 'excel') => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          backgroundColor: isExpanded ? '#1f3154' : '#172542',
          borderBottom: '1px solid #3b527d',
          cursor: 'pointer',
        }}
      >
        <td style={{ padding: '10px 6px', textAlign: 'center', color: isExpanded ? '#fcd34d' : '#94a3b8', borderRight: '1px solid #3b527d' }}>
          {isExpanded ? <IcChevronDown /> : <IcChevronRight />}
        </td>
        <td style={{ padding: '10px 10px', color: '#ffffff', fontWeight: 800, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
          {grp.correlative}
        </td>
        <td style={{ padding: '10px 10px', color: '#e2e8f0', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {grp.groupType}
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
          {grp.monthName}
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
          {grp.periodYear}
        </td>
        <td style={{ padding: '10px 10px', borderRight: '1px solid #3b527d' }}>
          <InformeStatusBadge status={grp.status} />
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={grp.createdBy}>
          {grp.createdBy}
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
          {grp.updatedAtFormatted || grp.createdAtFormatted}
        </td>
        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '10.5px',
              fontWeight: 800,
              backgroundColor: 'rgba(16,185,129,.2)',
              color: '#6ee7b7',
              border: '1px solid rgba(16,185,129,.45)',
              whiteSpace: 'nowrap',
            }}
          >
            Finalizado
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr style={{ backgroundColor: '#0c1526', borderBottom: '2px solid #3b527d' }}>
          <td colSpan={9} style={{ padding: '14px 22px' }}>
            <div style={{ border: '1px solid #2e436e', borderTop: '2px solid #C59B27', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f192d' }}>
              <div style={{ padding: '8px 14px', backgroundColor: '#13213c', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px' }}>
                <span style={{ color: '#cbd5e1' }}>
                  Contenido completo del trámite <strong style={{ color: '#ffffff' }}>Correlativo {grp.correlative}</strong> ({grp.monthName} {grp.periodYear} · Generado el {grp.createdAtFormatted})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#6ee7b7', fontWeight: 700 }}>
                  <IcLock /> Trámite cerrado — sin edición habilitada
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '32%' }} />
                  <col style={{ width: '32%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#192845', borderBottom: '1px solid #3b527d' }}>
                    <th style={{ padding: '9px 14px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>
                      Documento Contenido
                    </th>
                    <th style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>
                      Estado Archivado
                    </th>
                    <th style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>
                      Consulta / Descarga (Solo Lectura)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grp.documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #25385c' }}>
                      <td style={{ padding: '10px 14px', color: '#ffffff', fontWeight: 800, borderRight: '1px solid #25385c' }}>
                        {doc.reportType}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', borderRight: '1px solid #25385c' }}>
                        {doc.hasSignedPdf ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, fontSize: '11.5px' }} title={doc.signedFileName || ''}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                            Firmado Archivado {doc.signedFileName ? `(${doc.signedFileName})` : ''}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#93c5fd', fontWeight: 700, fontSize: '11.5px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#60a5fa' }} />
                            Archivado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => onPreview(doc.id, doc.reportType, false)}
                            style={{ width: '30px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #475569', backgroundColor: 'rgba(15,23,42,.6)', color: '#cbd5e1', cursor: 'pointer' }}
                            title="Ver PDF generado"
                          >
                            <IcEye />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDownload(doc.id, doc.reportType, 'pdf')}
                            style={{ width: '30px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid rgba(239,68,68,.55)', backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171', cursor: 'pointer' }}
                            title="Descargar PDF generado"
                          >
                            <IcFilePdf />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDownload(doc.id, doc.reportType, 'excel')}
                            style={{ width: '30px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid rgba(16,185,129,.55)', backgroundColor: 'rgba(16,185,129,.12)', color: '#34d399', cursor: 'pointer' }}
                            title="Descargar Excel"
                          >
                            <IcDownload />
                          </button>

                          {doc.hasSignedPdf && (
                            <button
                              type="button"
                              onClick={() => onPreview(doc.id, doc.reportType, true)}
                              style={{
                                width: '30px',
                                height: '28px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                border: '1px solid #22c55e',
                                backgroundColor: 'rgba(34,197,94,.22)',
                                color: '#4ade80',
                                boxShadow: '0 0 10px rgba(34,197,94,.28)',
                                cursor: 'pointer',
                              }}
                              title={`Ver documento firmado archivado (${doc.signedFileName || 'PDF firmado'})`}
                            >
                              <IcEye />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
