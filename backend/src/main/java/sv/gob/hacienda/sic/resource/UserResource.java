package sv.gob.hacienda.sic.resource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import sv.gob.hacienda.sic.dto.UserRequest;
import sv.gob.hacienda.sic.entity.SystemLog;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;
import sv.gob.hacienda.sic.security.LoginAttemptService;
import sv.gob.hacienda.sic.security.PasswordUtil;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("ADMIN")
public class UserResource {

    private static final Set<String> ALLOWED_ROLES = Set.of("ADMIN", "USER");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVO", "INACTIVO");
    private static final List<String> ALL_MODULES = List.of("ingresos", "reportes", "tareas", "directorio");
    private static final Set<String> ALLOWED_MODULES = Set.copyOf(ALL_MODULES);

    public static class StatusUpdateRequest {
        @NotBlank(message = "El estado es obligatorio")
        public String status;

        @NotBlank(message = "Debe ingresar el motivo o justificación del cambio de estado")
        @Size(min = 5, max = 500, message = "La justificación debe tener entre 5 y 500 caracteres")
        public String reason;
    }

    public static class PasswordResetRequest {
        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        public String newPassword;

        @Size(max = 500, message = "La observación no puede exceder 500 caracteres")
        public String reason;
    }

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @Inject
    LoginAttemptService loginAttemptService;

    @Inject
    ObjectMapper objectMapper;

    @GET
    public List<Map<String, Object>> listarUsuarios() {
        List<User> users = User.listAll(Sort.ascending("id"));

        // Obtener último acceso exitoso por usuario de manera parametrizada
        List<SystemLog> loginLogs = SystemLog.find(
                "action = ?1 ORDER BY createdAt DESC", "LOGIN_EXITOSO"
        ).list();

        Map<Long, String> lastLoginByUserId = new HashMap<>();
        Map<String, String> lastLoginByEmail = new HashMap<>();
        for (SystemLog log : loginLogs) {
            String ts = log.createdAt != null ? log.createdAt.toString() : null;
            if (ts == null) continue;
            if (log.user != null && log.user.id != null) {
                lastLoginByUserId.putIfAbsent(log.user.id, ts);
            }
            if (log.userName != null) {
                lastLoginByEmail.putIfAbsent(log.userName.toLowerCase(), ts);
            }
        }

        return users.stream().map(u -> {
            String lastLogin = lastLoginByUserId.get(u.id);
            if (lastLogin == null && u.email != null) {
                lastLogin = lastLoginByEmail.get(u.email.toLowerCase());
            }
            return toSafeDto(u, lastLogin);
        }).toList();
    }

    @GET
    @Path("/{id}")
    public Response obtenerPorId(@PathParam("id") Long id) {
        if (id == null || id <= 0) {
            return notFound();
        }
        User u = User.findById(id);
        if (u == null) {
            return notFound();
        }
        return Response.ok(toSafeDto(u, null)).build();
    }

