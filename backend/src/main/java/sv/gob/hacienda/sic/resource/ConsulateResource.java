package sv.gob.hacienda.sic.resource;

import io.quarkus.panache.common.Sort;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.eclipse.microprofile.jwt.JsonWebToken;
import sv.gob.hacienda.sic.dto.ConsulateRequest;
import sv.gob.hacienda.sic.entity.Consulate;
import sv.gob.hacienda.sic.entity.SystemLog;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/consulates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class ConsulateResource {

    private static final Set<String> ALLOWED_TYPES = Set.of("EMBAJADA", "CONSULADO", "MISION PERMANENTE", "MISIÓN PERMANENTE");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVO", "INACTIVO");

    public static class StatusUpdateRequest {
        @NotBlank(message = "El estado es obligatorio")
        public String status;

        @NotBlank(message = "Debe ingresar el motivo o justificación del cambio de estado")
        @Size(min = 5, max = 500, message = "La justificación debe tener entre 5 y 500 caracteres")
        public String reason;
    }

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    public List<Consulate> obtenerConsulados(@QueryParam("includeInactive") boolean includeInactive) {
        Sort sort = Sort.ascending("region").and("country").and("location");
        if (includeInactive) {
            return Consulate.listAll(sort);
        }
        return Consulate.list("status = ?1", sort, "ACTIVO");
    }

    @GET
    @Path("/{id}")
    public Response obtenerPorId(@PathParam("id") Long id) {
        if (id == null || id <= 0) {
            return notFound();
        }
        Consulate consulate = Consulate.findById(id);
        if (consulate == null) {
            return notFound();
        }
        return Response.ok(consulate).build();
    }

    @GET
    @Path("/{id}/history")
    public Response obtenerHistorial(@PathParam("id") Long id) {
        if (id == null || id <= 0) {
            return notFound();
        }
        Consulate consulate = Consulate.findById(id);
        if (consulate == null) {
            return notFound();
        }

        List<SystemLog> logs = SystemLog.find(
                "action IN ('CREAR_SEDE_CONSULAR', 'EDITAR_SEDE_CONSULAR', 'CAMBIAR_ESTADO_SEDE') AND (details LIKE ?1 OR details LIKE ?2) ORDER BY createdAt DESC, id DESC",
                "%#" + id + ":%", "%#" + id + " %"
        ).page(0, 30).list();

        List<Map<String, Object>> result = logs.stream().map(l -> Map.<String, Object>of(
                "id", l.id != null ? l.id : 0L,
                "userName", l.userName != null ? l.userName : "Sistema",
                "action", l.action != null ? l.action : "",
                "details", l.details != null ? l.details : "",
                "createdAt", l.createdAt != null ? l.createdAt.toString() : ""
        )).toList();

        return Response.ok(result).build();
    }

    @POST
    @RolesAllowed("ADMIN")
    @Transactional
    public Response crear(@Valid @NotNull(message = "Los datos de la sede son obligatorios") ConsulateRequest req) {
        Consulate consulate = new Consulate();
        Response err = validateAndPopulate(consulate, req, 0L);
        if (err != null) {
            return err;
        }

        User user = resolveCurrentUser();
        consulate.createdBy = user;
        consulate.persist();

        auditService.log(user, jwtName(), "CREAR_SEDE_CONSULAR",
                "Sede creada #" + consulate.id + ": " + consulate.type + " - " + consulate.location + " (" + consulate.country + ")");

        return Response.status(Response.Status.CREATED).entity(consulate).build();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("ADMIN")
    @Transactional
    public Response actualizar(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos de la sede son obligatorios") ConsulateRequest req) {
        if (id == null || id <= 0) {
            return notFound();
        }
        Consulate consulate = Consulate.findById(id);
        if (consulate == null) {
            return notFound();
        }

        String previousStatus = consulate.status != null ? consulate.status.toUpperCase() : "ACTIVO";
        String requestedStatus = InputSanitizer.cleanSingleLine(req.status);
        requestedStatus = requestedStatus != null ? requestedStatus.toUpperCase() : previousStatus;

        String cleanStatusReason = InputSanitizer.clean(req.statusReason);
        if (!previousStatus.equals(requestedStatus)) {
            if (cleanStatusReason == null || cleanStatusReason.length() < 5) {
                return badRequest("Debe ingresar una justificación obligatoria (mínimo 5 caracteres) para cambiar el estado operativo de la sede.");
            }
        }

        Response err = validateAndPopulate(consulate, req, id);
        if (err != null) {
            return err;
        }

        String logDetails = "Sede actualizada #" + consulate.id + ": " + consulate.type + " - " + consulate.location + " [" + consulate.status + "]";
        if (!previousStatus.equals(consulate.status) && cleanStatusReason != null) {
            logDetails += " | Cambio de " + previousStatus + " a " + consulate.status + " | Motivo: " + cleanStatusReason;
        }
        auditService.log(resolveCurrentUser(), jwtName(), "EDITAR_SEDE_CONSULAR", logDetails);

        return Response.ok(consulate).build();
    }

    @PUT
    @Path("/{id}/status")
    @RolesAllowed("ADMIN")
    @Transactional
    public Response cambiarEstado(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos del cambio de estado son obligatorios") StatusUpdateRequest body) {
        if (id == null || id <= 0) {
            return notFound();
        }
        Consulate consulate = Consulate.findById(id);
        if (consulate == null) {
            return notFound();
        }

        String nextStatus = InputSanitizer.cleanSingleLine(body.status);
        nextStatus = nextStatus != null ? nextStatus.toUpperCase() : "";
        if (!ALLOWED_STATUSES.contains(nextStatus)) {
            return badRequest("Estado operativo inválido. Use ACTIVO o INACTIVO.");
        }

        String cleanReason = InputSanitizer.clean(body.reason);
        if (cleanReason == null || cleanReason.length() < 5) {
            return badRequest("Debe ingresar el motivo o justificación (mínimo 5 caracteres) para activar o desactivar la sede.");
        }

        String prevStatus = consulate.status;
        consulate.status = nextStatus;

        auditService.log(resolveCurrentUser(), jwtName(), "CAMBIAR_ESTADO_SEDE",
                "Sede #" + consulate.id + " (" + consulate.location + ") cambió de " + prevStatus + " a " + nextStatus
                        + " | Motivo: " + cleanReason);

        return Response.ok(consulate).build();
    }

    @GET
    @Path("/export")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarExcel() {
        List<Consulate> list = obtenerConsulados(true);
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Directorio Consular");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {
                "ID", "Código", "Tipo de Sede", "Región", "País",
                "Ciudad / Ubicación", "Dirección Oficial", "Teléfono", "Correo Oficial", "Estado"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Consulate c : list) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(c.id != null ? c.id : 0);
                row.createCell(1).setCellValue(c.code != null ? c.code : "-");
                row.createCell(2).setCellValue(c.type != null ? c.type : "");
                row.createCell(3).setCellValue(c.region != null ? c.region : "");
                row.createCell(4).setCellValue(c.country != null ? c.country : "");
                row.createCell(5).setCellValue(c.location != null ? c.location : "");
                row.createCell(6).setCellValue(c.address != null ? c.address : "-");
                row.createCell(7).setCellValue(c.phone != null ? c.phone : "-");
                row.createCell(8).setCellValue(c.contactEmail != null ? c.contactEmail : "-");
                row.createCell(9).setCellValue(c.status != null ? c.status : "");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            auditService.log(resolveCurrentUser(), jwtName(), "EXPORTAR_DIRECTORIO",
                    "Exportación Excel del Directorio Consular (" + list.size() + " sedes)");

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"directorio_consular.xlsx\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo exportar el Directorio Consular"))
                    .build();
        }
    }

    private Response validateAndPopulate(Consulate target, ConsulateRequest req, Long excludeId) {
        String type = InputSanitizer.cleanSingleLine(req.type);
        type = type != null ? type.toUpperCase() : "";
        if (!ALLOWED_TYPES.contains(type)) {
            return badRequest("Tipo de sede no permitido. Seleccione EMBAJADA, CONSULADO o MISIÓN PERMANENTE.");
        }
        if ("MISION PERMANENTE".equals(type)) {
            type = "MISIÓN PERMANENTE";
        }

        String region = InputSanitizer.cleanSingleLine(req.region);
        String country = InputSanitizer.cleanSingleLine(req.country);
        String location = InputSanitizer.cleanSingleLine(req.location);
        if (region == null || country == null || location == null) {
            return badRequest("Región, país y ciudad/ubicación son obligatorios");
        }
        region = region.toUpperCase();

        String code = InputSanitizer.cleanSingleLine(req.code);
        if (code != null) {
            code = code.toUpperCase();
            long existingCodeCount = Consulate.count("UPPER(code) = ?1 AND id <> ?2", code, excludeId);
            if (existingCodeCount > 0) {
                return Response.status(Response.Status.CONFLICT)
                        .entity(Map.of("error", "El código '" + code + "' ya está asignado a otra sede consular"))
                        .build();
            }
        }

        long duplicateLocation = Consulate.count(
                "UPPER(type) = ?1 AND LOWER(country) = ?2 AND LOWER(location) = ?3 AND id <> ?4",
                type, country.toLowerCase(), location.toLowerCase(), excludeId
        );
        if (duplicateLocation > 0) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("error", "Ya existe una sede registrada con el mismo tipo, país y ciudad"))
                    .build();
        }

        String status = InputSanitizer.cleanSingleLine(req.status);
        status = status != null ? status.toUpperCase() : "ACTIVO";
        if (!ALLOWED_STATUSES.contains(status)) {
            return badRequest("Estado operativo inválido");
        }

        String email = InputSanitizer.cleanSingleLine(req.contactEmail);
        if (email != null) {
            email = email.toLowerCase();
        }

        target.code = code;
        target.type = type;
        target.region = region;
        target.country = country;
        target.location = location;
        target.address = InputSanitizer.clean(req.address);
        target.phone = InputSanitizer.cleanSingleLine(req.phone);
        target.contactEmail = email;
        target.status = status;

        return null;
    }

    private Response badRequest(String msg) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", msg))
                .build();
    }

    private Response notFound() {
        return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Sede consular no encontrada"))
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
