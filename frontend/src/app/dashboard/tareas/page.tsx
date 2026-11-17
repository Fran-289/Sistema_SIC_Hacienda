'use client';

import { useState, useMemo, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi, downloadApiFile, fetchApiBlobUrl } from '@/lib/api';

/* =========================================================================
   TIPOS DE DATOS — TRÁMITES DE REPORTES (TAREAS PENDIENTES OFICIALES)
   ========================================================================= */
interface ReportDocItem {
  id: number;
  reportType: string;
  statusLabel: string;
  hasSignedPdf: boolean;
  signedFileName: string | null;
  uploadedAt: string | null;
}

interface ReportGroupItem {
  id: number;
  correlative: string;
  groupType: string;
  periodMonth: number;
  monthName: string;
  periodYear: number;
  status: string;
  processStatus: string;
  nextProcessStatus?: string | null;
  isFinalized?: boolean;
  createdBy: string;
  createdAt: string | null;
  createdAtFormatted: string;
  updatedAt?: string | null;
  updatedAtFormatted?: string;
  uploadedSignedCount: number;
  requiredSignedCount: number;
  canAdvance: boolean;
  documents: ReportDocItem[];
}

type GroupSortField =
  | 'correlative'
  | 'groupType'
  | 'monthName'
  | 'periodYear'
  | 'status'
  | 'createdBy'
  | 'createdAt'
  | 'processStatus';

/* =========================================================================
   TIPOS DE DATOS — SEGUIMIENTO DE DEPÓSITOS PENDIENTES (PROPUESTA CLIENTE)
   ========================================================================= */
interface TaskSummary {
  totalPending: number;
  unidentifiedCount: number;
  undistributedCount: number;
  delayedConcentrationCount: number;
  totalPendingAmount: number;
}

interface DepositTaskItem {
  id: number;
  primaryCategory: 'SIN_IDENTIFICAR' | 'SIN_DISTRIBUIR' | 'MORA_CONCENTRACION';
  priority: 'CRITICA' | 'ALTA' | 'MEDIA';
  priorityLabel: string;
  isUnidentified: boolean;
  isUndistributed: boolean;
  isConcentrationDelayed: boolean;
  missingConcentration: boolean;
  status: string;
  displayStatus: string;
  depositDate: string | null;
  depositDateFormatted: string;
  concentrationDate: string | null;
  concentrationDateFormatted: string;
  ageBusinessDays: number;
  concentrationDays: number;
  depositAmount: number;
  region: string;
  country: string;
  location: string;
  alerts: string[];
  requiredAction: string;
  createdBy: string;
}

const EMPTY_SUMMARY: TaskSummary = {
  totalPending: 0,
  unidentifiedCount: 0,
  undistributedCount: 0,
  delayedConcentrationCount: 0,
  totalPendingAmount: 0,
};

const MONTHS_OPTIONS = [
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

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado'));
    reader.readAsDataURL(file);
  });

/* ---------- Iconos ---------- */
const svg = (children: ReactNode, size = 16, sw = 1.9) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcFileDoc = () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>, 18, 1.9);
const IcChevronRight = () => svg(<polyline points="9 18 15 12 9 6" />, 14, 2.3);
const IcChevronDown = () => svg(<polyline points="6 9 12 15 18 9" />, 14, 2.3);
const IcEye = () => svg(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, 14, 2);
const IcPdfDoc = () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /></>, 14, 2);
const IcDownload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>, 14, 2);
const IcUpload = () => svg(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>, 14, 2);
const IcPaperPlane = () => svg(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>, 13, 2);
const IcMail = () => svg(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>, 14, 2);
const IcRefresh = () => svg(<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>, 14, 2);
const IcPlus = () => svg(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, 14, 2.3);
const IcClipboard = () => svg(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 12l2 2 4-4" /></>, 19, 1.9);
const IcAlertTriangle = () => svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 18, 2);
const IcCoins = () => svg(<><circle cx="9" cy="9" r="6" /><path d="M15.5 5.2a6 6 0 0 1 0 13.6" /><path d="M9 6.5v5M7.2 8.2h3.6" /></>, 18, 1.9);
const IcClock = () => svg(<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>, 18, 1.9);
const IcArrowRight = () => svg(<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></>, 13, 2.2);
const IcCheckCircle = () => svg(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>, 18, 2);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);

/* ---------- Badges ---------- */
function GroupStatusBadge({ status }: { status: string }) {
  const s = (status || 'PRELIMINAR').toUpperCase();
  let bg = 'rgba(37, 99, 235, 0.22)';
  let color = '#60a5fa';
  let border = 'rgba(59, 130, 246, 0.45)';

  if (s === 'DEFINITIVO') {
    bg = 'rgba(16, 185, 129, 0.2)';
    color = '#34d399';
    border = 'rgba(16, 185, 129, 0.45)';
  } else if (s === 'DEFINITIVO MODIFICADO') {
    bg = 'rgba(245, 158, 11, 0.2)';
    color = '#fbbf24';
    border = 'rgba(245, 158, 11, 0.5)';
  } else if (s === 'N/A') {
    bg = 'rgba(37, 99, 235, 0.18)';
    color = '#60a5fa';
    border = 'rgba(59, 130, 246, 0.4)';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.3px',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s}
    </span>
  );
}

function ProcessStageBadge({ stage }: { stage: string }) {
  const s = (stage || 'Firma Jefatura').trim();
  const low = s.toLowerCase();
  let bg = 'rgba(37,99,235,.18)';
  let color = '#60a5fa';
  let border = 'rgba(59,130,246,.4)';

  if (low.includes('modific')) {
    bg = 'rgba(245,158,11,.18)';
    color = '#fbbf24';
    border = 'rgba(245,158,11,.45)';
  } else if (low.includes('recaudac')) {
    bg = 'rgba(139,92,246,.2)';
    color = '#c4b5fd';
    border = 'rgba(139,92,246,.45)';
  } else if (low === 'finalizado' || low === 'completado') {
    bg = 'rgba(16,185,129,.2)';
    color = '#6ee7b7';
    border = 'rgba(16,185,129,.45)';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: '999px',
        fontSize: '10.5px',
        fontWeight: 700,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s}
    </span>
  );
}

