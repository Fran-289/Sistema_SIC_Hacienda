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
import sv.gob.hacienda.sic.entity.SystemLog;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/logs")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("ADMIN")
public class SystemLogResource {

    private static final DateTimeFormatter EXCEL_DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    public Response listarBitacora(
            @QueryParam("module") String moduleParam,
            @QueryParam("action") String actionParam,
            @QueryParam("search") String searchParam,
            @QueryParam("dateFrom") String dateFromParam,
            @QueryParam("dateTo") String dateToParam,
            @QueryParam("limit") Integer limitParam
    ) {
        int safeLimit = limitParam == null ? 300 : Math.max(1, Math.min(limitParam, 1000));

        QuerySpec spec;
        try {
            spec = buildQuerySpec(moduleParam, actionParam, searchParam, dateFromParam, dateToParam);
        } catch (IllegalArgumentException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }

        List<SystemLog> logs = SystemLog.find(
                spec.query + " ORDER BY createdAt DESC, id DESC",
                spec.params.toArray()
        ).page(0, safeLimit).list();

        List<Map<String, Object>> result = logs.stream()
                .map(this::toDto)
                .toList();

        return Response.ok(result).build();
    }

    @GET
    @Path("/export")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarBitacoraExcel(
            @QueryParam("module") String moduleParam,
            @QueryParam("action") String actionParam,
            @QueryParam("search") String searchParam,
            @QueryParam("dateFrom") String dateFromParam,
            @QueryParam("dateTo") String dateToParam
    ) {
        QuerySpec spec;
        try {
            spec = buildQuerySpec(moduleParam, actionParam, searchParam, dateFromParam, dateToParam);
        } catch (IllegalArgumentException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }

        List<SystemLog> logs = SystemLog.find(
                spec.query + " ORDER BY createdAt DESC, id DESC",
                spec.params.toArray()
        ).page(0, 2000).list();

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Bitácora de Auditoría");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] headers = {
                "ID", "Fecha y Hora", "Módulo", "Acción", "Usuario / Actor", "Detalle de Operación"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (SystemLog log : logs) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(log.id != null ? log.id : 0L);
                row.createCell(1).setCellValue(log.createdAt != null ? log.createdAt.format(EXCEL_DT_FMT) : "-");
                row.createCell(2).setCellValue(classifyModule(log.action));
                row.createCell(3).setCellValue(log.action != null ? log.action : "-");
                row.createCell(4).setCellValue(log.userName != null ? log.userName : "Sistema");
                row.createCell(5).setCellValue(log.details != null ? log.details : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);

            auditService.log(
                    resolveCurrentUser(),
                    jwtName(),
                    "EXPORTAR_BITACORA",
                    "Exportación de bitácora de auditoría del sistema (" + logs.size() + " eventos)"
            );

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"bitacora_auditoria_sic.xlsx\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo generar el archivo Excel de la bitácora"))
                    .build();
        }
    }

    private static class QuerySpec {
        final String query;
        final List<Object> params;

        QuerySpec(String query, List<Object> params) {
            this.query = query;
            this.params = params;
        }
    }

    private QuerySpec buildQuerySpec(
            String moduleParam,
            String actionParam,
            String searchParam,
            String dateFromParam,
            String dateToParam
    ) {
        List<String> clauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        int idx = 1;

        String module = InputSanitizer.cleanSingleLine(moduleParam);
        if (module != null && !"ALL".equalsIgnoreCase(module)) {
            switch (module.toUpperCase()) {
                case "AUTH" -> clauses.add("UPPER(action) LIKE 'LOGIN%'");
                case "INGRESOS" -> clauses.add("(UPPER(action) LIKE '%INGRESO%' OR UPPER(action) = 'EXPORTAR_EXCEL')");
                case "DIRECTORIO" -> clauses.add("(UPPER(action) LIKE '%SEDE%' OR UPPER(action) LIKE '%DIRECTORIO%')");
                case "USUARIOS" -> clauses.add("(UPPER(action) LIKE '%USUARIO%' OR UPPER(action) LIKE '%PASSWORD%')");
                case "CONFIGURACION" -> clauses.add("(UPPER(action) LIKE '%CONFIGURACION%' OR UPPER(action) LIKE '%ASUETO%' OR UPPER(action) LIKE '%BITACORA%')");
                default -> throw new IllegalArgumentException("Categoría de módulo no válida");
            }
        }

        String action = InputSanitizer.cleanSingleLine(actionParam);
        if (action != null && !"ALL".equalsIgnoreCase(action)) {
            if (action.length() > 100) {
                throw new IllegalArgumentException("Filtro de acción demasiado extenso");
            }
            clauses.add("UPPER(action) = ?" + idx++);
            params.add(action.toUpperCase());
        }

        String search = InputSanitizer.cleanSingleLine(searchParam);
        if (search != null) {
            if (search.length() > 120) {
                search = search.substring(0, 120);
            }
            String pattern = "%" + search.toLowerCase() + "%";
            int p1 = idx++;
            int p2 = idx++;
            int p3 = idx++;
            clauses.add("(LOWER(COALESCE(userName, '')) LIKE ?" + p1
                    + " OR LOWER(COALESCE(action, '')) LIKE ?" + p2
                    + " OR LOWER(COALESCE(details, '')) LIKE ?" + p3 + ")");
            params.add(pattern);
            params.add(pattern);
            params.add(pattern);
        }

        String cleanFrom = InputSanitizer.cleanSingleLine(dateFromParam);
        LocalDate fromDate = null;
        if (cleanFrom != null) {
            try {
                fromDate = LocalDate.parse(cleanFrom);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Fecha inicial inválida. Utilice formato YYYY-MM-DD.");
            }
            LocalDateTime startOfDay = fromDate.atStartOfDay();
            clauses.add("createdAt >= ?" + idx++);
            params.add(startOfDay);
        }

        String cleanTo = InputSanitizer.cleanSingleLine(dateToParam);
        if (cleanTo != null) {
            LocalDate toDate;
            try {
                toDate = LocalDate.parse(cleanTo);
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Fecha final inválida. Utilice formato YYYY-MM-DD.");
            }
            if (fromDate != null && toDate.isBefore(fromDate)) {
                throw new IllegalArgumentException("La fecha final no puede ser anterior a la fecha inicial.");
            }
            LocalDateTime endOfDay = toDate.atTime(LocalTime.MAX);
            clauses.add("createdAt <= ?" + idx++);
            params.add(endOfDay);
        }

        String where = clauses.isEmpty() ? "1 = 1" : String.join(" AND ", clauses);
        return new QuerySpec(where, params);
    }

    private String classifyModule(String action) {
        if (action == null) return "SISTEMA";
        String u = action.toUpperCase();
        if (u.startsWith("LOGIN")) return "AUTENTICACIÓN";
        if (u.contains("INGRESO") || "EXPORTAR_EXCEL".equals(u)) return "INGRESOS";
        if (u.contains("SEDE") || u.contains("DIRECTORIO")) return "DIRECTORIO";
        if (u.contains("USUARIO") || u.contains("PASSWORD")) return "USUARIOS";
        if (u.contains("CONFIGURACION") || u.contains("ASUETO") || u.contains("BITACORA")) return "CONFIGURACIÓN";
        return "SISTEMA";
    }

    private Map<String, Object> toDto(SystemLog log) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", log.id);
        dto.put("userId", log.user != null ? log.user.id : null);
        dto.put("userName", log.userName != null ? log.userName : "Sistema");
        dto.put("action", log.action != null ? log.action : "");
        dto.put("module", classifyModule(log.action));
        dto.put("details", log.details != null ? log.details : "");
        dto.put("createdAt", log.createdAt != null ? log.createdAt.toString() : null);
        return dto;
    }

    private User resolveCurrentUser() {
        String email = jwtName();
        return email != null ? User.findByEmail(email) : null;
    }

    private String jwtName() {
        return (jwt != null && jwt.getName() != null && !jwt.getName().isBlank()) ? jwt.getName() : null;
    }
}
