package sv.gob.hacienda.sic.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class BusinessDayCalculator {

    // Asuetos oficiales fijos de El Salvador (Sector Público / Ministerio de Hacienda)
    private static final Set<MonthDay> FIXED_HOLIDAYS_SV = Set.of(
        MonthDay.of(1, 1),   // Año Nuevo
        MonthDay.of(5, 1),   // Día del Trabajo
        MonthDay.of(5, 10),  // Día de la Madre
        MonthDay.of(6, 17),  // Día del Padre
        MonthDay.of(8, 3),   // Fiestas Agostinas
        MonthDay.of(8, 4),   // Fiestas Agostinas
        MonthDay.of(8, 5),   // Fiestas Agostinas
        MonthDay.of(8, 6),   // Día del Divino Salvador del Mundo
        MonthDay.of(9, 15),  // Día de la Independencia
        MonthDay.of(11, 2),  // Día de los Difuntos
        MonthDay.of(12, 25)  // Navidad
    );

    private BusinessDayCalculator() {}

    /**
     * Cuenta los días hábiles transcurridos desde startDate (excluido) hasta endDate (incluido),
     * excluyendo sábados, domingos, asuetos oficiales de El Salvador (incluyendo Semana Santa)
     * y cualquier fecha adicional configurada en customHolidays.
     */
    public static int countBusinessDays(LocalDate startDate, LocalDate endDate, Set<LocalDate> customHolidays) {
        if (startDate == null || endDate == null || !endDate.isAfter(startDate)) {
            return 0;
        }

        Set<LocalDate> extra = customHolidays != null ? customHolidays : Collections.emptySet();
        int count = 0;
        int cachedYear = -1;
        Set<LocalDate> movableForYear = Collections.emptySet();

        LocalDate cursor = startDate.plusDays(1);
        while (!cursor.isAfter(endDate)) {
            if (cursor.getYear() != cachedYear) {
                cachedYear = cursor.getYear();
                movableForYear = holyWeekHolidays(cachedYear);
            }

            if (isBusinessDay(cursor, movableForYear, extra)) {
                count++;
            }
            cursor = cursor.plusDays(1);
        }

        return count;
    }

    public static boolean isBusinessDay(LocalDate date, Set<LocalDate> movableHolidays, Set<LocalDate> customHolidays) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }
        if (FIXED_HOLIDAYS_SV.contains(MonthDay.from(date))) {
            return false;
        }
        if (movableHolidays != null && movableHolidays.contains(date)) {
            return false;
        }
        if (customHolidays != null && customHolidays.contains(date)) {
            return false;
        }
        return true;
    }

    /**
     * Calcula Jueves Santo, Viernes Santo y Sábado de Gloria para un año dado
     * usando el algoritmo gregoriano estándar de Pascua.
     */
    public static Set<LocalDate> holyWeekHolidays(int year) {
        LocalDate easterSunday = computeEasterSunday(year);
        Set<LocalDate> set = new HashSet<>(3);
        set.add(easterSunday.minusDays(3)); // Jueves Santo
        set.add(easterSunday.minusDays(2)); // Viernes Santo
        set.add(easterSunday.minusDays(1)); // Sábado de Gloria
        return set;
    }

    public static LocalDate computeEasterSunday(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(year, month, day);
    }

    /**
     * Parsea una cadena de fechas separadas por coma o JSON simple (YYYY-MM-DD) a Set<LocalDate>.
     */
    public static Set<LocalDate> parseCustomHolidays(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptySet();
        }
        Set<LocalDate> result = new HashSet<>();
        String cleaned = raw.replace("[", "").replace("]", "").replace("\"", "").replace("'", "");
        for (String token : cleaned.split("[,;\\s]+")) {
            String trimmed = token.trim();
            if (trimmed.matches("\\d{4}-\\d{2}-\\d{2}")) {
                try {
                    result.add(LocalDate.parse(trimmed));
                } catch (Exception ignored) {
                }
            }
        }
        return result;
    }
}