    @GET
    @Path("/{id}/history")
    public Response obtenerHistorialUsuario(@PathParam("id") Long id) {
        if (id == null || id <= 0) {
            return notFound();
        }
        User target = User.findById(id);
        if (target == null) {
            return notFound();
        }

        String emailLower = target.email != null ? target.email.toLowerCase() : "";
        List<SystemLog> logs = SystemLog.find(
                "(user.id = ?1 OR LOWER(userName) = ?2 OR details LIKE ?3 OR details LIKE ?4) ORDER BY createdAt DESC, id DESC",
                id, emailLower, "%#" + id + ":%", "%#" + id + " %"
        ).page(0, 35).list();

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
    @Transactional
    public Response crear(@Valid @NotNull(message = "Los datos del usuario son obligatorios") UserRequest req) {
        String rawPass = req.password;
        String passErr = validatePasswordPolicy(rawPass);
        if (passErr != null) {
            return badRequest(passErr);
        }

        User target = new User();
        Response err = validateAndPopulate(target, req, 0L);
        if (err != null) {
            return err;
        }

        target.password = PasswordUtil.hash(rawPass);
        target.persist();

        auditService.log(resolveCurrentUser(), jwtName(), "CREAR_USUARIO",
                "Usuario creado #" + target.id + ": " + target.name + " (" + target.email + ") | Rol: " + target.role);

        return Response.status(Response.Status.CREATED).entity(toSafeDto(target, null)).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response actualizar(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos del usuario son obligatorios") UserRequest req) {
        if (id == null || id <= 0) {
            return notFound();
        }
        User target = User.findById(id);
        if (target == null) {
            return notFound();
        }

        User currentUser = resolveCurrentUser();
        String prevStatus = target.status != null ? target.status.toUpperCase() : "ACTIVO";
        String prevRole = target.role != null ? target.role.toUpperCase() : "USER";

        String requestedStatus = InputSanitizer.cleanSingleLine(req.status);
        requestedStatus = requestedStatus != null ? requestedStatus.toUpperCase() : prevStatus;

        String requestedRole = InputSanitizer.cleanSingleLine(req.role);
        requestedRole = requestedRole != null ? requestedRole.toUpperCase() : prevRole;

        if (currentUser != null && id.equals(currentUser.id)) {
            if ("INACTIVO".equals(requestedStatus)) {
                return badRequest("Por seguridad, no puede desactivar su propia cuenta en sesión.");
            }
            if (!"ADMIN".equals(requestedRole)) {
                return badRequest("Por seguridad, no puede quitarse a sí mismo el rol de Administrador.");
            }
        }

        if ("ADMIN".equals(prevRole) && "ACTIVO".equals(prevStatus)
                && (!"ADMIN".equals(requestedRole) || !"ACTIVO".equals(requestedStatus))) {
            long activeAdmins = User.count("role = 'ADMIN' AND status = 'ACTIVO' AND id <> ?1", id);
            if (activeAdmins == 0) {
                return badRequest("Debe existir al menos un usuario Administrador ACTIVO en el sistema.");
            }
        }

        String cleanReason = InputSanitizer.clean(req.statusReason);
        if (!prevStatus.equals(requestedStatus)) {
            if (cleanReason == null || cleanReason.length() < 5) {
                return badRequest("Debe ingresar una justificación obligatoria (mínimo 5 caracteres) para cambiar el estado del usuario.");
            }
        }

        boolean passwordChanged = false;
        if (req.password != null && !req.password.isBlank()) {
            String passErr = validatePasswordPolicy(req.password);
            if (passErr != null) {
                return badRequest(passErr);
            }
            target.password = PasswordUtil.hash(req.password);
            passwordChanged = true;
        }

        Response err = validateAndPopulate(target, req, id);
        if (err != null) {
            return err;
        }

        if ("ACTIVO".equals(target.status) || passwordChanged) {
            loginAttemptService.clearBlocksForEmail(target.email);
        }

        String logDetails = "Usuario actualizado #" + target.id + ": " + target.name + " (" + target.email + ") | Rol: " + target.role + " [" + target.status + "]";
        if (!prevStatus.equals(target.status) && cleanReason != null) {
            logDetails += " | Cambio de estado " + prevStatus + " -> " + target.status + " | Motivo: " + cleanReason;
        }
        if (passwordChanged) {
            logDetails += " | Contraseña actualizada";
        }
        auditService.log(currentUser, jwtName(), "EDITAR_USUARIO", logDetails);

        return Response.ok(toSafeDto(target, null)).build();
    }

    @PUT
    @Path("/{id}/status")
    @Transactional
    public Response cambiarEstado(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos del cambio de estado son obligatorios") StatusUpdateRequest body) {
        if (id == null || id <= 0) {
            return notFound();
        }
        User target = User.findById(id);
        if (target == null) {
            return notFound();
        }

        String nextStatus = InputSanitizer.cleanSingleLine(body.status);
        nextStatus = nextStatus != null ? nextStatus.toUpperCase() : "";
        if (!ALLOWED_STATUSES.contains(nextStatus)) {
            return badRequest("Estado inválido. Use ACTIVO o INACTIVO.");
        }

        String cleanReason = InputSanitizer.clean(body.reason);
        if (cleanReason == null || cleanReason.length() < 5) {
            return badRequest("Debe ingresar obligatoriamente el motivo o justificación (mínimo 5 caracteres).");
        }

        User currentUser = resolveCurrentUser();
        if (currentUser != null && id.equals(currentUser.id) && "INACTIVO".equals(nextStatus)) {
            return badRequest("Por seguridad, no puede desactivar su propia cuenta en sesión.");
        }

        if ("ADMIN".equalsIgnoreCase(target.role) && "INACTIVO".equals(nextStatus)) {
            long otherActiveAdmins = User.count("role = 'ADMIN' AND status = 'ACTIVO' AND id <> ?1", id);
            if (otherActiveAdmins == 0) {
                return badRequest("No se puede desactivar el único Administrador activo del sistema.");
            }
        }

        String prevStatus = target.status != null ? target.status : "ACTIVO";
        target.status = nextStatus;

        if ("ACTIVO".equals(nextStatus)) {
            loginAttemptService.clearBlocksForEmail(target.email);
        }

        auditService.log(currentUser, jwtName(), "CAMBIAR_ESTADO_USUARIO",
                "Usuario #" + target.id + " (" + target.email + ") cambió de " + prevStatus + " a " + nextStatus
                        + " | Motivo: " + cleanReason);

        return Response.ok(toSafeDto(target, null)).build();
    }

    @PUT
    @Path("/{id}/password")
    @Transactional
    public Response restablecerPassword(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos de contraseña son obligatorios") PasswordResetRequest body) {
        if (id == null || id <= 0) {
            return notFound();
        }
        User target = User.findById(id);
        if (target == null) {
            return notFound();
        }

        String passErr = validatePasswordPolicy(body.newPassword);
        if (passErr != null) {
            return badRequest(passErr);
        }

        target.password = PasswordUtil.hash(body.newPassword);
        loginAttemptService.clearBlocksForEmail(target.email);

        String cleanNote = InputSanitizer.clean(body.reason);
        String detail = "Contraseña restablecida para usuario #" + target.id + " (" + target.email + ") y bloqueos de login liberados";
        if (cleanNote != null && !cleanNote.isBlank()) {
            detail += " | Observación: " + cleanNote;
        }
        auditService.log(resolveCurrentUser(), jwtName(), "RESTABLECER_PASSWORD", detail);

        return Response.ok(Map.of("message", "Contraseña actualizada correctamente")).build();
    }

    @GET
    @Path("/export")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarExcel() {
        List<User> list = User.listAll(Sort.ascending("id"));
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Usuarios SIC");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {
                "ID", "Nombre Completo", "Correo Institucional", "Cargo",
                "Rol", "Módulos Habilitados", "Estado", "Fecha Registro"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (User u : list) {
                Row row = sheet.createRow(rowIdx++);
                List<String> perms = "ADMIN".equalsIgnoreCase(u.role) ? ALL_MODULES : parsePermissions(u.permissions);
                row.createCell(0).setCellValue(u.id != null ? u.id : 0);
                row.createCell(1).setCellValue(u.name != null ? u.name : "");
                row.createCell(2).setCellValue(u.email != null ? u.email : "");
                row.createCell(3).setCellValue(u.jobTitle != null && !u.jobTitle.isBlank() ? u.jobTitle : "-");
                row.createCell(4).setCellValue(u.role != null ? u.role : "USER");
                row.createCell(5).setCellValue("ADMIN".equalsIgnoreCase(u.role) ? "ACCESO TOTAL" : String.join(", ", perms));
                row.createCell(6).setCellValue(u.status != null ? u.status : "ACTIVO");
                row.createCell(7).setCellValue(u.createdAt != null ? u.createdAt.toString().replace('T', ' ').substring(0, Math.min(16, u.createdAt.toString().length())) : "-");
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            auditService.log(resolveCurrentUser(), jwtName(), "EXPORTAR_USUARIOS",
                    "Exportación Excel del listado de usuarios (" + list.size() + " cuentas)");

            return Response.ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=\"usuarios_sic.xlsx\"")
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "No se pudo exportar el listado de usuarios"))
                    .build();
        }
    }

    private Response validateAndPopulate(User target, UserRequest req, Long excludeId) {
        String name = InputSanitizer.cleanSingleLine(req.name);
        if (name == null || name.length() < 3) {
            return badRequest("El nombre completo debe tener al menos 3 caracteres.");
        }

        String email = InputSanitizer.cleanSingleLine(req.email);
        if (email == null || !email.contains("@")) {
            return badRequest("Ingrese un correo electrónico institucional válido.");
        }
        email = email.toLowerCase();

        long duplicateEmail = User.count("LOWER(email) = ?1 AND id <> ?2", email, excludeId);
        if (duplicateEmail > 0) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("error", "El correo '" + email + "' ya pertenece a otro usuario registrado."))
                    .build();
        }

        String role = InputSanitizer.cleanSingleLine(req.role);
        role = role != null ? role.toUpperCase() : "";
        if (!ALLOWED_ROLES.contains(role)) {
            return badRequest("Rol inválido. Seleccione ADMIN o USER.");
        }

        String status = InputSanitizer.cleanSingleLine(req.status);
        status = status != null ? status.toUpperCase() : (target.status != null ? target.status : "ACTIVO");
        if (!ALLOWED_STATUSES.contains(status)) {
            return badRequest("Estado inválido. Seleccione ACTIVO o INACTIVO.");
        }

        List<String> validPerms = new ArrayList<>();
        if ("ADMIN".equals(role)) {
            validPerms.addAll(ALL_MODULES);
        } else {
            if (req.permissions != null) {
                for (String p : req.permissions) {
                    String cleanP = InputSanitizer.cleanSingleLine(p);
                    if (cleanP != null) {
                        cleanP = cleanP.toLowerCase();
                        if (ALLOWED_MODULES.contains(cleanP) && !validPerms.contains(cleanP)) {
                            validPerms.add(cleanP);
                        }
                    }
                }
            }
            if (validPerms.isEmpty()) {
                return badRequest("Seleccione al menos un módulo habilitado para el usuario con rol Operador (USER).");
            }
        }

        String permissionsJson;
        try {
            permissionsJson = objectMapper.writeValueAsString(validPerms);
        } catch (Exception e) {
            permissionsJson = "[\"ingresos\"]";
        }

        target.name = name;
        target.email = email;
        target.jobTitle = InputSanitizer.cleanSingleLine(req.jobTitle);
        target.role = role;
        target.status = status;
        target.permissions = permissionsJson;

        return null;
    }

    private String validatePasswordPolicy(String password) {
        if (password == null || password.length() < 8) {
            return "La contraseña debe contener al menos 8 caracteres.";
        }
        if (password.length() > 72) {
            return "La contraseña no puede exceder 72 caracteres.";
        }
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        for (int i = 0; i < password.length(); i++) {
            char c = password.charAt(i);
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
        }
        if (!hasUpper || !hasLower || !hasDigit) {
            return "Por seguridad, la contraseña debe incluir al menos una mayúscula, una minúscula y un número.";
        }
        return null;
    }

    private Map<String, Object> toSafeDto(User u, String lastLoginAt) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", u.id);
        dto.put("name", u.name != null ? u.name : "");
        dto.put("email", u.email != null ? u.email : "");
        dto.put("jobTitle", u.jobTitle != null ? u.jobTitle : "");
        dto.put("role", u.role != null ? u.role : "USER");
        dto.put("status", u.status != null ? u.status : "ACTIVO");
        List<String> perms = "ADMIN".equalsIgnoreCase(u.role) ? ALL_MODULES : parsePermissions(u.permissions);
        dto.put("permissions", perms);
        dto.put("createdAt", u.createdAt != null ? u.createdAt.toString() : null);
        dto.put("updatedAt", u.updatedAt != null ? u.updatedAt.toString() : null);
        dto.put("lastLoginAt", lastLoginAt);
        return dto;
    }

    private List<String> parsePermissions(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(rawJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private Response badRequest(String msg) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", msg))
                .build();
    }

    private Response notFound() {
        return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Usuario no encontrado"))
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
