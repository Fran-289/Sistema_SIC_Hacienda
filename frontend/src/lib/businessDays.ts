// Asuetos oficiales fijos de El Salvador (formato MM-DD)
const FIXED_HOLIDAYS_SV = new Set<string>([
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '05-10', // Día de la Madre
  '06-17', // Día del Padre
  '08-03', // Fiestas Agostinas
  '08-04', // Fiestas Agostinas
  '08-05', // Fiestas Agostinas
  '08-06', // Día del Divino Salvador del Mundo
  '09-15', // Día de la Independencia
  '11-02', // Día de los Difuntos
  '12-25', // Navidad
]);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * Calcula el Domingo de Pascua (algoritmo gregoriano estándar) en UTC.
 */
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

function getHolyWeekHolidaysIso(year: number): Set<string> {
  const easter = computeEasterSundayUtc(year);
  const addDays = (base: Date, delta: number) => {
    const copy = new Date(base.getTime());
    copy.setUTCDate(copy.getUTCDate() + delta);
    return toIsoDate(copy);
  };
  return new Set<string>([
    addDays(easter, -3), // Jueves Santo
    addDays(easter, -2), // Viernes Santo
    addDays(easter, -1), // Sábado de Gloria
  ]);
}

export function parseCustomHolidays(raw?: string | null): Set<string> {
  if (!raw || !raw.trim()) return new Set<string>();
  const cleaned = raw.replace(/[\[\]"']/g, '');
  const tokens = cleaned.split(/[,;\s]+/);
  const set = new Set<string>();
  for (const t of tokens) {
    const trimmed = t.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      set.add(trimmed);
    }
  }
  return set;
}

/**
 * Cuenta los días hábiles entre startIso (excluido) y endIso (incluido),
 * excluyendo sábados, domingos, asuetos oficiales de El Salvador (incluyendo Semana Santa)
 * y cualquier fecha adicional configurada en customHolidays.
 */
export function countBusinessDays(
  startIso: string,
  endIso: string,
  customHolidays: Set<string> = new Set()
): number {
  if (!startIso || !endIso || endIso <= startIso) {
    return 0;
  }

  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) {
    return 0;
  }

  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  let count = 0;
  let cachedYear = -1;
  let movableHolidays = new Set<string>();

  cursor.setUTCDate(cursor.getUTCDate() + 1);

  while (cursor.getTime() <= end.getTime()) {
    const year = cursor.getUTCFullYear();
    if (year !== cachedYear) {
      cachedYear = year;
      movableHolidays = getHolyWeekHolidaysIso(year);
    }

    const dow = cursor.getUTCDay(); // 0 = Domingo, 6 = Sábado
    if (dow !== 0 && dow !== 6) {
      const iso = toIsoDate(cursor);
      const monthDay = iso.slice(5);
      if (
        !FIXED_HOLIDAYS_SV.has(monthDay) &&
        !movableHolidays.has(iso) &&
        !customHolidays.has(iso)
      ) {
        count++;
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}
