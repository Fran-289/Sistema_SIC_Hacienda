package sv.gob.hacienda.sic.resource;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.eclipse.microprofile.jwt.JsonWebToken;
import sv.gob.hacienda.sic.entity.Record;
import sv.gob.hacienda.sic.entity.SystemSetting;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;
import sv.gob.hacienda.sic.util.BusinessDayCalculator;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class TaskResource {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    @Path("/count")
    public Map<String, Object> obtenerConteoPendientes() {
        int thresholdDays = loadConcentrationThreshold();
        Set<LocalDate> customHolidays = loadCustomHolidays();
        LocalDate today = LocalDate.now();

        List<Record> activeRecords = Record.find("deletedAt is null").list();
        int totalPending = 0;
        int criticalCount = 0;

        for (Record r : activeRecords) {
            Map<String, Object> task = evaluateRecordTask(r, thresholdDays, customHolidays, today);
            if (task != null) {
                totalPending++;
                if ("CRITICA".equals(task.get("priority"))) {
                    criticalCount++;
                }
            }
        }

        long openGroups = sv.gob.hacienda.sic.entity.ReportGroup.count("processStatus not in ('Finalizado', 'Completado')");

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalPending", openGroups > 0 ? openGroups : totalPending);
        res.put("openGroupsCount", openGroups);
        res.put("pendingDepositsCount", totalPending);
        res.put("criticalCount", criticalCount);
        res.put("thresholdDays", thresholdDays);
        return res;
    }

    @GET
    public Response listarTareasPendientes(
            @QueryParam("category") String categoryParam,
            @QueryParam("priority") String priorityParam,
            @QueryParam("search") String searchParam
    ) {
        int thresholdDays = loadConcentrationThreshold();
        Set<LocalDate> customHolidays = loadCustomHolidays();
        LocalDate today = LocalDate.now();

        List<Record> activeRecords = Record.find("deletedAt is null ORDER BY depositDate ASC, id ASC").list();

        List<Map<String, Object>> allTasks = new ArrayList<>();
        int unidentifiedCount = 0;
        int undistributedCount = 0;
        int delayedConcentrationCount = 0;
        BigDecimal totalPendingAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (Record r : activeRecords) {
            Map<String, Object> task = evaluateRecordTask(r, thresholdDays, customHolidays, today);
            if (task == null) {
                continue;
            }
            boolean isUnidentified = Boolean.TRUE.equals(task.get("isUnidentified"));
            boolean isUndistributed = Boolean.TRUE.equals(task.get("isUndistributed"));
            boolean isDelayed = Boolean.TRUE.equals(task.get("isConcentrationDelayed"));

            if (isUnidentified) unidentifiedCount++;
            if (isUndistributed) undistributedCount++;
            if (isDelayed) delayedConcentrationCount++;

            if (isUnidentified || isUndistributed) {
                totalPendingAmount = totalPendingAmount.add(scale(r.depositAmount));
            }

            allTasks.add(task);
        }

        List<Map<String, Object>> filtered = filterTasks(allTasks, categoryParam, priorityParam, searchParam);

        // Ordenar por severidad (CRITICA -> ALTA -> MEDIA) y luego mayor antigüedad
        filtered.sort(Comparator
                .comparingInt((Map<String, Object> m) -> priorityRank(String.valueOf(m.get("priority"))))
                .thenComparing(Comparator.comparingInt((Map<String, Object> m) -> ((Number) m.get("ageBusinessDays")).intValue()).reversed())
        );

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPending", allTasks.size());
        summary.put("unidentifiedCount", unidentifiedCount);
        summary.put("undistributedCount", undistributedCount);
        summary.put("delayedConcentrationCount", delayedConcentrationCount);
        summary.put("totalPendingAmount", totalPendingAmount);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("thresholdDays", thresholdDays);
        payload.put("summary", summary);
        payload.put("items", filtered);
        return Response.ok(payload).build();
    }

    @GET
    @Path("/export")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarTareasExcel(
            @QueryParam("category") String categoryParam,
            @QueryParam("priority") String priorityParam,
            @QueryParam("search") String searchParam
    ) {
        int thresholdDays = loadConcentrationThreshold();
        Set<LocalDate> customHolidays = loadCustomHolidays();
        LocalDate today = LocalDate.now();

        List<Record> activeRecords = Record.find("deletedAt is null ORDER BY depositDate ASC, id ASC").list();
        List<Map<String, Object>> allTasks = new ArrayList<>();
        for (Record r : activeRecords) {
            Map<String, Object> task = evaluateRecordTask(r, thresholdDays, customHolidays, today);
            if (task != null) {
                allTasks.add(task);
            }
        }

        List<Map<String, Object>> filtered = filterTasks(allTasks, categoryParam, priorityParam, searchParam);
        filtered.sort(Comparator
                .comparingInt((Map<String, Object> m) -> priorityRank(String.valueOf(m.get("priority"))))
                .thenComparing(Comparator.comparingInt((Map<String, Object> m) -> ((Number) m.get("ageBusinessDays")).intValue()).reversed())
        );

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Tareas Pendientes SIC");

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = wb.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] headers = {
                "ID Ingreso", "Prioridad", "Estado Actual", "Fecha Depósito", "Antigüedad (Días Hábiles)",
                "Fecha Concentración BCR", "Días Concentración", "Monto Depósito ($)",
                "Región", "País", "Embajada / Consulado", "Alertas Detectadas", "Acción Requerida"
            };

            Row hRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = hRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rIdx = 1;
            for (Map<String, Object> t : filtered) {
                Row row = sheet.createRow(rIdx++);
                @SuppressWarnings("unchecked")
                List<String> alerts = (List<String>) t.get("alerts");
                row.createCell(0).setCellValue(((Number) t.get("id")).longValue());
                row.createCell(1).setCellValue(String.valueOf(t.get("priorityLabel")));
                row.createCell(2).setCellValue(String.valueOf(t.get("displayStatus")));
                row.createCell(3).setCellValue(String.valueOf(t.get("depositDateFormatted")));
                row.createCell(4).setCellValue(((Number) t.get("ageBusinessDays")).intValue());
                row.createCell(5).setCellValue(String.valueOf(t.get("concentrationDateFormatted")));
                row.createCell(6).setCellValue(((Number) t.get("concentrationDays")).intValue());
                row.createCell(7).setCellValue(((Number) t.get("depositAmount")).doubleValue());
                row.createCell(8).setCellValue(String.valueOf(t.get("region")));
                row.createCell(9).setCellValue(String.valueOf(t.get("country")));
                row.createCell(10).setCellValue(String.valueOf(t.get("location")));
                row.createCell(11).setCellValue(alerts != null ? String.join(" | ", alerts) : "");
                row.createCell(12).setCellValue(String.valueOf(t.get("requiredAction")));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);

            auditService.log(resolveCurrentUser(), jwtName(), "EXPORTAR_TAREAS_PENDIENTES",
                    "Exportación de bandeja de tareas pendientes (" + filtered.size() + " elementos)");

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"tareas_pendientes_sic.xlsx\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo exportar el listado de tareas pendientes"))
                    .build();
        }
    }

    private Map<String, Object> evaluateRecordTask(
            Record r,
            int thresholdDays,
            Set<LocalDate> customHolidays,
            LocalDate today
    ) {
        String upperStatus = r.status != null ? r.status.trim().toUpperCase() : "NO IDENTIFICADO";
        boolean isUnidentified = "NO IDENTIFICADO".equals(upperStatus);
        boolean isUndistributed = "IDENTIFICADO / NO DISTRIBUIDO".equals(upperStatus)
                || "IDENTIFICADO NO DISTRIBUIDO".equals(upperStatus);

        int ageBusinessDays = (r.depositDate != null && today.isAfter(r.depositDate))
                ? BusinessDayCalculator.countBusinessDays(r.depositDate, today, customHolidays)
                : 0;

        int concDays = r.days != null ? r.days : 0;
        if (r.concentrationDate != null && r.depositDate != null && r.days == null) {
            concDays = BusinessDayCalculator.countBusinessDays(r.depositDate, r.concentrationDate, customHolidays);
        }

        boolean missingConcentrationOverdue = r.concentrationDate == null && ageBusinessDays > thresholdDays;
        boolean lateConcentrationRecorded = r.concentrationDate != null && concDays > thresholdDays;
        boolean isConcentrationDelayed = missingConcentrationOverdue || lateConcentrationRecorded;

        if (!isUnidentified && !isUndistributed && !isConcentrationDelayed) {
            return null;
        }

        List<String> alerts = new ArrayList<>();
        List<String> actions = new ArrayList<>();

        if (isUnidentified) {
            alerts.add("SIN IDENTIFICAR");
            actions.add("Identificar Embajada/Consulado de origen");
        }
        if (isUndistributed) {
            alerts.add("SIN DISTRIBUIR");
            actions.add("Distribuir montos en Pasaporte, DUI y Consular");
        }
        if (missingConcentrationOverdue) {
            alerts.add("SIN CONCENTRAR (" + ageBusinessDays + "d > " + thresholdDays + "d)");
            actions.add("Registrar Fecha de Concentración BCR");
        } else if (lateConcentrationRecorded) {
            alerts.add("MORA CONCENTRACIÓN (" + concDays + "d > " + thresholdDays + "d)");
            if (!isUnidentified && !isUndistributed) {
                actions.add("Verificar justificación de demora en concentración bancaria (" + concDays + " días hábiles)");
            }
        }

        // Determinar prioridad
        String priority;
        String priorityLabel;
        if ((isUnidentified && isConcentrationDelayed) || (isUnidentified && ageBusinessDays > thresholdDays * 2)) {
            priority = "CRITICA";
            priorityLabel = "CRÍTICA";
        } else if (isUnidentified || missingConcentrationOverdue) {
            priority = "ALTA";
            priorityLabel = "ALTA";
        } else {
            priority = "MEDIA";
            priorityLabel = "MEDIA";
        }

        String primaryCategory = isUnidentified
                ? "SIN_IDENTIFICAR"
                : isUndistributed
                ? "SIN_DISTRIBUIR"
                : "MORA_CONCENTRACION";

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", r.id);
        dto.put("primaryCategory", primaryCategory);
        dto.put("priority", priority);
        dto.put("priorityLabel", priorityLabel);
        dto.put("isUnidentified", isUnidentified);
        dto.put("isUndistributed", isUndistributed);
        dto.put("isConcentrationDelayed", isConcentrationDelayed);
        dto.put("missingConcentration", r.concentrationDate == null);
        dto.put("status", r.status);
        dto.put("displayStatus", formatDisplayStatus(r.status));
        dto.put("depositDate", r.depositDate != null ? r.depositDate.toString() : null);
        dto.put("depositDateFormatted", r.depositDate != null ? r.depositDate.format(DATE_FMT) : "-");
        dto.put("concentrationDate", r.concentrationDate != null ? r.concentrationDate.toString() : null);
        dto.put("concentrationDateFormatted", r.concentrationDate != null ? r.concentrationDate.format(DATE_FMT) : "Pendiente");
        dto.put("ageBusinessDays", ageBusinessDays);
        dto.put("concentrationDays", concDays);
        dto.put("depositAmount", scale(r.depositAmount));
        dto.put("region", r.region != null && !r.region.isBlank() ? r.region : "-");
        dto.put("country", r.country != null && !r.country.isBlank() ? r.country : "-");
        dto.put("location", r.location != null && !r.location.isBlank() ? r.location : "NO IDENTIFICADA");
        dto.put("alerts", alerts);
        dto.put("requiredAction", String.join(" · ", actions));
        dto.put("createdBy", r.createdBy != null ? r.createdBy.name : "Sistema");
        return dto;
    }

    private List<Map<String, Object>> filterTasks(
            List<Map<String, Object>> list,
            String categoryParam,
            String priorityParam,
            String searchParam
    ) {
        String cat = InputSanitizer.cleanSingleLine(categoryParam);
        String prio = InputSanitizer.cleanSingleLine(priorityParam);
        String search = InputSanitizer.cleanSingleLine(searchParam);
        String q = search != null ? search.toLowerCase() : null;

        return list.stream().filter(item -> {
            if (cat != null && !"ALL".equalsIgnoreCase(cat)) {
                switch (cat.toUpperCase()) {
                    case "SIN_IDENTIFICAR" -> {
                        if (!Boolean.TRUE.equals(item.get("isUnidentified"))) return false;
                    }
                    case "SIN_DISTRIBUIR" -> {
                        if (!Boolean.TRUE.equals(item.get("isUndistributed"))) return false;
                    }
                    case "MORA_CONCENTRACION" -> {
                        if (!Boolean.TRUE.equals(item.get("isConcentrationDelayed"))) return false;
                    }
                    default -> {
                    }
                }
            }
            if (prio != null && !"ALL".equalsIgnoreCase(prio)) {
                if (!prio.equalsIgnoreCase(String.valueOf(item.get("priority")))) {
                    return false;
                }
            }
            if (q != null) {
                String hay = (item.get("id") + " " + item.get("location") + " " + item.get("country") + " "
                        + item.get("region") + " " + item.get("depositAmount") + " " + item.get("requiredAction")).toLowerCase();
                if (!hay.contains(q)) {
                    return false;
                }
            }
            return true;
        }).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    private int priorityRank(String p) {
        return switch (p) {
            case "CRITICA" -> 1;
            case "ALTA" -> 2;
            default -> 3;
        };
    }

    private int loadConcentrationThreshold() {
        SystemSetting s = SystemSetting.findById("CONCENTRATION_MAX_DAYS");
        if (s != null && s.settingValue != null) {
            try {
                int v = Integer.parseInt(s.settingValue.trim());
                if (v >= 1 && v <= 30) return v;
            } catch (NumberFormatException ignored) {
            }
        }
        return 5;
    }

    private Set<LocalDate> loadCustomHolidays() {
        SystemSetting s = SystemSetting.findById("CUSTOM_HOLIDAYS");
        return s != null ? BusinessDayCalculator.parseCustomHolidays(s.settingValue) : Set.of();
    }

    private String formatDisplayStatus(String dbStatus) {
        if (dbStatus == null) return "";
        return switch (dbStatus.toUpperCase()) {
            case "NO IDENTIFICADO" -> "No identificado";
            case "IDENTIFICADO / NO DISTRIBUIDO", "IDENTIFICADO NO DISTRIBUIDO" -> "Identificado / No distribuido";
            case "IDENTIFICADO DISTRIBUIDO" -> "Identificado Distribuido";
            default -> dbStatus;
        };
    }

    private BigDecimal scale(BigDecimal val) {
        return val != null ? val.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private User resolveCurrentUser() {
        String email = jwtName();
        return email != null ? User.findByEmail(email) : null;
    }

    private String jwtName() {
        return (jwt != null && jwt.getName() != null && !jwt.getName().isBlank()) ? jwt.getName() : null;
    }
}
