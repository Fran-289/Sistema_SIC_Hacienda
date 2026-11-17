'use client';

import { useState, useEffect, useMemo, Suspense, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchApi, getUser } from "@/lib/api";
import { countBusinessDays, parseCustomHolidays } from "@/lib/businessDays";

interface ConsulateItem {
  id: number;
  type: string;
  region: string;
  country: string;
  location: string;
  status: string;
}

/* ---------- Iconos (trazos tipo Feather) ---------- */
const svg = (children: ReactNode, size = 18, sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const IcId = () => svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4" /><path d="M14 10h4M14 14h4" /></>);
const IcUser = () => svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>);
const IcAlert = () => svg(<><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.6" /></>);
const IcSearch = () => svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></>);
const IcCheckCircle = () => svg(<><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5" /></>);
const IcBank = () => svg(<><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 21h18" /></>);
const IcCalendar = () => svg(<><rect x="3" y="4.5" width="18" height="17" rx="2" /><line x1="16" y1="2.5" x2="16" y2="6.5" /><line x1="8" y1="2.5" x2="8" y2="6.5" /><line x1="3" y1="10" x2="21" y2="10" /></>);
const IcDollar = () => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /><path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.4 0-2.5.9-2.5 2s1.1 2 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1.1 0-2-.5-2.5-1.5" /></>);
const IcClock = () => svg(<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>);
const IcGlobe = () => svg(<><circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></>);
const IcFlag = () => svg(<><path d="M4 21V4" /><path d="M4 5h13l-2.2 3.5L17 12H4" /></>);
const IcBuilding = () => svg(<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2" /><path d="M10 21v-3h4v3" /></>);
const IcBook = () => svg(<><path d="M5 3.5A1.5 1.5 0 0 1 6.5 2H19v18H6.5A1.5 1.5 0 0 0 5 21.5z" /><path d="M8.5 7h7M8.5 11h7M8.5 15h4.5" /></>);
const IcCard = () => svg(<><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></>);
const IcSave = () => svg(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>, 17, 2);
const IcX = () => svg(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, 16, 2);
const IcArrowLeft = () => svg(<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="11 18 5 12 11 6" /></>, 17, 2);
const IcCoins = () => svg(<><circle cx="9" cy="9" r="6" /><path d="M15.5 5.2a6 6 0 0 1 0 13.6" /><path d="M9 6.5v5M7.2 8.2h3.6" /></>, 20, 1.9);
const IcAlertTriangle = () => svg(<><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13.5" /><line x1="12" y1="17" x2="12" y2="17.1" /></>, 16, 2);
const IcChevron = () => svg(<polyline points="6 9 12 15 18 9" />, 14, 2.2);

/* ---------- Bloques de interfaz ---------- */
function Field({ label, required, icon, children, disabled, chevron, hint }: {
  label: string; required?: boolean; icon: ReactNode; children: ReactNode;
  disabled?: boolean; date?: boolean; chevron?: boolean; hint?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
        {label}
        {required && <span style={{ color: '#f43f5e', fontSize: '13px' }}>*</span>}
        {hint && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#64748b' }}>({hint})</span>}
      </div>
      <div className={`field-box${disabled ? ' disabled' : ''}`}>
        <span className="field-icon">{icon}</span>
        {children}
        {chevron && <span className="field-chevron"><IcChevron /></span>}
      </div>
    </div>
  );
}

function SectionTitle({ icon, color, title, subtitle }: { icon: ReactNode; color: string; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginBottom: '20px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: `${color}1f`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, boxShadow: `0 4px 14px ${color}22` }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #2e436e 0%, transparent 100%)' }} />
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', backgroundColor: '#132038', border: '1px solid #2e436e', borderRadius: '999px', padding: '7px 15px 7px 9px' }}>
      <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#1c2d4f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}:</span>
      <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function TotalCard({ icon, color, label, value, subtitle, badge }: { icon: ReactNode; color: string; label: string; value: string; subtitle?: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: `linear-gradient(135deg, ${color}1a 0%, ${color}0a 100%)`, border: `1px solid ${color}44`, borderRadius: '12px', padding: '14px 18px', boxShadow: `inset 0 1px 0 ${color}22` }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '11px', backgroundColor: `${color}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, marginTop: '2px' }}>{value}</div>
        {subtitle && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{subtitle}</div>}
      </div>
      {badge && (
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', backgroundColor: color, borderRadius: '999px', padding: '4px 10px', letterSpacing: '0.4px', flexShrink: 0 }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapStatusFromApi(apiStatus: string | null): string {
  if (!apiStatus) return 'No identificado';
  const upper = apiStatus.toUpperCase();
  if (upper === 'IDENTIFICADO DISTRIBUIDO') return 'Identificado Distribuido';
  if (upper === 'IDENTIFICADO / NO DISTRIBUIDO' || upper === 'IDENTIFICADO NO DISTRIBUIDO') {
    return 'Identificado / No distribuido';
  }
  return 'No identificado';
}

/* ---------- Formulario interno ---------- */
function RegistrarIngresoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editarParam = searchParams?.get('editar');
  const editId = editarParam && /^\d+$/.test(editarParam) ? Number(editarParam) : null;
  const isEditMode = editId !== null && editId > 0;

  const [estado, setEstado] = useState('No identificado');
  const [cuentaBancaria, setCuentaBancaria] = useState('00110000112233 - INGRESOS CONSULARES');
  const [fechaDeposito, setFechaDeposito] = useState(getTodayIso());
  const [valorDeposito, setValorDeposito] = useState('');
  const [fechaConcentracion, setFechaConcentracion] = useState('');
  const [diasConcentracion, setDiasConcentracion] = useState(0);
  const [customHolidays, setCustomHolidays] = useState<Set<string>>(new Set());

  const [consulates, setConsulates] = useState<ConsulateItem[]>([]);
  const [region, setRegion] = useState('');
  const [pais, setPais] = useState('');
  const [embajadaSede, setEmbajadaSede] = useState('');

  const [totalIngresos, setTotalIngresos] = useState('');
  const [totalIngresosManual, setTotalIngresosManual] = useState(false);

  const [valorPasaporte, setValorPasaporte] = useState('');
  const [valorDui, setValorDui] = useState('');
  const [valorConsular, setValorConsular] = useState('');

  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());

    fetchApi('/consulates')
      .then((list) => {
        if (Array.isArray(list)) setConsulates(list);
      })
      .catch(() => {});

    fetchApi('/settings')
      .then((settings) => {
        if (settings?.BANK_ACCOUNT_DEFAULT) {
          const accName = settings?.BANK_ACCOUNT_NAME || 'INGRESOS CONSULARES';
          setCuentaBancaria(`${settings.BANK_ACCOUNT_DEFAULT} - ${accName}`);
        }
        if (settings?.CUSTOM_HOLIDAYS) {
          setCustomHolidays(parseCustomHolidays(settings.CUSTOM_HOLIDAYS));
        }
      })
      .catch(() => {});
  }, []);

  // Si estamos en modo edición, precargar el registro
  useEffect(() => {
    if (!isEditMode || !editId) return;

    let active = true;
    setLoadingRecord(true);
    setSaveError('');

    fetchApi(`/records/${editId}`)
      .then((rec) => {
        if (!active || !rec) return;
        const mappedStatus = mapStatusFromApi(rec.status);
        setEstado(mappedStatus);
        if (rec.depositDate) setFechaDeposito(rec.depositDate);
        const depFixed = rec.depositAmount != null ? Number(rec.depositAmount).toFixed(2) : '';
        setValorDeposito(depFixed);
        setFechaConcentracion(rec.concentrationDate || '');
        setRegion(rec.region || '');
        setPais(rec.country || '');
        setEmbajadaSede(rec.location || '');

        const pas = Number(rec.passportValue) || 0;
        const dui = Number(rec.duiValue) || 0;
        const con = Number(rec.consularValue) || 0;
        const com = Number(rec.commissionValue) || 0;
        const sumDistributed = pas + dui + con + com;

        setValorPasaporte(pas > 0 ? pas.toFixed(2) : '');
        setValorDui(dui > 0 ? dui.toFixed(2) : '');
        setValorConsular(con > 0 ? con.toFixed(2) : '');

        if (sumDistributed > 0) {
          setTotalIngresos(sumDistributed.toFixed(2));
          setTotalIngresosManual(true);
        } else {
          setTotalIngresos(depFixed);
          setTotalIngresosManual(false);
        }
      })
      .catch((err: any) => {
        if (active) {
          setSaveError(err.message || 'No se pudo cargar el registro para edición');
        }
      })
      .finally(() => {
        if (active) setLoadingRecord(false);
      });

    return () => {
      active = false;
    };
  }, [isEditMode, editId]);

  // Sincronizar Total Ingresos inicialmente con Valor del Depósito hasta que el usuario lo ajuste manualmente
  useEffect(() => {
    if (!totalIngresosManual) {
      setTotalIngresos(valorDeposito);
    }
  }, [valorDeposito, totalIngresosManual]);

  // Calcular días hábiles de concentración (excluye sábados, domingos y asuetos de El Salvador)
  useEffect(() => {
    if (fechaDeposito && fechaConcentracion) {
      setDiasConcentracion(countBusinessDays(fechaDeposito, fechaConcentracion, customHolidays));
    } else {
      setDiasConcentracion(0);
    }
  }, [fechaDeposito, fechaConcentracion, customHolidays]);

  const regionesDisponibles = useMemo(() => {
    const set = new Set<string>(consulates.map((c) => c.region));
    if (region) set.add(region);
    return Array.from(set).sort();
  }, [consulates, region]);

  const paisesDisponibles = useMemo(() => {
    const filtered = region ? consulates.filter((c) => c.region === region) : consulates;
    const set = new Set<string>(filtered.map((c) => c.country));
    if (pais) set.add(pais);
    return Array.from(set).sort();
  }, [consulates, region, pais]);

  const sedesDisponibles = useMemo(() => {
    const filtered = consulates.filter((c) => {
      if (region && c.region !== region) return false;
      if (pais && c.country !== pais) return false;
      return true;
    });
    const labels = filtered.map((c) => `${c.type} - ${c.location} (${c.country})`);
    const set = new Set<string>(labels);
    if (embajadaSede) set.add(embajadaSede);
    return Array.from(set);
  }, [consulates, region, pais, embajadaSede]);

  // Cálculo automático de Comisión: Total Ingresos - (Pasaporte + DUI + Valor Consular) tras ingresar los costos
  const calculoDistribucion = useMemo(() => {
    const ingresoNum = parseFloat(totalIngresos) || 0;
    const pas = parseFloat(valorPasaporte) || 0;
    const dui = parseFloat(valorDui) || 0;
    const con = parseFloat(valorConsular) || 0;
    const subtotalTramites = +(pas + dui + con).toFixed(2);
    const tieneCostos = subtotalTramites > 0;
    const diferencia = +(ingresoNum - subtotalTramites).toFixed(2);
    const excedido = tieneCostos && diferencia < 0;
    const comisionCalculada = tieneCostos && diferencia >= 0 ? diferencia : 0;

    return {
      ingresoNum,
      subtotalTramites,
      tieneCostos,
      diferencia,
      excedido,
      comisionCalculada,
    };
  }, [totalIngresos, valorPasaporte, valorDui, valorConsular]);

  const handleMoneyInput = (setter: (val: string) => void, onManual?: () => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(',', '.');
    if (val === '' || /^\d{0,12}(\.\d{0,2})?$/.test(val)) {
      if (onManual) onManual();
      setter(val);
    }
  };

  const handleMoneyBlur = (value: string, setter: (val: string) => void) => () => {
    if (value && !isNaN(parseFloat(value))) {
      setter(parseFloat(value).toFixed(2));
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');

    const monto = parseFloat(valorDeposito);
    if (!monto || monto <= 0) {
      setSaveError('El valor del depósito debe ser mayor a $0.00');
      return;
    }

    if (fechaConcentracion && fechaConcentracion < fechaDeposito) {
      setSaveError('La fecha de concentración BCR no puede ser anterior a la fecha de depósito');
      return;
    }

    if (estado !== 'No identificado' && (!region.trim() || !pais.trim() || !embajadaSede.trim())) {
      setSaveError('Debe seleccionar región, país y sede consular para ingresos identificados');
      return;
    }

    if (estado === 'Identificado Distribuido') {
      if (calculoDistribucion.ingresoNum <= 0) {
        setSaveError('El Total de Ingresos debe ser mayor a $0.00');
        return;
      }
      if (!calculoDistribucion.tieneCostos) {
        setSaveError('Ingrese al menos un monto mayor a $0.00 en Pasaporte, DUI o Valor Consular');
        return;
      }
      if (calculoDistribucion.excedido) {
        setSaveError(
          `La suma de Pasaporte, DUI y Valor Consular ($${calculoDistribucion.subtotalTramites.toFixed(2)}) no puede superar el Total de Ingresos ($${calculoDistribucion.ingresoNum.toFixed(2)})`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const payload: any = {
        depositDate: fechaDeposito,
        depositAmount: monto,
        concentrationDate: fechaConcentracion || null,
        days: diasConcentracion,
        status: estado,
      };

      if (estado !== 'No identificado') {
        payload.region = region.trim();
        payload.country = pais.trim();
        payload.location = embajadaSede.trim();
      }

      if (estado === 'Identificado Distribuido') {
        payload.totalIncome = calculoDistribucion.ingresoNum;
        payload.passportValue = parseFloat(valorPasaporte) || 0;
        payload.duiValue = parseFloat(valorDui) || 0;
        payload.consularValue = parseFloat(valorConsular) || 0;
        payload.commissionValue = calculoDistribucion.comisionCalculada;
      }

      if (isEditMode && editId) {
        await fetchApi(`/records/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/records', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      setSaveError(err.message || 'Error al guardar el registro');
      setSaving(false);
    }
  };

  const estados = [
    { value: 'No identificado', label: 'No identificado', color: '#94a3b8', icon: <IcAlert /> },
    { value: 'Identificado / No distribuido', label: 'Identificado / No distribuido', color: '#f59e0b', icon: <IcSearch /> },
    { value: 'Identificado Distribuido', label: 'Identificado Distribuido', color: '#22c55e', icon: <IcCheckCircle /> },
  ];

  const money = (v: string | number) => {
    const num = typeof v === 'number' ? v : parseFloat(v) || 0;
    return `$${num.toFixed(2)}`;
  };

  return (
    <main style={{ flex: 1, padding: "28px 40px", overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style jsx global>{`
        .field-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0f1a30;
          border: 1.5px solid #2e436e;
          border-radius: 11px;
          padding: 0 13px;
          height: 47px;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .field-box:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, .18);
        }
        .field-box input,
        .field-box select {
          flex: 1;
          min-width: 0;
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #e2e8f0;
          font-size: 14px;
          font-family: inherit;
          height: 100%;
          appearance: none;
          -webkit-appearance: none;
        }
        .field-box input::placeholder { color: #475569; }
        .field-box .field-icon { color: #64748b; display: flex; align-items: center; flex-shrink: 0; transition: color .15s ease; }
        .field-box:focus-within .field-icon { color: #60a5fa; }
        .field-box .field-chevron { color: #64748b; display: flex; align-items: center; pointer-events: none; flex-shrink: 0; }
        .field-box.disabled {
          background: #0b1424;
          border-color: #243552;
        }
        .field-box.disabled input { color: #94a3b8; cursor: not-allowed; }
        .field-box.disabled .field-icon { color: #475569; }
        .field-box input[type="date"] {
          color-scheme: dark;
          cursor: text;
        }
        select option { background-color: #0f1a30; color: #ffffff; }

        .estado-btn {
          flex: 1 1 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 13px 12px;
          border-radius: 11px;
          border: 1.5px solid #2e436e;
          background: #0f1a30;
          color: #94a3b8;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 600;
          font-family: inherit;
          transition: all .18s ease;
        }
        .estado-btn:hover { border-color: #3b527d; color: #e2e8f0; transform: translateY(-1px); }

        .btn-ghost {
          display: flex; align-items: center; gap: 8px;
          background: transparent;
          border: 1.5px solid #3b527d;
          color: #cbd5e1;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all .15s ease;
        }
        .btn-ghost:hover { border-color: #ef4444; color: #fca5a5; background: rgba(239,68,68,.08); }

        .btn-save {
          display: flex; align-items: center; gap: 9px;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          border: none;
          color: #ffffff;
          padding: 12px 28px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(37, 99, 235, .45);
          transition: all .15s ease;
        }
        .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(37, 99, 235, .55); }
        .btn-save:disabled { opacity: .65; cursor: not-allowed; box-shadow: none; }

        .btn-back {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: #1c2d4f;
          border: 1.5px solid #3b527d;
          color: #ffffff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all .15s ease;
        }
        .btn-back:hover { background: #2563eb; border-color: #3b82f6; transform: translateX(-2px); }

        .spin { animation: sic-spin 1s linear infinite; }
        @keyframes sic-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Encabezado Superior */}
      <div style={{ width: "100%", maxWidth: "920px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button className="btn-back" onClick={() => router.push('/dashboard')} title="Volver a la Bandeja">
          <IcArrowLeft />
        </button>
        <div style={{
          width: '46px', height: '46px', borderRadius: '13px', flexShrink: 0,
          background: 'linear-gradient(135deg, #C59B27 0%, #e0b84a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0f1a30', boxShadow: '0 6px 16px rgba(197, 155, 39, .35)'
        }}>
          <IcCoins />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#ffffff", letterSpacing: '0.2px' }}>
              {isEditMode ? 'Editar Ingreso Consular' : 'Registrar Ingreso Consular'}
            </h1>
            <span style={{
              fontSize: '9.5px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#0f1a30', backgroundColor: isEditMode ? '#f59e0b' : '#38bdf8',
              borderRadius: '999px', padding: '3px 9px'
            }}>
              {isEditMode ? `Edición #${editId}` : 'Nuevo'}
            </span>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
            Departamento de Ingresos, Colecturías de Aduanas · Ministerio de Hacienda
          </p>
        </div>
      </div>

      {/* Tarjeta Centrada */}
      <div style={{ width: "100%", maxWidth: "920px", backgroundColor: "#16243e", border: "1px solid #2e436e", borderTop: "4px solid #C59B27", borderRadius: "14px", padding: "32px 36px 28px", boxShadow: "0 24px 48px rgba(0,0,0,0.55)" }}>
        {loadingRecord ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Cargando datos del registro #{editId}...
          </div>
        ) : (
          <form onSubmit={handleGuardar} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* Chips de información */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <InfoChip icon={<IcId />} label="ID" value={isEditMode ? `#${editId}` : 'Automático'} />
              <InfoChip icon={<IcUser />} label={isEditMode ? 'Modificado por' : 'Ingresado por'} value={user?.name || 'Cargando...'} />
            </div>

            {/* Estado - control segmentado */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '9px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                Estado del ingreso <span style={{ color: '#f43f5e', fontSize: '13px' }}>*</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {estados.map((o) => {
                  const active = estado === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className="estado-btn"
                      onClick={() => setEstado(o.value)}
                      style={active ? {
                        borderColor: o.color,
                        backgroundColor: `${o.color}1f`,
                        color: '#ffffff',
                        boxShadow: `0 4px 16px ${o.color}33`,
                      } : undefined}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', color: active ? o.color : undefined }}>{o.icon}</span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN 1: Datos del depósito */}
            <section>
              <SectionTitle icon={<IcBank />} color="#3b82f6" title="Datos del Depósito" subtitle="Información bancaria y fechas de concentración BCR" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Cuenta Bancaria" icon={<IcBank />} disabled>
                    <input type="text" disabled value={cuentaBancaria} />
                  </Field>
                </div>

                <Field label="Fecha Depósito" required icon={<IcCalendar />} date>
                  <input type="date" required value={fechaDeposito} onChange={e => setFechaDeposito(e.target.value)} />
                </Field>

                <Field label="Valor del Depósito" required icon={<IcDollar />}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    required
                    value={valorDeposito}
                    onChange={handleMoneyInput(setValorDeposito)}
                    onBlur={handleMoneyBlur(valorDeposito, setValorDeposito)}
                  />
                </Field>

                <Field label="Fecha Concentración BCR" hint="opcional si aún no aplica" icon={<IcCalendar />} date>
                  <input type="date" min={fechaDeposito} value={fechaConcentracion} onChange={e => setFechaConcentracion(e.target.value)} />
                </Field>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Días de Concentración
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#64748b' }}>(solo días hábiles)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(56,189,248,.14) 0%, rgba(56,189,248,.05) 100%)', border: '1.5px solid rgba(56,189,248,.4)', borderRadius: '11px', padding: '0 14px', height: '47px' }}>
                    <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center' }}><IcClock /></span>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: '#38bdf8' }}>{diasConcentracion}</span>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>
                      {diasConcentracion === 1 ? 'día hábil' : 'días hábiles'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Procedencia */}
            {(estado === 'Identificado / No distribuido' || estado === 'Identificado Distribuido') && (
              <section>
                <SectionTitle icon={<IcGlobe />} color="#f59e0b" title="Procedencia del Ingreso" subtitle="Región, país y sede consular de origen" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                  <Field label="Región" required icon={<IcGlobe />} chevron>
                    <select
                      required
                      value={region}
                      onChange={(e) => {
                        setRegion(e.target.value);
                        setPais('');
                        setEmbajadaSede('');
                      }}
                    >
                      <option value="">Seleccione región</option>
                      {regionesDisponibles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="País" required icon={<IcFlag />} chevron>
                    <select
                      required
                      value={pais}
                      onChange={(e) => {
                        setPais(e.target.value);
                        setEmbajadaSede('');
                      }}
                    >
                      <option value="">Seleccione país</option>
                      {paisesDisponibles.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Embajada / Consulado" required icon={<IcBuilding />} chevron>
                    <select required value={embajadaSede} onChange={e => setEmbajadaSede(e.target.value)}>
                      <option value="">Seleccione sede</option>
                      {sedesDisponibles.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {estado === 'Identificado / No distribuido' && (
                  <div style={{ marginTop: '18px' }}>
                    <TotalCard
                      icon={<IcDollar />}
                      color="#38bdf8"
                      label="Monto Depositado (Sin Distribuir)"
                      value={money(valorDeposito)}
                      subtitle="La comisión y el desglose se determinarán al confirmar el monto enviado con la sede consular"
                      badge="PRELIMINAR"
                    />
                  </div>
                )}
              </section>
            )}

            {/* SECCIÓN 3: Distribución */}
            {estado === 'Identificado Distribuido' && (
              <section>
                <SectionTitle icon={<IcBook />} color="#22c55e" title="Distribución de Ingresos" subtitle="Ingrese el Total de Ingresos reportado por el consulado y el desglose de trámites; la comisión se calcula automáticamente" />

                <div style={{ marginBottom: '18px' }}>
                  <Field
                    label="Total Ingresos (Reportado por Consulado)"
                    required
                    hint="incluye comisión bancaria si fue descontada en el traslado"
                    icon={<IcDollar />}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      required
                      value={totalIngresos}
                      onChange={handleMoneyInput(setTotalIngresos, () => setTotalIngresosManual(true))}
                      onBlur={handleMoneyBlur(totalIngresos, setTotalIngresos)}
                    />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                  <Field label="Valor Pasaporte" icon={<IcBook />}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={valorPasaporte}
                      onChange={handleMoneyInput(setValorPasaporte)}
                      onBlur={handleMoneyBlur(valorPasaporte, setValorPasaporte)}
                    />
                  </Field>

                  <Field label="Valor DUI" icon={<IcId />}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={valorDui}
                      onChange={handleMoneyInput(setValorDui)}
                      onBlur={handleMoneyBlur(valorDui, setValorDui)}
                    />
                  </Field>

                  <Field label="Valor Consular" icon={<IcCard />}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={valorConsular}
                      onChange={handleMoneyInput(setValorConsular)}
                      onBlur={handleMoneyBlur(valorConsular, setValorConsular)}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: '18px' }}>
                  <TotalCard
                    icon={<IcDollar />}
                    color={calculoDistribucion.excedido ? '#ef4444' : '#C59B27'}
                    label="Comisión por Envío / Traslado (Calculada)"
                    value={calculoDistribucion.excedido ? `Excedido por $${Math.abs(calculoDistribucion.diferencia).toFixed(2)}` : money(calculoDistribucion.comisionCalculada)}
                    subtitle={
                      calculoDistribucion.tieneCostos
                        ? `Total Ingresos (${money(calculoDistribucion.ingresoNum)}) − Suma DUI + Pasaporte + Consular (${money(calculoDistribucion.subtotalTramites)})`
                        : 'Se calculará automáticamente al ingresar los valores de Pasaporte, DUI o Consular'
                    }
                    badge={calculoDistribucion.excedido ? 'REVISAR MONTOS' : 'AUTOMÁTICA'}
                  />
                </div>
              </section>
            )}

            {/* Error */}
            {saveError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.45)', color: '#fca5a5', padding: '12px 15px', borderRadius: '10px', fontSize: '13px' }}>
                <span style={{ display: 'flex', color: '#ef4444' }}><IcAlertTriangle /></span>
                {saveError}
              </div>
            )}

            {/* Botones al Pie */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', paddingTop: '22px', borderTop: '1.5px solid #2e436e' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                Los campos marcados con <span style={{ color: '#f43f5e' }}>*</span> son obligatorios
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-ghost" onClick={() => router.push('/dashboard')}>
                  <IcX /> Cancelar
                </button>

                <button type="submit" className="btn-save" disabled={saving || (estado === 'Identificado Distribuido' && calculoDistribucion.excedido)}>
                  {saving ? (
                    <span className="spin" style={{ display: 'flex' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                        <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                      </svg>
                    </span>
                  ) : (
                    <IcSave />
                  )}
                  {saving ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Guardar Ingreso'}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </main>
  );
}

export default function RegistrarIngresoPage() {
  return (
    <Suspense fallback={<main style={{ flex: 1, padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando formulario...</main>}>
      <RegistrarIngresoForm />
    </Suspense>
  );
}
