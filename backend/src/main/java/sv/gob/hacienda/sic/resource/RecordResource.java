package sv.gob.hacienda.sic.resource;

import io.quarkus.panache.common.Sort;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.eclipse.microprofile.jwt.JsonWebToken;
import sv.gob.hacienda.sic.dto.DeleteRecordRequest;
import sv.gob.hacienda.sic.dto.RecordRequest;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/records")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class RecordResource {

    private static final String STATUS_NO_IDENTIFICADO = "NO IDENTIFICADO";
    private static final String STATUS_IDENTIFICADO_NO_DIST = "IDENTIFICADO / NO DISTRIBUIDO";
    private static final String STATUS_IDENTIFICADO_DIST = "IDENTIFICADO DISTRIBUIDO";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    public List<Record> obtenerTodos() {
        return Record.list(
            "deletedAt is null",
            Sort.descending("depositDate").and("id", Sort.Direction.Descending)
        );
    }

    @GET
    @Path("/{id}")
    public Response obtenerPorId(@PathParam("id") Long id) {
        Record record = findActiveById(id);
        if (record == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Registro no encontrado o ha sido anulado"))
                .build();
        }
        return Response.ok(record).build();
    }

    @POST
    @Transactional
    public Response crear(@Valid @NotNull(message = "Los datos no pueden estar vacíos") RecordRequest data) {
        Record record = new Record();
        Response validationError = populateAndValidateRecord(record, data);
        if (validationError != null) {
            return validationError;
        }

        User user = resolveCurrentUser();
        record.createdBy = user;
        record.updatedBy = user;
        record.persist();

        auditService.log(user, jwtName(), "CREAR_REGISTRO",
                "Registro #" + record.id + " creado por $" + record.depositAmount + " [" + record.status + "]");

        return Response.status(Response.Status.CREATED).entity(record).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response actualizar(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos no pueden estar vacíos") RecordRequest data) {
        Record record = findActiveById(id);
        if (record == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Registro no encontrado o ha sido anulado"))
                .build();
        }

        BigDecimal previousAmount = record.depositAmount;
        String previousStatus = record.status;

        Response validationError = populateAndValidateRecord(record, data);
        if (validationError != null) {
            return validationError;
        }

        User user = resolveCurrentUser();
        record.updatedBy = user;

        auditService.log(user, jwtName(), "EDITAR_REGISTRO",
                "Registro #" + record.id + " modificado (antes: $" + previousAmount + " [" + previousStatus + "], ahora: $"
                        + record.depositAmount + " [" + record.status + "])");

        return Response.ok(record).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response eliminar(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "El motivo de anulación es obligatorio") DeleteRecordRequest body) {
        Record record = findActiveById(id);
        if (record == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Registro no encontrado o ya fue anulado"))
                .build();
        }

        String motivo = InputSanitizer.clean(body.motivo);
        if (motivo == null || motivo.length() < 5) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", "El motivo de anulación debe contener al menos 5 caracteres válidos"))
                .build();
        }

        User user = resolveCurrentUser();
        record.deletedAt = LocalDateTime.now();
        record.deleteReason = motivo;
        record.status = "ANULADO";
        record.updatedBy = user;

        auditService.log(user, jwtName(), "ANULAR_REGISTRO",
                "Registro #" + record.id + " ($" + record.depositAmount + ") anulado. Motivo: " + motivo);

        return Response.ok(Map.of("success", true, "message", "Registro anulado exitosamente")).build();
    }

    @GET
    @Path("/export")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarExcel() {
        List<Record> records = obtenerTodos();
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Ingresos Consulares");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {
                "ID", "Fecha Depósito", "Fecha Concentración", "Días Hábiles", "Región", "País",
                "Embajada/Consulado", "Depósito ($)", "Total Ingresos ($)", "Pasaporte ($)", "DUI ($)",
                "Consular ($)", "Comisión ($)", "Estado"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Record r : records) {
                Row row = sheet.createRow(rowIdx++);
                BigDecimal totalIngreso = scaleMoney(r.passportValue)
                        .add(scaleMoney(r.duiValue))
                        .add(scaleMoney(r.consularValue))
                        .add(scaleMoney(r.commissionValue));

                row.createCell(0).setCellValue(r.id != null ? r.id : 0);
                row.createCell(1).setCellValue(r.depositDate != null ? r.depositDate.format(DATE_FMT) : "-");
                row.createCell(2).setCellValue(r.concentrationDate != null ? r.concentrationDate.format(DATE_FMT) : "-");
                row.createCell(3).setCellValue(r.days != null ? r.days : 0);
                row.createCell(4).setCellValue(r.region != null ? r.region : "-");
                row.createCell(5).setCellValue(r.country != null ? r.country : "-");
                row.createCell(6).setCellValue(r.location != null ? r.location : "NO IDENTIFICADA");
                row.createCell(7).setCellValue(toDouble(r.depositAmount));
                row.createCell(8).setCellValue(toDouble(totalIngreso));
                row.createCell(9).setCellValue(toDouble(r.passportValue));
                row.createCell(10).setCellValue(toDouble(r.duiValue));
                row.createCell(11).setCellValue(toDouble(r.consularValue));
                row.createCell(12).setCellValue(toDouble(r.commissionValue));
                row.createCell(13).setCellValue(formatDisplayStatus(r.status));
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            auditService.log(resolveCurrentUser(), jwtName(), "EXPORTAR_EXCEL",
                    "Exportación de bandeja de ingresos (" + records.size() + " registros)");

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"ingresos_consulares.xlsx\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo generar el archivo Excel"))
                    .build();
        }
    }

    @GET
    @Path("/{id}/pdf")
    @Produces("application/pdf")
    public Response exportarComprobantePdf(@PathParam("id") Long id) {
        Record r = findActiveById(id);
        if (r == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Registro no encontrado"))
                    .build();
        }

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);

            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            BigDecimal totalIngreso = scaleMoney(r.passportValue)
                    .add(scaleMoney(r.duiValue))
                    .add(scaleMoney(r.consularValue))
                    .add(scaleMoney(r.commissionValue));

            String instName = readSetting("INSTITUTION_NAME", "MINISTERIO DE HACIENDA DE EL SALVADOR");
            String deptName = readSetting("DEPARTMENT_NAME", "Direccion General de Tesoreria - Sistema de Ingresos Consulares (SIC)");
            String bankAccount = readSetting("BANK_ACCOUNT_DEFAULT", "00110000112233");
            String bankName = readSetting("BANK_ACCOUNT_NAME", "INGRESOS CONSULARES");
            boolean stampRequired = "true".equalsIgnoreCase(readSetting("STAMP_REQUIRED", "true"));

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = 720;
                writePdfLine(cs, fontBold, 13, 55, y, safePdf(instName.toUpperCase()));
                y -= 18;
                writePdfLine(cs, fontRegular, 10.5f, 55, y, safePdf(deptName));
                y -= 28;
                writePdfLine(cs, fontBold, 13, 55, y, "COMPROBANTE DE REGISTRO DE INGRESO #" + r.id);
                y -= 26;

                String[][] lines = {
                    {"Cuenta Concentradora BCR:", safePdf(bankAccount + " - " + bankName)},
                    {"Estado:", safePdf(formatDisplayStatus(r.status))},
                    {"Fecha de Deposito:", r.depositDate != null ? r.depositDate.format(DATE_FMT) : "-"},
                    {"Fecha de Concentracion BCR:", r.concentrationDate != null ? r.concentrationDate.format(DATE_FMT) : "-"},
                    {"Dias de Concentracion (habiles):", String.valueOf(r.days != null ? r.days : 0)},
                    {"Region:", safePdf(r.region != null ? r.region : "-")},
                    {"Pais:", safePdf(r.country != null ? r.country : "-")},
                    {"Embajada / Consulado:", safePdf(r.location != null ? r.location : "NO IDENTIFICADA")},
                    {"Monto de Deposito:", "$" + money(r.depositAmount)},
                    {"Total Ingresos:", "$" + money(totalIngreso)},
                    {"Valor Pasaporte:", "$" + money(r.passportValue)},
                    {"Valor DUI:", "$" + money(r.duiValue)},
                    {"Valor Consular:", "$" + money(r.consularValue)},
                    {"Comision por Envio:", "$" + money(r.commissionValue)}
                };

                for (String[] pair : lines) {
                    writePdfLine(cs, fontBold, 10, 55, y, pair[0]);
                    writePdfLine(cs, fontRegular, 10, 240, y, pair[1]);
                    y -= 20;
                }

                if (stampRequired) {
                    y -= 24;
                    writePdfLine(cs, fontBold, 9.5f, 55, y, "[ SELLO DE CONTROL INSTITUCIONAL - DGT / SIC ]");
                    y -= 15;
                    writePdfLine(cs, fontRegular, 9f, 55, y, "Documento oficial emitido por el Sistema de Ingresos Consulares.");
                }
            }

            doc.save(out);
            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"ingreso_" + r.id + ".pdf\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo generar el comprobante PDF"))
                    .build();
        }
    }

    private Record findActiveById(Long id) {
        if (id == null || id <= 0) {
            return null;
        }
        return Record.find("id = ?1 and deletedAt is null", id).firstResult();
    }

    private String normalizeStatus(String rawStatus) {
        String cleaned = InputSanitizer.cleanSingleLine(rawStatus);
        if (cleaned == null) {
            return null;
        }
        String upper = cleaned.toUpperCase();
        return switch (upper) {
            case "NO IDENTIFICADO" -> STATUS_NO_IDENTIFICADO;
            case "IDENTIFICADO / NO DISTRIBUIDO", "IDENTIFICADO NO DISTRIBUIDO" -> STATUS_IDENTIFICADO_NO_DIST;
            case "IDENTIFICADO DISTRIBUIDO" -> STATUS_IDENTIFICADO_DIST;
            default -> null;
        };
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

    private Set<LocalDate> loadCustomHolidays() {
        SystemSetting setting = SystemSetting.findById("CUSTOM_HOLIDAYS");
        return setting != null ? BusinessDayCalculator.parseCustomHolidays(setting.settingValue) : Set.of();
    }

    private String readSetting(String key, String fallback) {
        SystemSetting setting = SystemSetting.findById(key);
        if (setting != null && setting.settingValue != null && !setting.settingValue.isBlank()) {
            return setting.settingValue;
        }
        return fallback;
    }

    private Response populateAndValidateRecord(Record record, RecordRequest data) {
        String normalizedStatus = normalizeStatus(data.status);
        if (normalizedStatus == null) {
            return badRequest("Estado de ingreso no permitido");
        }

        if (data.concentrationDate != null && data.concentrationDate.isBefore(data.depositDate)) {
            return badRequest("La fecha de concentración no puede ser anterior a la fecha de depósito");
        }

        record.depositDate = data.depositDate;
        record.depositAmount = scaleMoney(data.depositAmount);
        record.concentrationDate = data.concentrationDate;
        record.days = data.concentrationDate != null
                ? BusinessDayCalculator.countBusinessDays(data.depositDate, data.concentrationDate, loadCustomHolidays())
                : 0;
        record.status = normalizedStatus;
        record.diversosValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (STATUS_NO_IDENTIFICADO.equals(normalizedStatus)) {
            record.region = null;
            record.country = null;
            record.location = null;
            resetDistribution(record);
            return null;
        }

        String region = InputSanitizer.cleanSingleLine(data.region);
        String country = InputSanitizer.cleanSingleLine(data.country);
        String location = InputSanitizer.cleanSingleLine(data.location);

        if (region == null || country == null || location == null) {
            return badRequest("Región, país y embajada/consulado son obligatorios para ingresos identificados");
        }

        record.region = region;
        record.country = country;
        record.location = location;

        if (STATUS_IDENTIFICADO_NO_DIST.equals(normalizedStatus)) {
            resetDistribution(record);
            return null;
        }

        // Estado: IDENTIFICADO DISTRIBUIDO
        record.passportValue = scaleMoney(data.passportValue);
        record.duiValue = scaleMoney(data.duiValue);
        record.consularValue = scaleMoney(data.consularValue);

        BigDecimal subtotalTramites = record.passportValue
                .add(record.duiValue)
                .add(record.consularValue);

        if (subtotalTramites.compareTo(BigDecimal.ZERO) <= 0) {
            return badRequest("Un ingreso distribuido debe tener al menos un monto mayor a $0.00 en Pasaporte, DUI o Valor Consular");
        }

        BigDecimal totalIncome = data.totalIncome != null && data.totalIncome.compareTo(BigDecimal.ZERO) > 0
                ? scaleMoney(data.totalIncome)
                : subtotalTramites.add(scaleMoney(data.commissionValue));

        if (subtotalTramites.compareTo(totalIncome) > 0) {
            return badRequest("La suma de Pasaporte, DUI y Valor Consular ($" + subtotalTramites
                    + ") no puede superar el Total de Ingresos ($" + totalIncome + ")");
        }

        record.commissionValue = totalIncome.subtract(subtotalTramites).setScale(2, RoundingMode.HALF_UP);
        return null;
    }

    private void resetDistribution(Record record) {
        record.passportValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        record.duiValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        record.consularValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        record.commissionValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        record.diversosValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal scaleMoney(BigDecimal val) {
        return val != null ? val.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private double toDouble(BigDecimal val) {
        return val != null ? val.doubleValue() : 0.0;
    }

    private String money(BigDecimal val) {
        return scaleMoney(val).toPlainString();
    }

    private String safePdf(String text) {
        if (text == null) {
            return "";
        }
        return text.replaceAll("[^\\x20-\\x7E\\xA0-\\xFF]", "");
    }

    private void writePdfLine(PDPageContentStream cs, PDType1Font font, float size, float x, float y, String text)
            throws Exception {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text);
        cs.endText();
    }

    private Response badRequest(String msg) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", msg))
                .build();
    }

    private User resolveCurrentUser() {
        String email = jwtName();
        return email != null ? User.findByEmail(email) : null;
    }

    private String jwtName() {
        return (jwt != null && jwt.getName() != null && !jwt.getName().isBlank()) ? jwt.getName() : null;
    }
}