function PriorityBadge({ priority, label }: { priority: string; label: string }) {
  const p = (priority || 'MEDIA').toUpperCase();
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    CRITICA: { bg: 'rgba(244,63,94,.2)', color: '#fda4af', border: 'rgba(244,63,94,.55)' },
    ALTA: { bg: 'rgba(249,115,22,.18)', color: '#fdba74', border: 'rgba(249,115,22,.5)' },
    MEDIA: { bg: 'rgba(234,179,8,.16)', color: '#fde047', border: 'rgba(234,179,8,.45)' },
  };
  const st = styles[p] || styles.MEDIA;

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
        backgroundColor: st.bg,
        color: st.color,
        border: `1px solid ${st.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label || p}
    </span>
  );
}

function AlertChip({ text }: { text: string }) {
  const isRed = text.includes('SIN IDENTIFICAR');
  const isAmber = text.includes('SIN DISTRIBUIR');
  const bg = isRed ? 'rgba(244,63,94,.14)' : isAmber ? 'rgba(245,158,11,.15)' : 'rgba(56,189,248,.14)';
  const color = isRed ? '#fda4af' : isAmber ? '#fcd34d' : '#7dd3fc';
  const border = isRed ? 'rgba(244,63,94,.4)' : isAmber ? 'rgba(245,158,11,.4)' : 'rgba(56,189,248,.4)';

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: '5px',
        fontSize: '9.5px',
        fontWeight: 800,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

export default function TareasPendientesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- ESTADO SECCIÓN 1: TAREAS PENDIENTES (TRÁMITES DE REPORTES) ---------------- */
  const [groups, setGroups] = useState<ReportGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupFilters, setGroupFilters] = useState<Record<string, string>>({});
  const [groupSortField, setGroupSortField] = useState<GroupSortField>('createdAt');
  const [groupSortDir, setGroupSortDir] = useState<'asc' | 'desc'>('desc');

  // Subida de PDF firmado
  const [uploadTarget, setUploadTarget] = useState<{ groupId: number; docId: number; reportType: string } | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);

  // Modal visor de PDF (ojo gris o segundo ojo verde)
  const [pdfPreview, setPdfPreview] = useState<{ title: string; url: string; isSigned: boolean } | null>(null);

  // Modal crear nuevo paquete (para probar correlativos .x y ambos tipos)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGrpType, setNewGrpType] = useState<'Reportes Consulares' | 'No Identificados / No Distribuidos'>('Reportes Consulares');
  const [newGrpMonth, setNewGrpMonth] = useState<number>(new Date().getMonth() + 1);
  const [newGrpYear, setNewGrpYear] = useState<number>(new Date().getFullYear());
  const [newGrpStatus, setNewGrpStatus] = useState<string>('PRELIMINAR');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Mensajes de aviso / éxito
  const [toastMsg, setToastMsg] = useState('');
  const [warningModalMsg, setWarningModalMsg] = useState<string | null>(null);

  /* ---------------- ESTADO SECCIÓN 2: HISTORIAL / SEGUIMIENTO DE DEPÓSITOS ---------------- */
  const [thresholdDays, setThresholdDays] = useState<number>(5);
  const [summary, setSummary] = useState<TaskSummary>(EMPTY_SUMMARY);
  const [depositTasks, setDepositTasks] = useState<DepositTaskItem[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [histColFilters, setHistColFilters] = useState<Record<string, string>>({});
  const [exportingDeposits, setExportingDeposits] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4400);
  };

  const loadReportGroups = async (preserveExpanded = true) => {
    try {
      setLoadingGroups(true);
      const data = await fetchApi('/report-groups?scope=pending');
      const list: ReportGroupItem[] = Array.isArray(data) ? data : [];
      setGroups(list);
      if (!preserveExpanded) {
        setExpandedGroupId(null);
      } else if (expandedGroupId !== null && !list.some((g) => g.id === expandedGroupId)) {
        setExpandedGroupId(null);
      }
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudieron cargar los paquetes de Tareas Pendientes');
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadDepositTasks = async () => {
    try {
      setLoadingDeposits(true);
      const qs = categoryFilter !== 'ALL' ? `?category=${categoryFilter}` : '';
      const data = await fetchApi(`/tasks${qs}`);
      if (data) {
        if (typeof data.thresholdDays === 'number') setThresholdDays(data.thresholdDays);
        setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
        setDepositTasks(Array.isArray(data.items) ? data.items : []);
      }
    } catch {
      setDepositTasks([]);
    } finally {
      setLoadingDeposits(false);
    }
  };

  useEffect(() => {
    loadReportGroups(false);
  }, []);

  useEffect(() => {
    loadDepositTasks();
  }, [categoryFilter]);

  const handleSortGroups = (field: GroupSortField) => {
    if (groupSortField === field) {
      setGroupSortDir(groupSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setGroupSortField(field);
      setGroupSortDir('asc');
    }
  };

  const filteredGroups = useMemo(() => {
    const filtered = groups.filter((g) => {
      if (groupFilters.correlative && !normalizeText(g.correlative).includes(normalizeText(groupFilters.correlative))) return false;
      if (groupFilters.groupType && !normalizeText(g.groupType).includes(normalizeText(groupFilters.groupType))) return false;
      if (groupFilters.monthName && !normalizeText(g.monthName).includes(normalizeText(groupFilters.monthName))) return false;
      if (groupFilters.periodYear && !String(g.periodYear).includes(groupFilters.periodYear.trim())) return false;
      if (groupFilters.status && !normalizeText(g.status).includes(normalizeText(groupFilters.status))) return false;
      if (groupFilters.createdBy && !normalizeText(g.createdBy).includes(normalizeText(groupFilters.createdBy))) return false;
      if (groupFilters.createdAt && !normalizeText(g.createdAtFormatted).includes(normalizeText(groupFilters.createdAt))) return false;
      if (groupFilters.processStatus && !normalizeText(g.processStatus).includes(normalizeText(groupFilters.processStatus))) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (groupSortField === 'periodYear') {
        cmp = a.periodYear - b.periodYear;
      } else if (groupSortField === 'correlative') {
        cmp = parseFloat(a.correlative || '0') - parseFloat(b.correlative || '0');
      } else if (groupSortField === 'createdAt') {
        cmp = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      } else {
        cmp = String(a[groupSortField] || '').localeCompare(String(b[groupSortField] || ''));
      }
      return groupSortDir === 'asc' ? cmp : -cmp;
    });
  }, [groups, groupFilters, groupSortField, groupSortDir]);

  const filteredDepositTasks = useMemo(() => {
    return depositTasks.filter((item) => {
      if (histColFilters.id && !String(item.id).includes(histColFilters.id.trim())) return false;
      if (histColFilters.prioridad && !normalizeText(item.priorityLabel).includes(normalizeText(histColFilters.prioridad))) return false;
      if (histColFilters.fecha && !normalizeText(item.depositDateFormatted).includes(normalizeText(histColFilters.fecha))) return false;
      if (histColFilters.antiguedad && !String(item.ageBusinessDays).includes(histColFilters.antiguedad.trim())) return false;
      if (histColFilters.conc && !normalizeText(item.concentrationDateFormatted).includes(normalizeText(histColFilters.conc))) return false;
      if (histColFilters.deposito && !String(item.depositAmount).includes(histColFilters.deposito.trim())) return false;
      if (histColFilters.sede && !normalizeText(`${item.country} ${item.location}`).includes(normalizeText(histColFilters.sede))) return false;
      if (histColFilters.accion && !normalizeText(`${item.alerts.join(' ')} ${item.requiredAction}`).includes(normalizeText(histColFilters.accion))) return false;
      return true;
    });
  }, [depositTasks, histColFilters]);

  /* ---------------- ACCIONES DE DOCUMENTOS Y FLUJO ---------------- */

  const handleToggleExpand = (groupId: number) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handlePreviewPdf = async (docId: number, label: string, signed: boolean) => {
    try {
      const endpoint = signed
        ? `/report-groups/documents/${docId}/signed-pdf`
        : `/report-groups/documents/${docId}/pdf?inline=true`;
      const blobUrl = await fetchApiBlobUrl(endpoint);
      if (pdfPreview?.url) {
        window.URL.revokeObjectURL(pdfPreview.url);
      }
      setPdfPreview({
        title: signed ? `${label} — Documento Firmado Subido` : `${label} — Vista Previa PDF Generado`,
        url: blobUrl,
        isSigned: signed,
      });
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo abrir la vista previa del documento PDF');
    }
  };

  const handleClosePreview = () => {
    if (pdfPreview?.url) {
      window.URL.revokeObjectURL(pdfPreview.url);
    }
    setPdfPreview(null);
  };

  const handleDownloadGeneratedPdf = async (docId: number, reportType: string) => {
    try {
      await downloadApiFile(`/report-groups/documents/${docId}/pdf`, `${reportType.toLowerCase()}.pdf`);
      showToast(`Documento PDF (${reportType}) descargado.`);
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo descargar el PDF');
    }
  };

  const handleDownloadGeneratedExcel = async (docId: number, reportType: string) => {
    try {
      await downloadApiFile(`/report-groups/documents/${docId}/excel`, `${reportType.toLowerCase()}.xlsx`);
      showToast(`Documento Excel (${reportType}) descargado.`);
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo descargar el Excel');
    }
  };

  const handleTriggerUpload = (groupId: number, docId: number, reportType: string) => {
    setUploadTarget({ groupId, docId, reportType });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setWarningModalMsg('Por favor seleccione un archivo en formato PDF (.pdf) con el documento firmado.');
      return;
    }

    try {
      setUploadingDocId(uploadTarget.docId);
      const base64Pdf = await fileToBase64(file);
      const updatedGroup = await fetchApi(
        `/report-groups/${uploadTarget.groupId}/documents/${uploadTarget.docId}/upload-signed`,
        {
          method: 'POST',
          body: JSON.stringify({
            fileName: file.name,
            base64Pdf,
          }),
        }
      );

      setGroups((prev) => prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)));
      showToast(`Documento firmado subido para ${uploadTarget.reportType}. Ahora puede visualizarlo en el ícono de ojo verde.`);
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo subir el documento firmado');
    } finally {
      setUploadingDocId(null);
      setUploadTarget(null);
    }
  };

  const handleAdvanceProcess = async (e: React.MouseEvent, group: ReportGroupItem) => {
    e.stopPropagation();

    if (group.groupType === 'Reportes Consulares' && group.uploadedSignedCount < 4) {
      const faltantes = group.documents
        .filter((d) => !d.hasSignedPdf)
        .map((d) => d.reportType)
        .join(', ');
      setWarningModalMsg(
        `Trámite inconcluso: Para pasar al siguiente estado del proceso es obligatorio haber subido los 4 documentos firmados (${group.uploadedSignedCount} de 4 subidos).\n\nDocumentos pendientes de subir: ${faltantes}.`
      );
      return;
    }

    try {
      const updated = await fetchApi(`/report-groups/${group.id}/advance`, {
        method: 'PUT',
      });
      const movedToFinalized =
        updated?.isFinalized === true ||
        String(updated?.processStatus || '').toLowerCase() === 'finalizado';

      if (movedToFinalized) {
        setGroups((prev) => prev.filter((g) => g.id !== updated.id));
        if (expandedGroupId === updated.id) {
          setExpandedGroupId(null);
        }
        window.dispatchEvent(new Event('sic-tasks-updated'));
        showToast(
          `Trámite Correlativo ${updated.correlative} pasado a Finalizado y trasladado a Bandeja de Reportes (solo lectura).`
        );
      } else {
        setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        showToast(`El trámite Correlativo ${updated.correlative} avanzó a la fase: ${updated.processStatus}.`);
      }
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo avanzar al siguiente estado');
    }
  };

  const handleCreateNewGroup = async () => {
    try {
      setCreatingGroup(true);
      const created = await fetchApi('/report-groups', {
        method: 'POST',
        body: JSON.stringify({
          groupType: newGrpType,
          periodMonth: newGrpMonth,
          periodYear: newGrpYear,
          status: newGrpType === 'No Identificados / No Distribuidos' ? 'N/A' : newGrpStatus,
        }),
      });
      setShowNewGroupModal(false);
      await loadReportGroups(false);
      window.dispatchEvent(new Event('sic-tasks-updated'));
      showToast(`Trámite generado con Correlativo ${created.correlative}.`);
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo crear el paquete de reportes');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handlePendingMailNotice = (mode: string) => {
    setWarningModalMsg(
      `${mode}: Esta acción de envío por correo electrónico está estructurada en la interfaz y se conectará con las direcciones institucionales definitivas en la etapa final (80%-90%).`
    );
  };

  const handleExportDepositTasks = async () => {
    try {
      setExportingDeposits(true);
      const qs = categoryFilter !== 'ALL' ? `?category=${categoryFilter}` : '';
      await downloadApiFile(`/tasks/export${qs}`, 'historial_depositos_pendientes_sic.xlsx');
      showToast('Historial de depósitos pendientes exportado a Excel.');
    } catch (err: any) {
      setWarningModalMsg(err.message || 'No se pudo exportar el Excel');
    } finally {
      setExportingDeposits(false);
    }
  };

  const colFilterStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    backgroundColor: '#0e172a',
    border: '1px solid #2e436e',
    borderRadius: '5px',
    padding: '4px 7px',
    color: '#e2e8f0',
    fontSize: '11px',
    outline: 'none',
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

  const sortIcon = (field: GroupSortField) => {
    if (groupSortField !== field) return <span style={{ color: '#64748b', marginLeft: '4px', fontSize: '10px' }}>↑↓</span>;
    return <span style={{ color: '#60a5fa', marginLeft: '4px', fontSize: '10px' }}>{groupSortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Input oculto para subir PDF firmado */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <style>{`
        .grp-main-row {
          cursor: pointer;
          transition: background-color .14s ease;
        }
        .grp-main-row:hover td {
          background-color: rgba(59, 130, 246, 0.08);
        }
        .doc-act-btn {
          width: 30px;
          height: 28px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .15s ease;
          background: rgba(15, 23, 42, 0.7);
        }
        .doc-act-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.18);
        }
        .btn-siguiente {
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid #3b82f6;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s ease;
          white-space: nowrap;
        }
        .btn-siguiente:hover {
          filter: brightness(1.1);
        }
        .tsk-kpi-card {
          background-color: #233559;
          border: 1px solid #2e436e;
          border-top: 3px solid #C59B27;
          border-radius: 11px;
          padding: 13px 15px;
          cursor: pointer;
          transition: all .16s ease;
          text-align: left;
        }
        .tsk-kpi-card:hover {
          transform: translateY(-2px);
          border-color: #47659e;
          border-top-color: #C59B27;
        }
        .tsk-kpi-card.active {
          box-shadow: 0 0 0 1px #C59B27, 0 8px 18px rgba(197,155,39,.18);
          background-color: #283d66;
        }
        .tsk-go-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 27px;
          padding: 0 10px;
          border-radius: 6px;
          border: 1px solid #d4a72c;
          background: linear-gradient(135deg, #C59B27 0%, #a67f19 100%);
          color: #0f172a;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
      `}</style>

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
          <button type="button" onClick={() => setToastMsg('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <IcX />
          </button>
        </div>
      )}

      {/* ==========================================================================
          TARJETA 1 (PRINCIPAL): TAREAS PENDIENTES — PAQUETES Y DOCUMENTOS OFICIALES
         ========================================================================== */}
      <div
        style={{
          backgroundColor: '#1b2a47',
          border: '1px solid #2e436e',
          borderTop: '3px solid #C59B27',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Barra Superior de Tareas Pendientes */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #2e436e',
            backgroundColor: '#233559',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#60a5fa', display: 'flex' }}>
              <IcFileDoc />
            </span>
            <h1 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#ffffff' }}>
              Tareas Pendientes
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setShowNewGroupModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '7px',
                border: '1px solid rgba(197,155,39,.55)',
                backgroundColor: 'rgba(197,155,39,.15)',
                color: '#fcd34d',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Generar nuevo paquete de prueba o cierre mensual"
            >
              <IcPlus /> Nuevo Paquete
            </button>

            <button
              type="button"
              onClick={() => loadReportGroups(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
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
        </div>

        {/* Tabla Acordeón de Paquetes de Reportes */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1060px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '104px' }} />
              <col style={{ width: '198px' }} />
              <col style={{ width: '102px' }} />
              <col style={{ width: '76px' }} />
              <col style={{ width: '158px' }} />
              <col style={{ width: '172px' }} />
              <col style={{ width: '132px' }} />
              <col style={{ width: '210px' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '1px solid #3b527d' }}>
                <th style={{ padding: '10px 6px', borderRight: '1px solid #3b527d' }} />
                <th onClick={() => handleSortGroups('correlative')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  CORRELATIVO {sortIcon('correlative')}
                </th>
                <th onClick={() => handleSortGroups('groupType')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  TIPO DE REPORTE {sortIcon('groupType')}
                </th>
                <th onClick={() => handleSortGroups('monthName')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  MES {sortIcon('monthName')}
                </th>
                <th onClick={() => handleSortGroups('periodYear')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  AÑO {sortIcon('periodYear')}
                </th>
                <th onClick={() => handleSortGroups('status')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  ESTADO {sortIcon('status')}
                </th>
                <th onClick={() => handleSortGroups('createdBy')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  GENERADO POR {sortIcon('createdBy')}
                </th>
                <th onClick={() => handleSortGroups('createdAt')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d', cursor: 'pointer', userSelect: 'none' }}>
                  FECHA GENERADO {sortIcon('createdAt')}
                </th>
                <th onClick={() => handleSortGroups('processStatus')} style={{ padding: '10px 8px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                  ESTADO DEL PROCESO {sortIcon('processStatus')}
                </th>
              </tr>

              {/* Fila de filtros integrados en cabecera */}
              <tr style={{ backgroundColor: '#16243f', borderBottom: '2px solid #C59B27' }}>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #3b527d' }} />
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.correlative || ''} onChange={(e) => setGroupFilters({ ...groupFilters, correlative: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.groupType || ''} onChange={(e) => setGroupFilters({ ...groupFilters, groupType: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.monthName || ''} onChange={(e) => setGroupFilters({ ...groupFilters, monthName: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.periodYear || ''} onChange={(e) => setGroupFilters({ ...groupFilters, periodYear: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.status || ''} onChange={(e) => setGroupFilters({ ...groupFilters, status: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.createdBy || ''} onChange={(e) => setGroupFilters({ ...groupFilters, createdBy: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px', borderRight: '1px solid #3b527d' }}>
                  <input type="text" size={1} value={groupFilters.createdAt || ''} onChange={(e) => setGroupFilters({ ...groupFilters, createdAt: e.target.value })} style={colFilterStyle} />
                </th>
                <th style={{ padding: '6px' }}>
                  <input type="text" size={1} value={groupFilters.processStatus || ''} onChange={(e) => setGroupFilters({ ...groupFilters, processStatus: e.target.value })} style={colFilterStyle} />
                </th>
              </tr>
            </thead>

            <tbody>
              {loadingGroups ? (
                <tr>
                  <td colSpan={9} style={{ padding: '34px', textAlign: 'center', color: '#94a3b8' }}>
                    Cargando trámites pendientes...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '34px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron trámites para los filtros ingresados.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((grp) => {
                  const isExpanded = expandedGroupId === grp.id;
                  const isNoIdentType = grp.groupType === 'No Identificados / No Distribuidos';

                  return (
                    <FragmentRow
                      key={grp.id}
                      grp={grp}
                      isExpanded={isExpanded}
                      isNoIdentType={isNoIdentType}
                      uploadingDocId={uploadingDocId}
                      onToggle={() => handleToggleExpand(grp.id)}
                      onAdvance={(e) => handleAdvanceProcess(e, grp)}
                      onPreviewPdf={handlePreviewPdf}
                      onDownloadPdf={handleDownloadGeneratedPdf}
                      onDownloadExcel={handleDownloadGeneratedExcel}
                      onTriggerUpload={handleTriggerUpload}
                      onMailNotice={handlePendingMailNotice}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================================================
          TARJETA 2: HISTORIAL / ALERTAS DE DEPÓSITOS PENDIENTES (PARA MOSTRAR AL CLIENTE)
          - Umbral de atraso: 5 días hábiles
          - Sin tarjeta de filtros aparte (filtros integrados en las columnas de la tabla)
         ========================================================================== */}
      <div
        style={{
          backgroundColor: '#233559',
          border: '1px solid #2e436e',
          borderTop: '3px solid #C59B27',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Cabecera de la tarjeta de historial/alertas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #2e436e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,.16)', border: '1px solid rgba(245,158,11,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <IcClipboard />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                Historial y Alertas Operativas de Depósitos Pendientes
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Control de depósitos sin identificar, pendientes de distribución y atraso bancario (umbral configurado: <strong style={{ color: '#fcd34d' }}>{thresholdDays} días hábiles</strong>)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.values(histColFilters).some(Boolean) && (
              <button
                type="button"
                onClick={() => setHistColFilters({})}
                style={{
                  padding: '7px 12px',
                  borderRadius: '7px',
                  border: '1px solid #3b527d',
                  backgroundColor: '#132038',
                  color: '#cbd5e1',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros tabla
              </button>
            )}
            <button
              type="button"
              onClick={handleExportDepositTasks}
              disabled={exportingDeposits}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                border: '1px solid rgba(16,185,129,.5)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: exportingDeposits ? 'not-allowed' : 'pointer',
              }}
            >
              <IcDownload /> {exportingDeposits ? 'Exportando...' : 'Exportar Historial (Excel)'}
            </button>
          </div>
        </div>

        {/* 4 Tarjetas KPI (con umbral de 5 días hábiles) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`tsk-kpi-card ${categoryFilter === 'ALL' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Total Pendientes (Atraso &gt; {thresholdDays} días)
              </span>
              <span style={{ color: '#60a5fa' }}><IcClipboard /></span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              {summary.totalPending}
            </div>
            <div style={{ fontSize: '11.5px', color: '#fcd34d', fontWeight: 600, marginTop: '2px' }}>
              Saldo por aplicar: {formatMoney(summary.totalPendingAmount)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'SIN_IDENTIFICAR' ? 'ALL' : 'SIN_IDENTIFICAR')}
            className={`tsk-kpi-card ${categoryFilter === 'SIN_IDENTIFICAR' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Sin Identificar Sede
              </span>
              <span style={{ color: '#fb7185' }}><IcAlertTriangle /></span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: summary.unidentifiedCount > 0 ? '#fda4af' : '#ffffff', marginTop: '4px' }}>
              {summary.unidentifiedCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              Requieren asignar consulado
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'SIN_DISTRIBUIR' ? 'ALL' : 'SIN_DISTRIBUIR')}
            className={`tsk-kpi-card ${categoryFilter === 'SIN_DISTRIBUIR' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Identificados / Sin Distribuir
              </span>
              <span style={{ color: '#fbbf24' }}><IcCoins /></span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: summary.undistributedCount > 0 ? '#fcd34d' : '#ffffff', marginTop: '4px' }}>
              {summary.undistributedCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              Pendientes de desglose en rubros
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter(categoryFilter === 'MORA_CONCENTRACION' ? 'ALL' : 'MORA_CONCENTRACION')}
            className={`tsk-kpi-card ${categoryFilter === 'MORA_CONCENTRACION' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Exceso Plazo Concentración
              </span>
              <span style={{ color: '#38bdf8' }}><IcClock /></span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: summary.delayedConcentrationCount > 0 ? '#7dd3fc' : '#ffffff', marginTop: '4px' }}>
              {summary.delayedConcentrationCount}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              Superan {thresholdDays} días hábiles
            </div>
          </button>
        </div>

        {/* Tabla de Historial con TODOS sus filtros integrados en las columnas */}
        <div style={{ border: '1px solid #2e436e', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
              <colgroup>
                <col style={{ width: '52px' }} />
                <col style={{ width: '92px' }} />
                <col style={{ width: '96px' }} />
                <col style={{ width: '86px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '104px' }} />
                <col style={{ width: '195px' }} />
                <col />
                <col style={{ width: '98px' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#1c2d4f', borderBottom: '1px solid #3b527d' }}>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>ID</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Prioridad</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Fecha Dep.</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Antigüedad</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Conc. BCR</th>
                  <th style={{ padding: '9px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Depósito</th>
                  <th style={{ padding: '9px 8px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Embajada / Consulado</th>
                  <th style={{ padding: '9px 9px', textAlign: 'left', color: '#cbd5e1', fontWeight: 700, borderRight: '1px solid #3b527d' }}>Alertas y Acción Requerida</th>
                  <th style={{ padding: '9px 6px', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>Acción</th>
                </tr>
                <tr style={{ backgroundColor: '#16243f', borderBottom: '2px solid #C59B27' }}>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="ID" value={histColFilters.id || ''} onChange={(e) => setHistColFilters({ ...histColFilters, id: e.target.value })} style={{ ...colFilterStyle, textAlign: 'center' }} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Prioridad" value={histColFilters.prioridad || ''} onChange={(e) => setHistColFilters({ ...histColFilters, prioridad: e.target.value })} style={{ ...colFilterStyle, textAlign: 'center' }} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="dd/mm/aa" value={histColFilters.fecha || ''} onChange={(e) => setHistColFilters({ ...histColFilters, fecha: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Días" value={histColFilters.antiguedad || ''} onChange={(e) => setHistColFilters({ ...histColFilters, antiguedad: e.target.value })} style={{ ...colFilterStyle, textAlign: 'center' }} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Fecha..." value={histColFilters.conc || ''} onChange={(e) => setHistColFilters({ ...histColFilters, conc: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Monto" value={histColFilters.deposito || ''} onChange={(e) => setHistColFilters({ ...histColFilters, deposito: e.target.value })} style={{ ...colFilterStyle, textAlign: 'right' }} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Filtrar sede..." value={histColFilters.sede || ''} onChange={(e) => setHistColFilters({ ...histColFilters, sede: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px', borderRight: '1px solid #3b527d' }}>
                    <input type="text" size={1} placeholder="Filtrar alerta o acción..." value={histColFilters.accion || ''} onChange={(e) => setHistColFilters({ ...histColFilters, accion: e.target.value })} style={colFilterStyle} />
                  </th>
                  <th style={{ padding: '5px', textAlign: 'center', color: '#64748b', fontSize: '10px' }}>—</th>
                </tr>
              </thead>
              <tbody>
                {loadingDeposits ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>
                      Analizando depósitos pendientes...
                    </td>
                  </tr>
                ) : filteredDepositTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#172542' }}>
                      No hay registros pendientes que coincidan con los filtros de la tabla.
                    </td>
                  </tr>
                ) : (
                  filteredDepositTasks.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #3b527d', backgroundColor: '#172542' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, borderRight: '1px solid #3b527d' }}>
                        #{t.id}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #3b527d' }}>
                        <PriorityBadge priority={t.priority} label={t.priorityLabel} />
                      </td>
                      <td style={{ padding: '8px', color: '#e2e8f0', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {t.depositDateFormatted}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: '1px solid #3b527d' }}>
                        <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 800, backgroundColor: '#132038', border: '1px solid #2e436e', color: t.ageBusinessDays > thresholdDays ? '#fbbf24' : '#cbd5e1' }}>
                          {t.ageBusinessDays}d
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: t.missingConcentration ? '#fda4af' : '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {t.concentrationDateFormatted}
                        {!t.missingConcentration && (
                          <span style={{ fontSize: '10.5px', color: t.concentrationDays > thresholdDays ? '#fbbf24' : '#64748b', marginLeft: '4px', fontWeight: 700 }}>
                            ({t.concentrationDays}d)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#ffffff', fontWeight: 800, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
                        {formatMoney(t.depositAmount)}
                      </td>
                      <td style={{ padding: '8px', color: t.location === 'NO IDENTIFICADA' ? '#fda4af' : '#e2e8f0', fontStyle: t.location === 'NO IDENTIFICADA' ? 'italic' : 'normal', fontWeight: 600, borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.location === 'NO IDENTIFICADA' ? 'NO IDENTIFICADA' : `${t.country} · ${t.location}`}
                      </td>
                      <td style={{ padding: '7px 9px', borderRight: '1px solid #3b527d' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '2px' }}>
                          {t.alerts.map((al) => (
                            <AlertChip key={al} text={al} />
                          ))}
                        </div>
                        <div style={{ fontSize: '11px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.requiredAction}
                        </div>
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/ingresos/nuevo?editar=${t.id}`)}
                          className="tsk-go-btn"
                        >
                          Atender <IcArrowRight />
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

      {/* ==========================================================================
          MODAL VISOR DE PDF (OJO GRIS GENERADO / SEGUNDO OJO VERDE FIRMADO)
         ========================================================================== */}
      {pdfPreview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6, 12, 24, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '18px' }}>
          <div style={{ width: '100%', maxWidth: '900px', height: '86vh', backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 55px rgba(0,0,0,.6)' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #2e436e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: pdfPreview.isSigned ? '#22c55e' : '#94a3b8', display: 'flex' }}>
                  <IcEye />
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>{pdfPreview.title}</span>
              </div>
              <button type="button" onClick={handleClosePreview} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                <IcX />
              </button>
            </div>
            <iframe
              src={pdfPreview.url}
              title={pdfPreview.title}
              style={{ flex: 1, width: '100%', border: 'none', backgroundColor: '#0f172a' }}
            />
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL DE AVISO / VALIDACIÓN (EJ. TRÁMITE INCONCLUSO FALTA SUBIR LOS 4 DOCS)
         ========================================================================== */}
      {warningModalMsg && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(8,15,29,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '12px', padding: '22px', boxShadow: '0 22px 50px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#fbbf24' }}>
                <IcAlertTriangle />
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#ffffff' }}>Aviso del Proceso</h3>
              </div>
              <button type="button" onClick={() => setWarningModalMsg(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <IcX />
              </button>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
              {warningModalMsg}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setWarningModalMsg(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #C59B27', backgroundColor: '#1c2d4f', color: '#fcd34d', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL CREAR NUEVO PAQUETE DE TRÁMITE
         ========================================================================== */}
      {showNewGroupModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(8,15,29,.78)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: '#233559', border: '1px solid #2e436e', borderTop: '3px solid #C59B27', borderRadius: '12px', padding: '22px', boxShadow: '0 22px 50px rgba(0,0,0,.55)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #2e436e' }}>
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#ffffff' }}>
                Generar Paquete en Tareas Pendientes
              </h3>
              <button type="button" onClick={() => setShowNewGroupModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <IcX />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Tipo de Reporte *
                </label>
                <select
                  value={newGrpType}
                  onChange={(e) => setNewGrpType(e.target.value as any)}
                  style={inputStyle}
                >
                  <option value="Reportes Consulares">Reportes Consulares (4 documentos)</option>
                  <option value="No Identificados / No Distribuidos">No Identificados / No Distribuidos</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Mes (define el correlativo) *
                  </label>
                  <select value={newGrpMonth} onChange={(e) => setNewGrpMonth(Number(e.target.value))} style={inputStyle}>
                    {MONTHS_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.value} - {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Año *
                  </label>
                  <select value={newGrpYear} onChange={(e) => setNewGrpYear(Number(e.target.value))} style={inputStyle}>
                    {[2026, 2025, 2024].map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {newGrpType === 'Reportes Consulares' && (
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', marginBottom: '5px' }}>
                    Estado del Reporte *
                  </label>
                  <select value={newGrpStatus} onChange={(e) => setNewGrpStatus(e.target.value)} style={inputStyle}>
                    <option value="PRELIMINAR">PRELIMINAR (Correlativo {newGrpMonth})</option>
                    <option value="DEFINITIVO">DEFINITIVO (Correlativo {newGrpMonth})</option>
                    <option value="DEFINITIVO MODIFICADO">DEFINITIVO MODIFICADO (Agrega .{`x`} → ej. {newGrpMonth}.1)</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowNewGroupModal(false)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #3b527d', backgroundColor: '#132038', color: '#cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewGroup}
                  disabled={creatingGroup}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #d4a72c', background: 'linear-gradient(135deg, #C59B27 0%, #a67f19 100%)', color: '#0f172a', fontSize: '12px', fontWeight: 800, cursor: creatingGroup ? 'not-allowed' : 'pointer' }}
                >
                  {creatingGroup ? 'Generando...' : 'Crear Paquete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   FILA DE PAQUETE + PANEL EXPANDIBLE DE SUB-DOCUMENTOS
   ========================================================================= */
function FragmentRow({
  grp,
  isExpanded,
  isNoIdentType,
  uploadingDocId,
  onToggle,
  onAdvance,
  onPreviewPdf,
  onDownloadPdf,
  onDownloadExcel,
  onTriggerUpload,
  onMailNotice,
}: {
  grp: ReportGroupItem;
  isExpanded: boolean;
  isNoIdentType: boolean;
  uploadingDocId: number | null;
  onToggle: () => void;
  onAdvance: (e: React.MouseEvent) => void;
  onPreviewPdf: (docId: number, label: string, signed: boolean) => void;
  onDownloadPdf: (docId: number, reportType: string) => void;
  onDownloadExcel: (docId: number, reportType: string) => void;
  onTriggerUpload: (groupId: number, docId: number, reportType: string) => void;
  onMailNotice: (mode: string) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="grp-main-row"
        style={{
          backgroundColor: isExpanded ? '#1f3154' : '#15223b',
          borderBottom: '1px solid #3b527d',
        }}
      >
        <td style={{ padding: '10px 6px', textAlign: 'center', color: isExpanded ? '#fcd34d' : '#94a3b8', borderRight: '1px solid #3b527d' }}>
          {isExpanded ? <IcChevronDown /> : <IcChevronRight />}
        </td>
        <td style={{ padding: '10px 10px', color: '#ffffff', fontWeight: 800, borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
          {grp.correlative}
        </td>
        <td style={{ padding: '10px 10px', color: '#e2e8f0', fontWeight: 500, borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {grp.groupType}
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
          {grp.monthName}
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap' }}>
          {grp.periodYear}
        </td>
        <td style={{ padding: '10px 10px', borderRight: '1px solid #3b527d' }}>
          <GroupStatusBadge status={grp.status} />
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={grp.createdBy}>
          {grp.createdBy}
        </td>
        <td style={{ padding: '10px 10px', color: '#cbd5e1', borderRight: '1px solid #3b527d', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
          {grp.createdAtFormatted}
        </td>
        <td style={{ padding: '8px 10px' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <ProcessStageBadge stage={grp.processStatus} />
            {grp.processStatus !== 'Finalizado' && grp.processStatus !== 'Completado' && (
              <button
                type="button"
                onClick={onAdvance}
                className="btn-siguiente"
                style={{
                  opacity: !isNoIdentType && grp.uploadedSignedCount < 4 ? 0.72 : 1,
                }}
                title={
                  !isNoIdentType && grp.uploadedSignedCount < 4
                    ? `Faltan subir ${4 - grp.uploadedSignedCount} de 4 documentos firmados`
                    : grp.nextProcessStatus === 'Finalizado'
                      ? 'Finalizar trámite y trasladar a Bandeja de Reportes'
                      : `Pasar a fase: ${grp.nextProcessStatus || 'Siguiente'}`
                }
              >
                Siguiente
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Sub-tabla desplegable cuando el registro está expandido */}
      {isExpanded && (
        <tr style={{ backgroundColor: '#0c1526', borderBottom: '2px solid #3b527d' }}>
          <td colSpan={9} style={{ padding: '14px 22px' }}>
            <div style={{ border: '1px solid #2e436e', borderTop: '2px solid #C59B27', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#0f192d' }}>
              <div
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#13213c',
                  borderBottom: '1px solid #2e436e',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  fontSize: '11.5px',
                  color: '#cbd5e1',
                }}
              >
                <span>
                  {grp.processStatus === 'Firma Jefatura' &&
                    'Fase 1 — Firma Jefatura: descargue los documentos para firma física de Jefatura y suba nuevamente los PDF firmados.'}
                  {grp.processStatus === 'Modificación' &&
                    'Fase 2 — Modificación: habilitada por tratarse de un reporte Definitivo Modificado antes de remitir a Recaudaciones.'}
                  {grp.processStatus === 'Firma Recaudaciones' &&
                    'Fase 3 — Firma Recaudaciones: trámite físico enviado a otras unidades para recepción de información y acuse de recibido.'}
                </span>
                {grp.nextProcessStatus && (
                  <span style={{ color: '#93c5fd', fontWeight: 700 }}>
                    Siguiente paso:{' '}
                    <strong style={{ color: grp.nextProcessStatus === 'Finalizado' ? '#6ee7b7' : '#fcd34d' }}>
                      {grp.nextProcessStatus === 'Finalizado'
                        ? 'Finalizado (pasa a Bandeja de Reportes)'
                        : grp.nextProcessStatus}
                    </strong>
                  </span>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '12px' }}>
                <colgroup>
                  <col style={{ width: '36%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '36%' }} />
                </colgroup>
                <thead>
                  <tr style={{ backgroundColor: '#192845', borderBottom: '1px solid #3b527d' }}>
                    <th style={{ padding: '9px 14px', textAlign: 'left', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>
                      DOCUMENTO
                    </th>
                    <th style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', borderRight: '1px solid #3b527d' }}>
                      ESTADO ACTUAL
                    </th>
                    <th style={{ padding: '9px 14px', textAlign: 'center', color: '#94a3b8', fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase' }}>
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grp.documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #25385c' }}>
                      <td style={{ padding: '10px 14px', color: '#ffffff', fontWeight: 800, letterSpacing: '0.3px', borderRight: '1px solid #25385c' }}>
                        {doc.reportType}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', borderRight: '1px solid #25385c' }}>
                        {doc.hasSignedPdf ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontWeight: 700, fontSize: '11.5px' }} title={doc.signedFileName || ''}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                            Documento Subido
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700, fontSize: '11.5px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          {/* 1. Ojo gris: Ver PDF generado */}
                          <button
                            type="button"
                            onClick={() => onPreviewPdf(doc.id, doc.reportType, false)}
                            className="doc-act-btn"
                            style={{ border: '1px solid #475569', color: '#cbd5e1' }}
                            title="Ver documento PDF generado"
                          >
                            <IcEye />
                          </button>

                          {/* 2. Rojo: Descargar PDF */}
                          <button
                            type="button"
                            onClick={() => onDownloadPdf(doc.id, doc.reportType)}
                            className="doc-act-btn"
                            style={{ border: '1px solid rgba(239,68,68,.55)', backgroundColor: 'rgba(239,68,68,.12)', color: '#f87171' }}
                            title="Descargar documento en PDF"
                          >
                            <IcPdfDoc />
                          </button>

                          {/* 3. Verde: Descargar Excel */}
                          <button
                            type="button"
                            onClick={() => onDownloadExcel(doc.id, doc.reportType)}
                            className="doc-act-btn"
                            style={{ border: '1px solid rgba(16,185,129,.55)', backgroundColor: 'rgba(16,185,129,.12)', color: '#34d399' }}
                            title="Descargar documento en Excel"
                          >
                            <IcDownload />
                          </button>

                          {/* Acciones según tipo de paquete (SIN ícono de pluma de firma digital) */}
                          {!isNoIdentType ? (
                            <>
                              {/* 4. Azul subida: Subir documento ya firmado */}
                              <button
                                type="button"
                                onClick={() => onTriggerUpload(grp.id, doc.id, doc.reportType)}
                                disabled={uploadingDocId === doc.id}
                                className="doc-act-btn"
                                style={{ border: '1px solid rgba(59,130,246,.6)', backgroundColor: 'rgba(37,99,235,.15)', color: '#60a5fa' }}
                                title="Subir documento PDF firmado"
                              >
                                <IcUpload />
                              </button>

                              {/* 5. Segundo Ojo en COLOR VERDE: Aparece únicamente cuando ya se subió el documento firmado */}
                              {doc.hasSignedPdf && (
                                <button
                                  type="button"
                                  onClick={() => onPreviewPdf(doc.id, doc.reportType, true)}
                                  className="doc-act-btn"
                                  style={{
                                    border: '1px solid #22c55e',
                                    backgroundColor: 'rgba(34, 197, 94, 0.22)',
                                    color: '#4ade80',
                                    boxShadow: '0 0 10px rgba(34, 197, 94, 0.28)',
                                  }}
                                  title={`Ver documento firmado subido (${doc.signedFileName || 'PDF firmado'})`}
                                >
                                  <IcEye />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {/* 4. Avioncito celeste: Enviar a ambos destinos */}
                              <button
                                type="button"
                                onClick={() => onMailNotice('Envío conjunto por correo (ambos destinos)')}
                                className="doc-act-btn"
                                style={{ border: '1px solid #38bdf8', backgroundColor: '#38bdf8', color: '#0f172a' }}
                                title="Enviar simultáneamente a ambos destinatarios por correo"
                              >
                                <IcPaperPlane />
                              </button>

                              {/* 5. Carta morada: Envío individual destino 1 */}
                              <button
                                type="button"
                                onClick={() => onMailNotice('Envío individual — Carta Morada (Destinatario 1)')}
                                className="doc-act-btn"
                                style={{ border: '1px solid rgba(168,85,247,.65)', backgroundColor: 'rgba(168,85,247,.16)', color: '#c084fc' }}
                                title="Enviar por correo — Destinatario 1"
                              >
                                <IcMail />
                              </button>

                              {/* 6. Carta rosada: Envío individual destino 2 */}
                              <button
                                type="button"
                                onClick={() => onMailNotice('Envío individual — Carta Rosada (Destinatario 2)')}
                                className="doc-act-btn"
                                style={{ border: '1px solid rgba(236,72,153,.65)', backgroundColor: 'rgba(236,72,153,.16)', color: '#f472b6' }}
                                title="Enviar por correo — Destinatario 2"
                              >
                                <IcMail />
                              </button>
                            </>
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
