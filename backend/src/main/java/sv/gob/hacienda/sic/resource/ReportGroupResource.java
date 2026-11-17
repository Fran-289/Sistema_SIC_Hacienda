package sv.gob.hacienda.sic.resource;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
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
import sv.gob.hacienda.sic.entity.ReportDocument;
import sv.gob.hacienda.sic.entity.ReportGroup;
import sv.gob.hacienda.sic.entity.SystemSetting;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/report-groups")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class ReportGroupResource {

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

    private static final String TYPE_CONSULARES = "Reportes Consulares";
    private static final String TYPE_NO_IDENTIFICADOS = "No Identificados / No Distribuidos";

    private static final List<String> CONSULAR_DOCS_ORDER = List.of(
            "CAJA", "SALDOS", "LIQUIDACION", "CABLEGRAFICAS"
    );

    private static final String[] MONTH_NAMES = {
        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    };

    public static class CreateGroupRequest {
        @NotBlank(message = "El tipo de reporte es obligatorio")
        public String groupType;

        @NotNull(message = "El mes es obligatorio")
        @Min(value = 1, message = "El mes debe estar entre 1 y 12")
        @Max(value = 12, message = "El mes debe estar entre 1 y 12")
        public Integer periodMonth;

        @NotNull(message = "El año es obligatorio")
        @Min(value = 2020, message = "Año mínimo 2020")
        @Max(value = 2100, message = "Año máximo 2100")
        public Integer periodYear;

        public String status;
    }

    public static class UploadSignedPdfRequest {
        @NotBlank(message = "El nombre del archivo es obligatorio")
        @Size(max = 200, message = "Nombre de archivo demasiado largo")
        public String fileName;

        @NotBlank(message = "El contenido del documento PDF es obligatorio")
        public String base64Pdf;
    }

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    public List<Map<String, Object>> listarPaquetes(@QueryParam("scope") String scope) {
        String sc = scope != null ? scope.trim().toLowerCase() : "pending";
        List<ReportGroup> groups;
        if ("finalized".equals(sc)) {
            groups = ReportGroup.find("processStatus in ('Finalizado', 'Completado') ORDER BY updatedAt DESC, id DESC").list();
        } else if ("all".equals(sc)) {
            groups = ReportGroup.find("ORDER BY createdAt DESC, id DESC").list();
        } else {
            groups = ReportGroup.find("processStatus not in ('Finalizado', 'Completado') ORDER BY createdAt DESC, id DESC").list();
        }

        List<ReportDocument> allDocs = ReportDocument.find("ORDER BY id ASC").list();

        Map<Long, List<ReportDocument>> docsByGroup = new LinkedHashMap<>();
        for (ReportDocument doc : allDocs) {
            if (doc.group != null && doc.group.id != null) {
                docsByGroup.computeIfAbsent(doc.group.id, k -> new ArrayList<>()).add(doc);
            }
        }

        return groups.stream()
                .map(g -> toGroupDto(g, docsByGroup.getOrDefault(g.id, List.of())))
                .toList();
    }

    @POST
    @Transactional
    public Response crearPaquete(@Valid CreateGroupRequest req) {
        if (req == null) {
            return badRequest("Datos inválidos");
        }
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "Sesión no válida"))
                    .build();
        }

        String rawType = InputSanitizer.cleanSingleLine(req.groupType);
        String groupType;
        if (TYPE_NO_IDENTIFICADOS.equalsIgnoreCase(rawType) || (rawType != null && rawType.toUpperCase().contains("NO IDENTIFICADO"))) {
            groupType = TYPE_NO_IDENTIFICADOS;
        } else {
            groupType = TYPE_CONSULARES;
        }

        String status;
        if (TYPE_NO_IDENTIFICADOS.equals(groupType)) {
            status = "N/A";
        } else {
            String rawStatus = InputSanitizer.cleanSingleLine(req.status);
            if (rawStatus == null) {
                status = "PRELIMINAR";
            } else {
                status = switch (rawStatus.toUpperCase()) {
                    case "DEFINITIVO" -> "DEFINITIVO";
                    case "DEFINITIVO MODIFICADO" -> "DEFINITIVO MODIFICADO";
                    default -> "PRELIMINAR";
                };
            }
        }

        // Regla de correlativo: primer número = mes; si es DEFINITIVO MODIFICADO agrega .x (ej. 7.1, 7.2, 7.3)
        String correlative;
        if ("DEFINITIVO MODIFICADO".equals(status)) {
            long modCount = ReportGroup.count(
                    "periodYear = ?1 and periodMonth = ?2 and groupType = ?3 and status = 'DEFINITIVO MODIFICADO'",
                    req.periodYear, req.periodMonth, groupType
            );
            correlative = req.periodMonth + "." + (modCount + 1);
        } else {
            correlative = String.valueOf(req.periodMonth);
        }

        ReportGroup group = new ReportGroup();
        group.correlative = correlative;
        group.groupType = groupType;
        group.periodMonth = req.periodMonth;
        group.periodYear = req.periodYear;
        group.status = status;
        group.processStatus = "Firma Jefatura";
        group.createdBy = currentUser;
        group.persist();

        List<ReportDocument> createdDocs = new ArrayList<>();
        if (TYPE_CONSULARES.equals(groupType)) {
            for (String dtype : CONSULAR_DOCS_ORDER) {
                ReportDocument doc = new ReportDocument();
                doc.group = group;
                doc.reportType = dtype;
                doc.persist();
                createdDocs.add(doc);
            }
        } else {
            ReportDocument doc = new ReportDocument();
            doc.group = group;
            doc.reportType = "NOIDENTIFICADOS_NODISTRIBUIDOS";
            doc.persist();
            createdDocs.add(doc);
        }

        auditService.log(
                currentUser,
                jwtName(),
                "CREAR_PAQUETE_TAREA",
                "Paquete de reporte generado #" + group.id + " (Correlativo " + group.correlative
                        + " | " + group.groupType + " | " + monthName(group.periodMonth) + " " + group.periodYear
                        + " | Estado: " + group.status + ")"
        );

        return Response.status(Response.Status.CREATED)
                .entity(toGroupDto(group, createdDocs))
                .build();
    }

    @POST
    @Path("/{groupId}/documents/{docId}/upload-signed")
    @Transactional
    public Response subirDocumentoFirmado(
            @PathParam("groupId") Long groupId,
            @PathParam("docId") Long docId,
            @Valid UploadSignedPdfRequest req
    ) {
        if (groupId == null || docId == null || req == null) {
            return badRequest("Solicitud de carga incompleta");
        }

        ReportGroup group = ReportGroup.findById(groupId);
        ReportDocument doc = ReportDocument.findById(docId);
        if (group == null || doc == null || doc.group == null || !group.id.equals(doc.group.id)) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Documento o paquete de reporte no encontrado"))
                    .build();
        }
        if (isFinalizedStage(group.processStatus)) {
            return badRequest("Este trámite ya se encuentra Finalizado en Bandeja de Reportes y no admite modificaciones.");
        }

        String rawB64 = req.base64Pdf.trim();
        int commaIdx = rawB64.indexOf(',');
        if (commaIdx >= 0) {
            rawB64 = rawB64.substring(commaIdx + 1).trim();
        }

        byte[] pdfBytes;
        try {
            pdfBytes = Base64.getDecoder().decode(rawB64);
        } catch (IllegalArgumentException e) {
            return badRequest("El archivo proporcionado no tiene una codificación válida");
        }

        if (pdfBytes.length < 8) {
            return badRequest("El archivo PDF está vacío o incompleto");
        }
        if (pdfBytes.length > MAX_PDF_BYTES) {
            return badRequest("El archivo excede el tamaño máximo permitido de 15 MB");
        }

        // Validar cabecera mágica %PDF-
        if (pdfBytes[0] != 0x25 || pdfBytes[1] != 0x50 || pdfBytes[2] != 0x44 || pdfBytes[3] != 0x46 || pdfBytes[4] != 0x2D) {
            return badRequest("Por seguridad, únicamente se permiten documentos con formato PDF auténtico.");
        }

        String cleanOriginalName = InputSanitizer.cleanSingleLine(req.fileName);
        if (cleanOriginalName == null) {
            cleanOriginalName = "documento_firmado.pdf";
        }
        cleanOriginalName = cleanOriginalName.replaceAll("[^A-Za-z0-9._\\-\\s]", "_");
        if (!cleanOriginalName.toLowerCase().endsWith(".pdf")) {
            cleanOriginalName = cleanOriginalName + ".pdf";
        }

        try {
            java.nio.file.Path baseDir = Paths.get("uploads", "signed-docs").toAbsolutePath().normalize();
            Files.createDirectories(baseDir);

            String storedName = "signed_grp" + group.id + "_doc" + doc.id + "_" + System.currentTimeMillis() + ".pdf";
            java.nio.file.Path targetFile = baseDir.resolve(storedName).normalize();
            if (!targetFile.startsWith(baseDir)) {
                return badRequest("Ruta de destino inválida");
            }

            Files.write(targetFile, pdfBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            doc.signedPdfUrl = storedName;
            doc.signedFileName = cleanOriginalName;
            doc.uploadedAt = LocalDateTime.now();

            auditService.log(
                    resolveCurrentUser(),
                    jwtName(),
                    "SUBIR_DOCUMENTO_FIRMADO",
                    "Documento firmado subido para " + doc.reportType + " (Paquete #" + group.id
                            + " · Correlativo " + group.correlative + " · Archivo: " + cleanOriginalName + ")"
            );

            List<ReportDocument> groupDocs = ReportDocument.find("group.id = ?1 ORDER BY id ASC", group.id).list();
            return Response.ok(toGroupDto(group, groupDocs)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", "No se pudo almacenar el documento firmado"))
                    .build();
        }
    }

    @PUT
    @Path("/{groupId}/advance")
    @Transactional
    public Response avanzarEstadoProceso(@PathParam("groupId") Long groupId) {
        if (groupId == null || groupId <= 0) {
            return badRequest("ID de trámite inválido");
        }
        ReportGroup group = ReportGroup.findById(groupId);
        if (group == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "Trámite no encontrado"))
                    .build();
        }

        if (isFinalizedStage(group.processStatus)) {
            return badRequest("Este trámite ya se encuentra en estado Finalizado y no admite modificaciones.");
        }

        List<ReportDocument> docs = ReportDocument.find("group.id = ?1 ORDER BY id ASC", group.id).list();

        if (TYPE_CONSULARES.equalsIgnoreCase(group.groupType)) {
            long signedCount = docs.stream()
                    .filter(d -> d.signedPdfUrl != null && !d.signedPdfUrl.isBlank())
                    .count();
            if (signedCount < 4) {
                List<String> missing = docs.stream()
                        .filter(d -> d.signedPdfUrl == null || d.signedPdfUrl.isBlank())
                        .map(d -> d.reportType)
                        .toList();
                return badRequest("Trámite inconcluso: debe subir los 4 documentos firmados antes de pasar al siguiente estado. Pendientes ("
                        + (4 - signedCount) + "/4): " + String.join(", ", missing) + ".");
            }
        }

        String currentStage = group.processStatus != null ? group.processStatus.trim() : "Firma Jefatura";
        String nextStage = computeNextStage(currentStage, group.status);

        group.processStatus = nextStage;

        auditService.log(
                resolveCurrentUser(),
                jwtName(),
                "AVANZAR_PROCESO_REPORTE",
                "Paquete #" + group.id + " (Correlativo " + group.correlative + " - " + group.groupType
                        + ") avanzó de '" + currentStage + "' a '" + nextStage + "'"
        );

        return Response.ok(toGroupDto(group, docs)).build();
    }

    @GET
    @Path("/documents/{docId}/pdf")
    @Produces("application/pdf")
    public Response obtenerPdfGenerado(
            @PathParam("docId") Long docId,
            @QueryParam("inline") Boolean inline
    ) {
        ReportDocument doc = docId != null ? ReportDocument.findById(docId) : null;
        if (doc == null || doc.group == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Documento no encontrado"))
                    .build();
        }

        ReportGroup g = doc.group;
        String instName = readSetting("INSTITUTION_NAME", "MINISTERIO DE HACIENDA DE EL SALVADOR");
        String deptName = readSetting("DEPARTMENT_NAME", "Dirección General de Tesorería - Ingresos Consulares");
        String bankAcc = readSetting("BANK_ACCOUNT_DEFAULT", "00110000112233") + " - "
                + readSetting("BANK_ACCOUNT_NAME", "INGRESOS CONSULARES");

        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            pdf.addPage(page);
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream cs = new PDPageContentStream(pdf, page)) {
                float y = 720f;
                writePdfLine(cs, fontBold, 13.5f, 55f, y, safePdf(instName.toUpperCase()));
                y -= 18f;
                writePdfLine(cs, fontRegular, 10.5f, 55f, y, safePdf(deptName));
                y -= 28f;
                writePdfLine(cs, fontBold, 13f, 55f, y, safePdf("REPORTE OFICIAL: " + doc.reportType));
                y -= 24f;

                String[][] meta = {
                    {"Correlativo del Tramite:", safePdf(g.correlative)},
                    {"Tipo de Paquete:", safePdf(g.groupType)},
                    {"Periodo Fiscal:", safePdf(monthName(g.periodMonth) + " " + g.periodYear)},
                    {"Estado del Reporte:", safePdf(g.status)},
                    {"Etapa del Proceso:", safePdf(g.processStatus)},
                    {"Cuenta Concentradora BCR:", safePdf(bankAcc)},
                    {"Generado por:", safePdf(g.createdBy != null ? g.createdBy.name : "Administrador del Sistema")},
                    {"Fecha de Emision:", LocalDateTime.now().format(DT_FMT)}
                };

                for (String[] pair : meta) {
                    writePdfLine(cs, fontBold, 10f, 55f, y, pair[0]);
                    writePdfLine(cs, fontRegular, 10f, 235f, y, pair[1]);
                    y -= 20f;
                }

                y -= 18f;
                writePdfLine(cs, fontBold, 10f, 55f, y, "ESPACIO RESERVADO PARA FIRMA Y SELLO DE JEFATURA:");
                y -= 55f;
                writePdfLine(cs, fontRegular, 10f, 55f, y, "_________________________________________________");
                y -= 15f;
                writePdfLine(cs, fontRegular, 9.5f, 55f, y, "Firma Autorizada — Direccion General de Tesoreria");
            }

            pdf.save(out);
            String filename = doc.reportType.toLowerCase() + "_" + g.correlative.replace('.', '_') + "_" + g.periodYear + ".pdf";
            String disp = Boolean.TRUE.equals(inline) ? "inline" : "attachment";
            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", disp + "; filename=\"" + filename + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Error al generar vista PDF del documento"))
                    .build();
        }
    }

    @GET
    @Path("/documents/{docId}/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response obtenerExcelGenerado(@PathParam("docId") Long docId) {
        ReportDocument doc = docId != null ? ReportDocument.findById(docId) : null;
        if (doc == null || doc.group == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Documento no encontrado"))
                    .build();
        }
        ReportGroup g = doc.group;
        String instName = readSetting("INSTITUTION_NAME", "Ministerio de Hacienda - Dirección General de Tesorería");

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(doc.reportType);
            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font font = wb.createFont();
            font.setColor(IndexedColors.WHITE.getIndex());
            font.setBold(true);
            headerStyle.setFont(font);

            sheet.createRow(0).createCell(0).setCellValue(instName.toUpperCase());
            sheet.createRow(1).createCell(0).setCellValue("Documento: " + doc.reportType + " | Correlativo: " + g.correlative + " | Período: " + monthName(g.periodMonth) + " " + g.periodYear);

            Row h = sheet.createRow(3);
            String[] cols = {"Campo", "Detalle"};
            for (int i = 0; i < cols.length; i++) {
                Cell c = h.createCell(i);
                c.setCellValue(cols[i]);
                c.setCellStyle(headerStyle);
            }

            String[][] rows = {
                {"Correlativo", g.correlative},
                {"Tipo de Reporte", g.groupType},
                {"Documento Específico", doc.reportType},
                {"Mes", monthName(g.periodMonth)},
                {"Año", String.valueOf(g.periodYear)},
                {"Estado", g.status},
                {"Estado del Proceso", g.processStatus}
            };
            int rIdx = 4;
            for (String[] pair : rows) {
                Row r = sheet.createRow(rIdx++);
                r.createCell(0).setCellValue(pair[0]);
                r.createCell(1).setCellValue(pair[1]);
            }
            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            wb.write(out);
            String filename = doc.reportType.toLowerCase() + "_" + g.correlative.replace('.', '_') + "_" + g.periodYear + ".xlsx";
            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Error al generar Excel del documento"))
                    .build();
        }
    }

    @GET
    @Path("/documents/{docId}/signed-pdf")
    @Produces("application/pdf")
    public Response verDocumentoFirmadoSubido(@PathParam("docId") Long docId) {
        ReportDocument doc = docId != null ? ReportDocument.findById(docId) : null;
        if (doc == null || doc.signedPdfUrl == null || doc.signedPdfUrl.isBlank()) {
            return Response.status(Response.Status.NOT_FOUND)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Este documento aún no tiene un PDF firmado subido"))
                    .build();
        }

        try {
            java.nio.file.Path baseDir = Paths.get("uploads", "signed-docs").toAbsolutePath().normalize();
            java.nio.file.Path file = baseDir.resolve(doc.signedPdfUrl).normalize();
            if (!file.startsWith(baseDir) || !Files.exists(file)) {
                return Response.status(Response.Status.NOT_FOUND)
                        .type(MediaType.APPLICATION_JSON)
                        .entity(Map.of("error", "El archivo firmado no se encontró en el almacenamiento"))
                        .build();
            }

            byte[] bytes = Files.readAllBytes(file);
            String downloadName = doc.signedFileName != null ? doc.signedFileName : ("firmado_" + doc.reportType + ".pdf");
            return Response.ok(bytes)
                    .header("Content-Disposition", "inline; filename=\"" + downloadName + "\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Error al leer el documento firmado"))
                    .build();
        }
    }

    private Map<String, Object> toGroupDto(ReportGroup g, List<ReportDocument> rawDocs) {
        List<ReportDocument> sortedDocs = new ArrayList<>(rawDocs);
        sortedDocs.sort(Comparator.comparingInt(d -> docOrderRank(d.reportType)));

        int uploadedCount = 0;
        List<Map<String, Object>> docDtos = new ArrayList<>();
        for (ReportDocument d : sortedDocs) {
            boolean hasSigned = d.signedPdfUrl != null && !d.signedPdfUrl.isBlank();
            if (hasSigned) {
                uploadedCount++;
            }
            Map<String, Object> dm = new LinkedHashMap<>();
            dm.put("id", d.id);
            dm.put("reportType", d.reportType);
            dm.put("statusLabel", hasSigned ? "Firmado / Subido" : "Pendiente");
            dm.put("hasSignedPdf", hasSigned);
            dm.put("signedFileName", d.signedFileName);
            dm.put("uploadedAt", d.uploadedAt != null ? d.uploadedAt.toString() : null);
            docDtos.add(dm);
        }

        boolean isConsulares = TYPE_CONSULARES.equalsIgnoreCase(g.groupType);
        int requiredSigned = isConsulares ? 4 : 0;
        boolean finalized = isFinalizedStage(g.processStatus);
        boolean canAdvance = (!isConsulares || uploadedCount >= 4) && !finalized;
        String nextProcessStatus = finalized ? null : computeNextStage(g.processStatus, g.status);
        LocalDateTime effectiveUpdated = g.updatedAt != null ? g.updatedAt : g.createdAt;

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", g.id);
        dto.put("correlative", g.correlative);
        dto.put("groupType", g.groupType);
        dto.put("periodMonth", g.periodMonth);
        dto.put("monthName", monthName(g.periodMonth));
        dto.put("periodYear", g.periodYear);
        dto.put("status", g.status);
        dto.put("processStatus", finalized ? "Finalizado" : g.processStatus);
        dto.put("nextProcessStatus", nextProcessStatus);
        dto.put("isFinalized", finalized);
        dto.put("createdBy", g.createdBy != null ? g.createdBy.name : "Administrador del Sistema");
        dto.put("createdAt", g.createdAt != null ? g.createdAt.toString() : null);
        dto.put("createdAtFormatted", g.createdAt != null ? g.createdAt.format(DT_FMT) : "-");
        dto.put("updatedAt", effectiveUpdated != null ? effectiveUpdated.toString() : null);
        dto.put("updatedAtFormatted", effectiveUpdated != null ? effectiveUpdated.format(DT_FMT) : "-");
        dto.put("uploadedSignedCount", uploadedCount);
        dto.put("requiredSignedCount", requiredSigned);
        dto.put("canAdvance", canAdvance);
        dto.put("documents", docDtos);
        return dto;
    }

    private boolean isFinalizedStage(String stage) {
        if (stage == null) return false;
        String s = stage.trim();
        return "Finalizado".equalsIgnoreCase(s) || "Completado".equalsIgnoreCase(s);
    }

    private boolean isModifiedReportStatus(String reportStatus) {
        if (reportStatus == null) return false;
        return reportStatus.toUpperCase().contains("MODIFICADO");
    }

    private String computeNextStage(String currentStageRaw, String reportStatus) {
        String currentStage = currentStageRaw != null ? currentStageRaw.trim() : "Firma Jefatura";
        boolean isModified = isModifiedReportStatus(reportStatus);
        return switch (currentStage) {
            case "Firma Jefatura" -> isModified ? "Modificación" : "Firma Recaudaciones";
            case "Modificación", "Modificacion" -> "Firma Recaudaciones";
            case "Firma Recaudaciones" -> "Finalizado";
            case "Finalizado", "Completado" -> "Finalizado";
            default -> isModified ? "Modificación" : "Firma Recaudaciones";
        };
    }

    private int docOrderRank(String type) {
        if (type == null) return 99;
        int i = CONSULAR_DOCS_ORDER.indexOf(type.toUpperCase());
        return i >= 0 ? i : 50;
    }

    private String monthName(Integer m) {
        if (m == null || m < 1 || m > 12) return "-";
        return MONTH_NAMES[m];
    }

    private String readSetting(String key, String fallback) {
        SystemSetting s = SystemSetting.findById(key);
        if (s != null && s.settingValue != null && !s.settingValue.isBlank()) {
            return s.settingValue;
        }
        return fallback;
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
