package sv.gob.hacienda.sic.resource;

import io.quarkus.panache.common.Sort;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
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
import sv.gob.hacienda.sic.entity.InformeCaja;
import sv.gob.hacienda.sic.entity.Record;
import sv.gob.hacienda.sic.entity.ReportHistory;
import sv.gob.hacienda.sic.entity.SystemLog;
import sv.gob.hacienda.sic.entity.SystemSetting;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/reports")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class ReportResource {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private static final String[] MONTH_NAMES = {
        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    };

    private static final Set<String> ALLOWED_INFORME_STATUSES = Set.of("PRELIMINAR", "DEFINITIVO", "ANULADO");

    public static class CreateInformeRequest {
        @NotNull(message = "El mes del informe es obligatorio")
        @Min(value = 1, message = "El mes debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes debe estar entre 1 y 12")
        public Integer month;

        @NotNull(message = "El año del informe es obligatorio")
        @Min(value = 2020, message = "El año debe ser mayor o igual a 2020")
        @Max(value = 2100, message = "El año no puede superar 2100")
        public Integer year;

        @DecimalMin(value = "0.00", message = "El saldo anterior no puede ser negativo")
        public BigDecimal saldoAnterior;

        @Size(max = 500, message = "Las observaciones no pueden exceder 500 caracteres")
        public String observaciones;
    }

    public static class InformeStatusRequest {
        @NotBlank(message = "El nuevo estado es obligatorio")
        public String status;

        @NotBlank(message = "Debe ingresar la justificación obligatoria del cambio de estado")
        @Size(min = 5, max = 500, message = "La justificación debe contener entre 5 y 500 caracteres")
        public String reason;
    }

    private static class SedeAccumulator {
        String region;
        String country;
        String location;
        int recordCount = 0;
        BigDecimal depositAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal passportValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal duiValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal consularValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal commissionValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal pendingAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private static class MonthAccumulator {
        int year;
        int month;
        int recordCount = 0;
        BigDecimal depositAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal passportValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal duiValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal consularValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal commissionValue = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal pendingAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    @Path("/summary")
    public Response obtenerResumenConsolidado(
            @QueryParam("year") Integer year,
            @QueryParam("month") Integer month,
            @QueryParam("dateType") String dateType,
            @QueryParam("dateFrom") String dateFrom,
            @QueryParam("dateTo") String dateTo,
            @QueryParam("region") String region,
            @QueryParam("country") String country,
            @QueryParam("location") String location,
            @QueryParam("status") String status
    ) {
        List<Record> records;
        try {
            records = queryFilteredRecords(year, month, dateType, dateFrom, dateTo, region, country, location, status);
        } catch (IllegalArgumentException ex) {
            return badRequest(ex.getMessage());
        }

        Map<String, Object> payload = buildAggregationPayload(records);
        payload.put("periodLabel", describePeriod(year, month, dateFrom, dateTo));
        return Response.ok(payload).build();
    }

    @GET
    @Path("/export/excel")
    @Transactional
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarConsolidadoExcel(
            @QueryParam("reportType") String reportTypeParam,
            @QueryParam("year") Integer year,
            @QueryParam("month") Integer month,
            @QueryParam("dateType") String dateType,
            @QueryParam("dateFrom") String dateFrom,
            @QueryParam("dateTo") String dateTo,
            @QueryParam("region") String region,
            @QueryParam("country") String country,
            @QueryParam("location") String location,
            @QueryParam("status") String status
    ) {
        List<Record> records;
        try {
            records = queryFilteredRecords(year, month, dateType, dateFrom, dateTo, region, country, location, status);
        } catch (IllegalArgumentException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }

        String reportType = sanitizeReportType(reportTypeParam);
        String periodDesc = describePeriod(year, month, dateFrom, dateTo);
        Map<String, Object> agg = buildAggregationPayload(records);
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) agg.get("totals");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> byConsulate = (List<Map<String, Object>>) agg.get("byConsulate");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> byMonth = (List<Map<String, Object>>) agg.get("byMonth");

        String instName = readSetting("INSTITUTION_NAME", "Ministerio de Hacienda - Dirección General de Tesorería");
        String deptName = readSetting("DEPARTMENT_NAME", "División de Fondos Ajenos en Custodia - Ingresos Consulares");
        String bankAcc = readSetting("BANK_ACCOUNT_DEFAULT", "00110000112233") + " - "
                + readSetting("BANK_ACCOUNT_NAME", "INGRESOS CONSULARES");

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle titleStyle = wb.createCellStyle();
            Font titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 12);
            titleStyle.setFont(titleFont);

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = wb.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            // Hoja 1: Resumen Ejecutivo
            Sheet s1 = wb.createSheet("Resumen Ejecutivo");
            Row r0 = s1.createRow(0);
            Cell c0 = r0.createCell(0);
            c0.setCellValue(instName.toUpperCase());
            c0.setCellStyle(titleStyle);
            s1.createRow(1).createCell(0).setCellValue(deptName);
            s1.createRow(2).createCell(0).setCellValue("Cuenta Concentradora BCR: " + bankAcc);
            s1.createRow(3).createCell(0).setCellValue("Período Consultado: " + periodDesc + " | Emitido: " + LocalDateTime.now().format(DT_FMT));

            Row h1 = s1.createRow(5);
            Cell hc0 = h1.createCell(0);
            hc0.setCellValue("Concepto Financiero / Operativo");
            hc0.setCellStyle(headerStyle);
            Cell hc1 = h1.createCell(1);
            hc1.setCellValue("Valor / Monto (USD)");
            hc1.setCellStyle(headerStyle);

            Object[][] kpis = {
                {"Total Registros en el Período", totals.get("recordCount")},
                {"Registros Identificados Distribuidos", totals.get("distributedCount")},
                {"Registros Identificados / No Distribuidos", totals.get("undistributedCount")},
                {"Registros No Identificados", totals.get("unidentifiedCount")},
                {"Monto Total Depositado ($)", totals.get("totalDepositAmount")},
                {"Total Ingresos Distribuidos ($)", totals.get("totalIncome")},
                {"Valor Pasaporte ($)", totals.get("totalPassport")},
                {"Valor DUI ($)", totals.get("totalDui")},
                {"Valor Consular ($)", totals.get("totalConsular")},
                {"Comisión por Envío ($)", totals.get("totalCommission")},
                {"Saldo Pendiente por Identificar / Distribuir ($)", totals.get("pendingBalance")}
            };
            int idx = 6;
            for (Object[] pair : kpis) {
                Row row = s1.createRow(idx++);
                row.createCell(0).setCellValue(String.valueOf(pair[0]));
                if (pair[1] instanceof Number n) {
                    row.createCell(1).setCellValue(n.doubleValue());
                } else {
                    row.createCell(1).setCellValue(String.valueOf(pair[1]));
                }
            }
            s1.autoSizeColumn(0);
            s1.autoSizeColumn(1);

            // Hoja 2: Consolidado por Sede
            Sheet s2 = wb.createSheet("Consolidado por Sede");
            String[] sedeHeaders = {
                "#", "Región", "País", "Embajada / Consulado", "Registros",
                "Monto Depositado ($)", "Total Ingresos ($)", "Pasaporte ($)",
                "DUI ($)", "Valor Consular ($)", "Comisión ($)", "Pendiente ($)"
            };
            Row sh = s2.createRow(0);
            for (int i = 0; i < sedeHeaders.length; i++) {
                Cell cell = sh.createCell(i);
                cell.setCellValue(sedeHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            int sRowIdx = 1;
            for (Map<String, Object> item : byConsulate) {
                Row row = s2.createRow(sRowIdx);
                row.createCell(0).setCellValue(sRowIdx++);
                row.createCell(1).setCellValue(String.valueOf(item.get("region")));
                row.createCell(2).setCellValue(String.valueOf(item.get("country")));
                row.createCell(3).setCellValue(String.valueOf(item.get("location")));
                row.createCell(4).setCellValue(((Number) item.get("recordCount")).intValue());
                row.createCell(5).setCellValue(((Number) item.get("depositAmount")).doubleValue());
                row.createCell(6).setCellValue(((Number) item.get("totalIncome")).doubleValue());
                row.createCell(7).setCellValue(((Number) item.get("passportValue")).doubleValue());
                row.createCell(8).setCellValue(((Number) item.get("duiValue")).doubleValue());
                row.createCell(9).setCellValue(((Number) item.get("consularValue")).doubleValue());
                row.createCell(10).setCellValue(((Number) item.get("commissionValue")).doubleValue());
                row.createCell(11).setCellValue(((Number) item.get("pendingAmount")).doubleValue());
            }
            for (int i = 0; i < sedeHeaders.length; i++) {
                s2.autoSizeColumn(i);
            }

            // Hoja 3: Consolidado Mensual
            Sheet s3 = wb.createSheet("Consolidado Mensual");
            String[] monthHeaders = {
                "Período", "Registros", "Depositado ($)", "Total Ingresos ($)",
                "Pasaporte ($)", "DUI ($)", "Valor Consular ($)", "Comisión ($)", "Pendiente ($)"
            };
            Row mh = s3.createRow(0);
            for (int i = 0; i < monthHeaders.length; i++) {
                Cell cell = mh.createCell(i);
                cell.setCellValue(monthHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            int mRowIdx = 1;
            for (Map<String, Object> m : byMonth) {
                Row row = s3.createRow(mRowIdx++);
                row.createCell(0).setCellValue(String.valueOf(m.get("periodLabel")));
                row.createCell(1).setCellValue(((Number) m.get("recordCount")).intValue());
                row.createCell(2).setCellValue(((Number) m.get("depositAmount")).doubleValue());
                row.createCell(3).setCellValue(((Number) m.get("totalIncome")).doubleValue());
                row.createCell(4).setCellValue(((Number) m.get("passportValue")).doubleValue());
                row.createCell(5).setCellValue(((Number) m.get("duiValue")).doubleValue());
                row.createCell(6).setCellValue(((Number) m.get("consularValue")).doubleValue());
                row.createCell(7).setCellValue(((Number) m.get("commissionValue")).doubleValue());
                row.createCell(8).setCellValue(((Number) m.get("pendingAmount")).doubleValue());
            }
            for (int i = 0; i < monthHeaders.length; i++) {
                s3.autoSizeColumn(i);
            }

            // Hoja 4: Detalle de Ingresos
            Sheet s4 = wb.createSheet("Detalle de Ingresos");
            String[] detHeaders = {
                "ID", "Fecha Depósito", "Fecha Concentración", "Días Hábiles", "Región", "País",
                "Embajada / Consulado", "Depósito ($)", "Total Ingresos ($)", "Pasaporte ($)",
                "DUI ($)", "Valor Consular ($)", "Comisión ($)", "Estado"
            };
            Row dh = s4.createRow(0);
            for (int i = 0; i < detHeaders.length; i++) {
                Cell cell = dh.createCell(i);
                cell.setCellValue(detHeaders[i]);
                cell.setCellStyle(headerStyle);
            }
            int dIdx = 1;
            for (Record r : records) {
                Row row = s4.createRow(dIdx++);
                BigDecimal totalIng = scale(r.passportValue).add(scale(r.duiValue)).add(scale(r.consularValue)).add(scale(r.commissionValue));
                row.createCell(0).setCellValue(r.id != null ? r.id : 0L);
                row.createCell(1).setCellValue(r.depositDate != null ? r.depositDate.format(DATE_FMT) : "-");
                row.createCell(2).setCellValue(r.concentrationDate != null ? r.concentrationDate.format(DATE_FMT) : "-");
                row.createCell(3).setCellValue(r.days != null ? r.days : 0);
                row.createCell(4).setCellValue(r.region != null ? r.region : "-");
                row.createCell(5).setCellValue(r.country != null ? r.country : "-");
                row.createCell(6).setCellValue(r.location != null ? r.location : "NO IDENTIFICADA");
                row.createCell(7).setCellValue(scale(r.depositAmount).doubleValue());
                row.createCell(8).setCellValue(totalIng.doubleValue());
                row.createCell(9).setCellValue(scale(r.passportValue).doubleValue());
                row.createCell(10).setCellValue(scale(r.duiValue).doubleValue());
                row.createCell(11).setCellValue(scale(r.consularValue).doubleValue());
                row.createCell(12).setCellValue(scale(r.commissionValue).doubleValue());
                row.createCell(13).setCellValue(formatDisplayStatus(r.status));
            }
            for (int i = 0; i < detHeaders.length; i++) {
                s4.autoSizeColumn(i);
            }

            wb.write(out);

            String fileName = buildReportFileName(reportType, year, month, "xlsx");
            recordReportHistory(reportType, year, month, "EXCEL", fileName);
            auditService.log(resolveCurrentUser(), jwtName(), "GENERAR_REPORTE_EXCEL",
                    "Reporte Excel generado (" + reportType + " | " + periodDesc + " | " + records.size() + " registros)");

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo generar el reporte consolidado Excel"))
                    .build();
        }
    }

    @GET
    @Path("/export/pdf")
    @Transactional
    @Produces("application/pdf")
    public Response exportarConsolidadoPdf(
            @QueryParam("reportType") String reportTypeParam,
            @QueryParam("year") Integer year,
            @QueryParam("month") Integer month,
            @QueryParam("dateType") String dateType,
            @QueryParam("dateFrom") String dateFrom,
            @QueryParam("dateTo") String dateTo,
            @QueryParam("region") String region,
            @QueryParam("country") String country,
            @QueryParam("location") String location,
            @QueryParam("status") String status
    ) {
        List<Record> records;
        try {
            records = queryFilteredRecords(year, month, dateType, dateFrom, dateTo, region, country, location, status);
        } catch (IllegalArgumentException ex) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", ex.getMessage()))
                    .build();
        }

        String reportType = sanitizeReportType(reportTypeParam);
        String periodDesc = describePeriod(year, month, dateFrom, dateTo);
        Map<String, Object> agg = buildAggregationPayload(records);
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) agg.get("totals");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> byConsulate = (List<Map<String, Object>>) agg.get("byConsulate");

        String instName = readSetting("INSTITUTION_NAME", "MINISTERIO DE HACIENDA DE EL SALVADOR");
        String deptName = readSetting("DEPARTMENT_NAME", "Dirección General de Tesorería - Sistema de Ingresos Consulares");
        String bankAcc = readSetting("BANK_ACCOUNT_DEFAULT", "00110000112233") + " - "
                + readSetting("BANK_ACCOUNT_NAME", "INGRESOS CONSULARES");
        boolean stampRequired = "true".equalsIgnoreCase(readSetting("STAMP_REQUIRED", "true"));

        PDRectangle landscape = new PDRectangle(PDRectangle.LETTER.getHeight(), PDRectangle.LETTER.getWidth());

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            PDPage page = new PDPage(landscape);
            doc.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(doc, page);

            float y = 565f;
            writePdfLine(cs, fontBold, 13f, 40f, y, safePdf(instName.toUpperCase()));
            y -= 16f;
            writePdfLine(cs, fontRegular, 10f, 40f, y, safePdf(deptName));
            y -= 15f;
            writePdfLine(cs, fontBold, 11f, 40f, y, "REPORTE CONSOLIDADO DE INGRESOS CONSULARES (" + safePdf(reportType) + ")");
            y -= 14f;
            writePdfLine(cs, fontRegular, 9.5f, 40f, y, safePdf("Cuenta Concentradora BCR: " + bankAcc + "   |   Periodo: " + periodDesc + "   |   Emision: " + LocalDateTime.now().format(DT_FMT)));
            y -= 20f;

            // Resumen Ejecutivo Superior
            writePdfLine(cs, fontBold, 9.5f, 40f, y, safePdf(String.format(
                    "RESUMEN: Registros: %s  |  Depositado: $%s  |  Ingresos Distribuidos: $%s  |  Pendiente Identif./Dist.: $%s",
                    totals.get("recordCount"),
                    fmtMoneyObj(totals.get("totalDepositAmount")),
                    fmtMoneyObj(totals.get("totalIncome")),
                    fmtMoneyObj(totals.get("pendingBalance"))
            )));
            y -= 14f;
            writePdfLine(cs, fontRegular, 9f, 40f, y, safePdf(String.format(
                    "DESGLOSE DISTRIBUIDO: Pasaporte: $%s   |   DUI: $%s   |   Valor Consular: $%s   |   Comision por Envio: $%s",
                    fmtMoneyObj(totals.get("totalPassport")),
                    fmtMoneyObj(totals.get("totalDui")),
                    fmtMoneyObj(totals.get("totalConsular")),
                    fmtMoneyObj(totals.get("totalCommission"))
            )));
            y -= 20f;

            // Encabezado de tabla consolidada por sede
            drawPdfTableHeader(cs, fontBold, y);
            y -= 16f;

            int rowNum = 1;
            for (Map<String, Object> item : byConsulate) {
                if (y < 65f) {
                    if (stampRequired) {
                        writePdfLine(cs, fontBold, 8.5f, 40f, 36f, "[ SELLO DE CONTROL INSTITUCIONAL - DGT / SIC ]");
                    }
                    cs.close();
                    page = new PDPage(landscape);
                    doc.addPage(page);
                    cs = new PDPageContentStream(doc, page);
                    y = 565f;
                    writePdfLine(cs, fontBold, 10.5f, 40f, y, safePdf(instName.toUpperCase() + " — CONTINUACION REPORTE CONSOLIDADO"));
                    y -= 20f;
                    drawPdfTableHeader(cs, fontBold, y);
                    y -= 16f;
                }

                String sedeLabel = truncate(item.get("country") + " - " + item.get("location"), 38);
                writePdfLine(cs, fontRegular, 8.5f, 40f, y, String.valueOf(rowNum++));
                writePdfLine(cs, fontRegular, 8.5f, 65f, y, safePdf(truncate(String.valueOf(item.get("region")), 16)));
                writePdfLine(cs, fontRegular, 8.5f, 165f, y, safePdf(sedeLabel));
                writePdfLine(cs, fontRegular, 8.5f, 365f, y, String.valueOf(item.get("recordCount")));
                writePdfLine(cs, fontRegular, 8.5f, 405f, y, "$" + fmtMoneyObj(item.get("depositAmount")));
                writePdfLine(cs, fontRegular, 8.5f, 480f, y, "$" + fmtMoneyObj(item.get("passportValue")));
                writePdfLine(cs, fontRegular, 8.5f, 545f, y, "$" + fmtMoneyObj(item.get("duiValue")));
                writePdfLine(cs, fontRegular, 8.5f, 605f, y, "$" + fmtMoneyObj(item.get("consularValue")));
                writePdfLine(cs, fontRegular, 8.5f, 670f, y, "$" + fmtMoneyObj(item.get("commissionValue")));
                writePdfLine(cs, fontRegular, 8.5f, 730f, y, "$" + fmtMoneyObj(item.get("pendingAmount")));
                y -= 14f;
            }

            if (stampRequired) {
                float stampY = Math.max(36f, y - 18f);
                writePdfLine(cs, fontBold, 9f, 40f, stampY, "[ SELLO DE CONTROL INSTITUCIONAL - DGT / SIC ]  Documento oficial auditable.");
            }
            cs.close();

            doc.save(out);

            String fileName = buildReportFileName(reportType, year, month, "pdf");
            recordReportHistory(reportType, year, month, "PDF", fileName);
            auditService.log(resolveCurrentUser(), jwtName(), "GENERAR_REPORTE_PDF",
                    "Reporte PDF generado (" + reportType + " | " + periodDesc + " | " + records.size() + " registros)");

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo generar el reporte consolidado PDF"))
                    .build();
        }
    }

    // =========================================================================
    // CIERRES / INFORMES MENSUALES DE CAJA (informes_caja)
    // =========================================================================

    @GET
    @Path("/informes")
    public List<Map<String, Object>> listarInformesCaja() {
        List<InformeCaja> list = InformeCaja.find("ORDER BY year DESC, month DESC, id DESC").list();
        return list.stream().map(this::toInformeDto).toList();
    }

    @POST
    @Path("/informes")
    @Transactional
    public Response generarInformeMensual(@Valid CreateInformeRequest req) {
        if (req == null) {
            return badRequest("Datos del informe mensual inválidos");
        }
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "Sesión no válida"))
                    .build();
        }

        // Verificar si ya existe un informe activo para ese mes/año
        InformeCaja existing = InformeCaja.find(
                "year = ?1 and month = ?2 and status <> 'ANULADO' ORDER BY id DESC",
                req.year, req.month
        ).firstResult();

        if (existing != null && "DEFINITIVO".equalsIgnoreCase(existing.status)) {
            return badRequest("Ya existe un Informe de Caja DEFINITIVO (" + existing.correlative
                    + ") para " + monthName(req.month) + " " + req.year
                    + ". Si requiere recalcularlo, cambie primero su estado con la justificación correspondiente.");
        }

        YearMonth ym = YearMonth.of(req.year, req.month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();

        List<Record> monthRecords = Record.find(
                "deletedAt is null and depositDate >= ?1 and depositDate <= ?2",
                start, end
        ).list();

        BigDecimal totalDepositos = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPasaporte = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalDui = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalConsulares = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalComision = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal saldoPendiente = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (Record r : monthRecords) {
            BigDecimal dep = scale(r.depositAmount);
            totalDepositos = totalDepositos.add(dep);
            if ("IDENTIFICADO DISTRIBUIDO".equalsIgnoreCase(r.status)) {
                totalPasaporte = totalPasaporte.add(scale(r.passportValue));
                totalDui = totalDui.add(scale(r.duiValue));
                totalConsulares = totalConsulares.add(scale(r.consularValue));
                totalComision = totalComision.add(scale(r.commissionValue));
            } else {
                saldoPendiente = saldoPendiente.add(dep);
            }
        }

        String bankAccount = readSetting("BANK_ACCOUNT_DEFAULT", "00110000112233");
        BigDecimal saldoAnterior = scale(req.saldoAnterior);
        String obs = InputSanitizer.clean(req.observaciones);

        boolean isUpdate = existing != null;
        InformeCaja target = isUpdate ? existing : new InformeCaja();
        target.bankAccount = bankAccount;
        target.month = req.month;
        target.year = req.year;
        target.saldoAnterior = saldoAnterior;
        target.totalDepositos = totalDepositos;
        target.totalPasaporte = totalPasaporte;
        target.totalDui = totalDui;
        target.totalConsulares = totalConsulares;
        target.totalComision = totalComision;
        target.totalDiversos = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        target.saldoPendiente = saldoPendiente;
        target.status = "PRELIMINAR";
        target.observaciones = obs;
        target.user = currentUser;

        if (!isUpdate) {
            long seq = InformeCaja.count("year = ?1", req.year) + 1;
            target.correlative = String.format("IC-%d-%02d-%03d", req.year, req.month, seq);
            target.persist();
        }

        for (Record r : monthRecords) {
            r.informeCaja = target;
        }

        auditService.log(
                currentUser,
                jwtName(),
                isUpdate ? "RECALCULAR_INFORME_CAJA" : "CREAR_INFORME_CAJA",
                (isUpdate ? "Informe de Caja recalculado #" : "Informe de Caja generado #") + target.id
                        + " (" + target.correlative + " - " + monthName(target.month) + " " + target.year
                        + ") | Depósitos: $" + totalDepositos.toPlainString()
                        + " | Pendiente: $" + saldoPendiente.toPlainString()
        );

        return Response.status(isUpdate ? Response.Status.OK : Response.Status.CREATED)
                .entity(toInformeDto(target))
                .build();
    }

    @PUT
    @Path("/informes/{id}/status")
    @Transactional
    public Response cambiarEstadoInforme(
            @PathParam("id") Long id,
            @Valid InformeStatusRequest req
    ) {
        if (id == null || id <= 0) {
            return badRequest("Identificador de informe inválido");
        }
        InformeCaja informe = InformeCaja.findById(id);
        if (informe == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Informe de Caja no encontrado"))
                    .build();
        }

        String nextStatus = InputSanitizer.cleanSingleLine(req.status);
        String reason = InputSanitizer.clean(req.reason);

        if (nextStatus == null || !ALLOWED_INFORME_STATUSES.contains(nextStatus.toUpperCase())) {
            return badRequest("Estado no válido. Use PRELIMINAR, DEFINITIVO o ANULADO.");
        }
        if (reason == null || reason.length() < 5) {
            return badRequest("Es obligatorio ingresar una justificación de al menos 5 caracteres.");
        }

        String normalized = nextStatus.toUpperCase();
        String previous = informe.status;
        informe.status = normalized;
        informe.observaciones = reason;

        if ("ANULADO".equals(normalized)) {
            List<Record> linked = Record.find("informeCaja.id = ?1", informe.id).list();
            for (Record r : linked) {
                r.informeCaja = null;
            }
        }

        auditService.log(
                resolveCurrentUser(),
                jwtName(),
                "ESTADO_INFORME_CAJA",
                "Informe #" + informe.id + " (" + informe.correlative + ") cambió de "
                        + previous + " a " + normalized + ". Motivo: " + reason
        );

        return Response.ok(toInformeDto(informe)).build();
    }

    @GET
    @Path("/informes/{id}/history")
    public Response historialInforme(@PathParam("id") Long id) {
        if (id == null || id <= 0) {
            return badRequest("ID inválido");
        }
        InformeCaja informe = InformeCaja.findById(id);
        if (informe == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Informe no encontrado"))
                    .build();
        }
        String token1 = "Informe #" + id + " ";
        String token2 = "#" + id + " (" + informe.correlative;
        List<SystemLog> logs = SystemLog.find(
                "(details LIKE ?1 OR details LIKE ?2) ORDER BY createdAt DESC, id DESC",
                "%" + token1 + "%", "%" + token2 + "%"
        ).page(0, 50).list();

        List<Map<String, Object>> out = logs.stream().map(l -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", l.id);
            m.put("userName", l.userName != null ? l.userName : "Sistema");
            m.put("action", l.action);
            m.put("details", l.details);
            m.put("createdAt", l.createdAt != null ? l.createdAt.toString() : null);
            return m;
        }).toList();

        return Response.ok(out).build();
    }

    @GET
    @Path("/informes/{id}/pdf")
    @Transactional
    @Produces("application/pdf")
    public Response descargarInformeCajaPdf(@PathParam("id") Long id) {
        if (id == null || id <= 0) {
            return badRequest("ID inválido");
        }
        InformeCaja inf = InformeCaja.findById(id);
        if (inf == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Informe de Caja no encontrado"))
                    .build();
        }

        String instName = readSetting("INSTITUTION_NAME", "MINISTERIO DE HACIENDA DE EL SALVADOR");
        String deptName = readSetting("DEPARTMENT_NAME", "Dirección General de Tesorería - Ingresos Consulares");
        String bankName = readSetting("BANK_ACCOUNT_NAME", "INGRESOS CONSULARES");
        boolean stampRequired = "true".equalsIgnoreCase(readSetting("STAMP_REQUIRED", "true"));

        BigDecimal totalDistribuido = scale(inf.totalPasaporte)
                .add(scale(inf.totalDui))
                .add(scale(inf.totalConsulares))
                .add(scale(inf.totalComision));

        BigDecimal disponibilidadTotal = scale(inf.saldoAnterior).add(scale(inf.totalDepositos));

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);

            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float y = 720f;
                writePdfLine(cs, fontBold, 13.5f, 55f, y, safePdf(instName.toUpperCase()));
                y -= 17f;
                writePdfLine(cs, fontRegular, 10.5f, 55f, y, safePdf(deptName));
                y -= 26f;
                writePdfLine(cs, fontBold, 13f, 55f, y, safePdf("INFORME MENSUAL DE CAJA — " + inf.correlative + " [" + inf.status + "]"));
                y -= 24f;

                String[][] rows = {
                    {"Periodo Fiscal:", monthName(inf.month) + " " + inf.year},
                    {"Cuenta Concentradora BCR:", safePdf(inf.bankAccount + " - " + bankName)},
                    {"Estado del Cierre:", safePdf(inf.status)},
                    {"Elaborado por:", safePdf(inf.user != null ? inf.user.name : "Sistema")},
                    {"Fecha de Emision:", LocalDateTime.now().format(DT_FMT)},
                    {"----------------------------------------", "----------------------------------------"},
                    {"(+) Saldo Anterior Pendiente:", "$" + scale(inf.saldoAnterior).toPlainString()},
                    {"(+) Total Depositos del Mes:", "$" + scale(inf.totalDepositos).toPlainString()},
                    {"(=) Total Disponibilidad en Cuenta:", "$" + disponibilidadTotal.toPlainString()},
                    {"----------------------------------------", "----------------------------------------"},
                    {"(-) Ingresos por Pasaporte:", "$" + scale(inf.totalPasaporte).toPlainString()},
                    {"(-) Ingresos por DUI:", "$" + scale(inf.totalDui).toPlainString()},
                    {"(-) Derechos Consulares:", "$" + scale(inf.totalConsulares).toPlainString()},
                    {"(-) Comisiones por Envio:", "$" + scale(inf.totalComision).toPlainString()},
                    {"(=) Total Ingresos Distribuidos:", "$" + totalDistribuido.toPlainString()},
                    {"----------------------------------------", "----------------------------------------"},
                    {"(=) Saldo Pendiente por Identificar/Distribuir:", "$" + scale(inf.saldoPendiente).toPlainString()},
                    {"Observaciones / Justificacion:", safePdf(inf.observaciones != null ? truncate(inf.observaciones, 65) : "Sin observaciones")}
                };

                for (String[] pair : rows) {
                    writePdfLine(cs, fontBold, 10f, 55f, y, pair[0]);
                    writePdfLine(cs, fontRegular, 10f, 305f, y, pair[1]);
                    y -= 19f;
                }

                if (stampRequired) {
                    y -= 24f;
                    writePdfLine(cs, fontBold, 9.5f, 55f, y, "[ SELLO DE CONTROL INSTITUCIONAL - DGT / SIC ]");
                    y -= 14f;
                    writePdfLine(cs, fontRegular, 9f, 55f, y, "Certificacion emitida desde el Sistema de Ingresos Consulares (SIC).");
                }
            }

            doc.save(out);
            String fileName = (inf.correlative != null ? inf.correlative.toLowerCase() : "informe_caja_" + inf.id) + ".pdf";
            recordReportHistory("INFORME_CAJA", inf.year, inf.month, "PDF", fileName);
            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo generar el PDF del Informe de Caja"))
                    .build();
        }
    }

    @GET
    @Path("/history")
    public List<Map<String, Object>> listarHistorialDescargas() {
        List<ReportHistory> list = ReportHistory.find("ORDER BY createdAt DESC, id DESC").page(0, 100).list();
        return list.stream().map(h -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", h.id);
            m.put("reportType", h.reportType);
            m.put("periodMonth", h.periodMonth);
            m.put("periodYear", h.periodYear);
            m.put("periodLabel", h.periodMonth != null && h.periodMonth > 0
                    ? monthName(h.periodMonth) + " " + h.periodYear
                    : "Año " + h.periodYear);
            m.put("status", h.status);
            m.put("format", h.format);
            m.put("fileName", h.fileName);
            m.put("userName", h.user != null ? h.user.name : "Sistema");
            m.put("createdAt", h.createdAt != null ? h.createdAt.toString() : null);
            return m;
        }).toList();
    }

    // =========================================================================
    // MÉTODOS AUXILIARES Y CONSULTAS PARAMETRIZADAS
    // =========================================================================

    private List<Record> queryFilteredRecords(
            Integer year,
            Integer month,
            String dateTypeParam,
            String dateFromParam,
            String dateToParam,
            String regionParam,
            String countryParam,
            String locationParam,
            String statusParam
    ) {
        List<String> clauses = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        int idx = 1;

        clauses.add("deletedAt is null");

        String dateField = "concentracion".equalsIgnoreCase(InputSanitizer.cleanSingleLine(dateTypeParam))
                ? "concentrationDate"
                : "depositDate";

        String cleanFrom = InputSanitizer.cleanSingleLine(dateFromParam);
        String cleanTo = InputSanitizer.cleanSingleLine(dateToParam);

        if (cleanFrom != null || cleanTo != null) {
            LocalDate from = null;
            if (cleanFrom != null) {
                try {
                    from = LocalDate.parse(cleanFrom);
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("Fecha inicial inválida (use YYYY-MM-DD)");
                }
                clauses.add(dateField + " >= ?" + idx++);
                params.add(from);
            }
            if (cleanTo != null) {
                LocalDate to;
                try {
                    to = LocalDate.parse(cleanTo);
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("Fecha final inválida (use YYYY-MM-DD)");
                }
                if (from != null && to.isBefore(from)) {
                    throw new IllegalArgumentException("La fecha final no puede ser anterior a la inicial");
                }
                clauses.add(dateField + " <= ?" + idx++);
                params.add(to);
            }
        } else if (year != null && year > 0) {
            if (year < 2000 || year > 2100) {
                throw new IllegalArgumentException("Año de consulta fuera de rango permitido");
            }
            if (month != null && month >= 1 && month <= 12) {
                YearMonth ym = YearMonth.of(year, month);
                clauses.add(dateField + " >= ?" + idx++);
                params.add(ym.atDay(1));
                clauses.add(dateField + " <= ?" + idx++);
                params.add(ym.atEndOfMonth());
            } else {
                clauses.add(dateField + " >= ?" + idx++);
                params.add(LocalDate.of(year, 1, 1));
                clauses.add(dateField + " <= ?" + idx++);
                params.add(LocalDate.of(year, 12, 31));
            }
        }

        String region = InputSanitizer.cleanSingleLine(regionParam);
        if (region != null && !"ALL".equalsIgnoreCase(region)) {
            clauses.add("UPPER(region) = ?" + idx++);
            params.add(region.toUpperCase());
        }

        String country = InputSanitizer.cleanSingleLine(countryParam);
        if (country != null && !"ALL".equalsIgnoreCase(country)) {
            clauses.add("UPPER(country) = ?" + idx++);
            params.add(country.toUpperCase());
        }

        String location = InputSanitizer.cleanSingleLine(locationParam);
        if (location != null && !"ALL".equalsIgnoreCase(location)) {
            clauses.add("UPPER(location) = ?" + idx++);
            params.add(location.toUpperCase());
        }

        String status = InputSanitizer.cleanSingleLine(statusParam);
        if (status != null && !"ALL".equalsIgnoreCase(status)) {
            String normalized = normalizeStatus(status);
            if (normalized == null) {
                throw new IllegalArgumentException("Filtro de estado inválido");
            }
            clauses.add("UPPER(status) = ?" + idx++);
            params.add(normalized);
        }

        String where = String.join(" AND ", clauses);
        return Record.find(where + " ORDER BY depositDate DESC, id DESC", params.toArray()).list();
    }

    private Map<String, Object> buildAggregationPayload(List<Record> records) {
        int recordCount = records.size();
        int distributedCount = 0;
        int undistributedCount = 0;
        int unidentifiedCount = 0;

        BigDecimal totalDeposit = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPassport = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalDui = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalConsular = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCommission = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal pendingBalance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal depDistributed = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal depUndistributed = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal depUnidentified = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        Map<String, SedeAccumulator> sedeMap = new LinkedHashMap<>();
        Map<String, MonthAccumulator> monthMap = new LinkedHashMap<>();

        for (Record r : records) {
            BigDecimal dep = scale(r.depositAmount);
            BigDecimal pas = scale(r.passportValue);
            BigDecimal dui = scale(r.duiValue);
            BigDecimal con = scale(r.consularValue);
            BigDecimal com = scale(r.commissionValue);

            totalDeposit = totalDeposit.add(dep);
            totalPassport = totalPassport.add(pas);
            totalDui = totalDui.add(dui);
            totalConsular = totalConsular.add(con);
            totalCommission = totalCommission.add(com);

            String normStatus = normalizeStatus(r.status);
            boolean isDist = "IDENTIFICADO DISTRIBUIDO".equals(normStatus);
            if (isDist) {
                distributedCount++;
                depDistributed = depDistributed.add(dep);
            } else if ("IDENTIFICADO / NO DISTRIBUIDO".equals(normStatus)) {
                undistributedCount++;
                depUndistributed = depUndistributed.add(dep);
                pendingBalance = pendingBalance.add(dep);
            } else {
                unidentifiedCount++;
                depUnidentified = depUnidentified.add(dep);
                pendingBalance = pendingBalance.add(dep);
            }

            // Acumular por sede
            String reg = r.region != null && !r.region.isBlank() ? r.region : "SIN IDENTIFICAR";
            String ctry = r.country != null && !r.country.isBlank() ? r.country : "SIN IDENTIFICAR";
            String loc = r.location != null && !r.location.isBlank() ? r.location : "NO IDENTIFICADA";
            String sedeKey = reg + "|" + ctry + "|" + loc;

            SedeAccumulator sa = sedeMap.computeIfAbsent(sedeKey, k -> {
                SedeAccumulator acc = new SedeAccumulator();
                acc.region = reg;
                acc.country = ctry;
                acc.location = loc;
                return acc;
            });
            sa.recordCount++;
            sa.depositAmount = sa.depositAmount.add(dep);
            sa.passportValue = sa.passportValue.add(pas);
            sa.duiValue = sa.duiValue.add(dui);
            sa.consularValue = sa.consularValue.add(con);
            sa.commissionValue = sa.commissionValue.add(com);
            if (!isDist) {
                sa.pendingAmount = sa.pendingAmount.add(dep);
            }

            // Acumular por mes de depósito
            if (r.depositDate != null) {
                int y = r.depositDate.getYear();
                int m = r.depositDate.getMonthValue();
                String ymKey = String.format("%04d-%02d", y, m);
                MonthAccumulator ma = monthMap.computeIfAbsent(ymKey, k -> {
                    MonthAccumulator acc = new MonthAccumulator();
                    acc.year = y;
                    acc.month = m;
                    return acc;
                });
                ma.recordCount++;
                ma.depositAmount = ma.depositAmount.add(dep);
                ma.passportValue = ma.passportValue.add(pas);
                ma.duiValue = ma.duiValue.add(dui);
                ma.consularValue = ma.consularValue.add(con);
                ma.commissionValue = ma.commissionValue.add(com);
                if (!isDist) {
                    ma.pendingAmount = ma.pendingAmount.add(dep);
                }
            }
        }

        BigDecimal totalIncome = totalPassport.add(totalDui).add(totalConsular).add(totalCommission);

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("recordCount", recordCount);
        totals.put("identifiedCount", distributedCount + undistributedCount);
        totals.put("distributedCount", distributedCount);
        totals.put("undistributedCount", undistributedCount);
        totals.put("unidentifiedCount", unidentifiedCount);
        totals.put("totalDepositAmount", totalDeposit);
        totals.put("totalIncome", totalIncome);
        totals.put("totalPassport", totalPassport);
        totals.put("totalDui", totalDui);
        totals.put("totalConsular", totalConsular);
        totals.put("totalCommission", totalCommission);
        totals.put("pendingBalance", pendingBalance);

        List<Map<String, Object>> byConsulate = sedeMap.values().stream()
                .sorted(Comparator.comparing((SedeAccumulator s) -> s.depositAmount).reversed())
                .map(s -> {
                    BigDecimal inc = s.passportValue.add(s.duiValue).add(s.consularValue).add(s.commissionValue);
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("region", s.region);
                    m.put("country", s.country);
                    m.put("location", s.location);
                    m.put("recordCount", s.recordCount);
                    m.put("depositAmount", s.depositAmount);
                    m.put("totalIncome", inc);
                    m.put("passportValue", s.passportValue);
                    m.put("duiValue", s.duiValue);
                    m.put("consularValue", s.consularValue);
                    m.put("commissionValue", s.commissionValue);
                    m.put("pendingAmount", s.pendingAmount);
                    return m;
                })
                .toList();

        List<Map<String, Object>> byMonth = monthMap.entrySet().stream()
                .sorted(Map.Entry.<String, MonthAccumulator>comparingByKey().reversed())
                .map(e -> {
                    MonthAccumulator ma = e.getValue();
                    BigDecimal inc = ma.passportValue.add(ma.duiValue).add(ma.consularValue).add(ma.commissionValue);
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("periodKey", e.getKey());
                    m.put("year", ma.year);
                    m.put("month", ma.month);
                    m.put("periodLabel", monthName(ma.month) + " " + ma.year);
                    m.put("recordCount", ma.recordCount);
                    m.put("depositAmount", ma.depositAmount);
                    m.put("totalIncome", inc);
                    m.put("passportValue", ma.passportValue);
                    m.put("duiValue", ma.duiValue);
                    m.put("consularValue", ma.consularValue);
                    m.put("commissionValue", ma.commissionValue);
                    m.put("pendingAmount", ma.pendingAmount);
                    return m;
                })
                .toList();

        List<Map<String, Object>> byStatus = List.of(
                buildStatusRow("Identificado Distribuido", distributedCount, depDistributed, totalDeposit),
                buildStatusRow("Identificado / No distribuido", undistributedCount, depUndistributed, totalDeposit),
                buildStatusRow("No identificado", unidentifiedCount, depUnidentified, totalDeposit)
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totals", totals);
        result.put("byConsulate", byConsulate);
        result.put("byMonth", byMonth);
        result.put("byStatus", byStatus);
        return result;
    }

    private Map<String, Object> buildStatusRow(String label, int count, BigDecimal amount, BigDecimal grandTotal) {
        double pct = grandTotal.compareTo(BigDecimal.ZERO) > 0
                ? amount.multiply(BigDecimal.valueOf(100)).divide(grandTotal, 2, RoundingMode.HALF_UP).doubleValue()
                : 0.0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", label);
        m.put("recordCount", count);
        m.put("depositAmount", amount);
        m.put("percentage", pct);
        return m;
    }

    private Map<String, Object> toInformeDto(InformeCaja inf) {
        BigDecimal totalDistribuido = scale(inf.totalPasaporte)
                .add(scale(inf.totalDui))
                .add(scale(inf.totalConsulares))
                .add(scale(inf.totalComision));

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", inf.id);
        dto.put("correlative", inf.correlative != null ? inf.correlative : ("IC-" + inf.id));
        dto.put("bankAccount", inf.bankAccount);
        dto.put("month", inf.month);
        dto.put("year", inf.year);
        dto.put("periodLabel", monthName(inf.month) + " " + inf.year);
        dto.put("saldoAnterior", scale(inf.saldoAnterior));
        dto.put("totalDepositos", scale(inf.totalDepositos));
        dto.put("totalPasaporte", scale(inf.totalPasaporte));
        dto.put("totalDui", scale(inf.totalDui));
        dto.put("totalConsulares", scale(inf.totalConsulares));
        dto.put("totalComision", scale(inf.totalComision));
        dto.put("totalDistribuido", totalDistribuido);
        dto.put("saldoPendiente", scale(inf.saldoPendiente));
        dto.put("status", inf.status != null ? inf.status : "PRELIMINAR");
        dto.put("observaciones", inf.observaciones != null ? inf.observaciones : "");
        dto.put("createdBy", inf.user != null ? inf.user.name : "Sistema");
        dto.put("createdAt", inf.createdAt != null ? inf.createdAt.toString() : null);
        dto.put("updatedAt", inf.updatedAt != null ? inf.updatedAt.toString() : null);
        return dto;
    }

    private void recordReportHistory(String reportType, Integer year, Integer month, String format, String fileName) {
        User u = resolveCurrentUser();
        if (u == null) return;
        ReportHistory rh = new ReportHistory();
        rh.user = u;
        rh.reportType = reportType;
        rh.periodYear = (year != null && year > 0) ? year : LocalDate.now().getYear();
        rh.periodMonth = (month != null && month >= 1 && month <= 12) ? month : 0;
        rh.status = "GENERADO";
        rh.format = format;
        rh.fileName = fileName;
        rh.filePath = "/api/reports/export/" + format.toLowerCase();
        rh.persist();
    }

    private void drawPdfTableHeader(PDPageContentStream cs, PDType1Font fontBold, float y) throws Exception {
        writePdfLine(cs, fontBold, 8.5f, 40f, y, "#");
        writePdfLine(cs, fontBold, 8.5f, 65f, y, "REGION");
        writePdfLine(cs, fontBold, 8.5f, 165f, y, "PAIS - EMBAJADA / CONSULADO");
        writePdfLine(cs, fontBold, 8.5f, 360f, y, "REG.");
        writePdfLine(cs, fontBold, 8.5f, 405f, y, "DEPOSITO");
        writePdfLine(cs, fontBold, 8.5f, 480f, y, "PASAPORTE");
        writePdfLine(cs, fontBold, 8.5f, 545f, y, "DUI");
        writePdfLine(cs, fontBold, 8.5f, 605f, y, "CONSULAR");
        writePdfLine(cs, fontBold, 8.5f, 670f, y, "COMISION");
        writePdfLine(cs, fontBold, 8.5f, 730f, y, "PENDIENTE");
    }

    private String sanitizeReportType(String raw) {
        String c = InputSanitizer.cleanSingleLine(raw);
        if (c == null) return "CONSOLIDADO";
        return switch (c.toUpperCase()) {
            case "POR_SEDE", "CONSOLIDADO_SEDE" -> "POR_SEDE";
            case "MENSUAL", "MENSUAL_ANUAL" -> "MENSUAL_ANUAL";
            case "DISTRIBUCION", "ESTADOS" -> "DISTRIBUCION";
            default -> "CONSOLIDADO";
        };
    }

    private String buildReportFileName(String reportType, Integer year, Integer month, String ext) {
        String suffix = (year != null && year > 0)
                ? (month != null && month >= 1 && month <= 12 ? String.format("%d_%02d", year, month) : String.valueOf(year))
                : "historico";
        return "reporte_" + reportType.toLowerCase() + "_" + suffix + "." + ext;
    }

    private String describePeriod(Integer year, Integer month, String dateFrom, String dateTo) {
        String cf = InputSanitizer.cleanSingleLine(dateFrom);
        String ct = InputSanitizer.cleanSingleLine(dateTo);
        if (cf != null || ct != null) {
            return "Rango " + (cf != null ? cf : "Inicio") + " al " + (ct != null ? ct : "Actual");
        }
        if (year != null && year > 0) {
            if (month != null && month >= 1 && month <= 12) {
                return monthName(month) + " " + year;
            }
            return "Año Fiscal " + year;
        }
        return "Histórico Acumulado";
    }

    private String monthName(Integer m) {
        if (m == null || m < 1 || m > 12) return "Anual";
        return MONTH_NAMES[m];
    }

    private String normalizeStatus(String rawStatus) {
        String cleaned = InputSanitizer.cleanSingleLine(rawStatus);
        if (cleaned == null) return null;
        return switch (cleaned.toUpperCase()) {
            case "NO IDENTIFICADO" -> "NO IDENTIFICADO";
            case "IDENTIFICADO / NO DISTRIBUIDO", "IDENTIFICADO NO DISTRIBUIDO" -> "IDENTIFICADO / NO DISTRIBUIDO";
            case "IDENTIFICADO DISTRIBUIDO" -> "IDENTIFICADO DISTRIBUIDO";
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

    private BigDecimal scale(BigDecimal val) {
        return val != null ? val.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private String fmtMoneyObj(Object val) {
        if (val instanceof BigDecimal bd) {
            return bd.setScale(2, RoundingMode.HALF_UP).toPlainString();
        }
        if (val instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP).toPlainString();
        }
        return "0.00";
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 2) + "..";
    }

    private String safePdf(String text) {
        if (text == null) return "";
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

    private String readSetting(String key, String fallback) {
        SystemSetting s = SystemSetting.findById(key);
        if (s != null && s.settingValue != null && !s.settingValue.isBlank()) {
            return s.settingValue;
        }
        return fallback;
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
