package sv.gob.hacienda.sic.resource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import sv.gob.hacienda.sic.entity.SystemSetting;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;
import sv.gob.hacienda.sic.util.BusinessDayCalculator;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Path("/api/settings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class SettingResource {

    private static final Pattern ACCOUNT_PATTERN = Pattern.compile("^[0-9A-Za-z\\-\\s]{4,40}$");

    private static final Map<String, String> DEFAULTS = Map.of(
            "INSTITUTION_NAME", "Ministerio de Hacienda - Dirección General de Tesorería",
            "DEPARTMENT_NAME", "División de Fondos Ajenos en Custodia - Ingresos Consulares",
            "BANK_ACCOUNT_DEFAULT", "00110000112233",
            "BANK_ACCOUNT_NAME", "INGRESOS CONSULARES",
            "CONCENTRATION_MAX_DAYS", "5",
            "STAMP_REQUIRED", "true",
            "CUSTOM_HOLIDAYS", "",
            "CUSTOM_HOLIDAYS_META", "[]"
    );

    public static class SettingUpdateRequest {
        @NotBlank(message = "El nombre de la institución es obligatorio")
        @Size(max = 200, message = "El nombre de la institución no puede exceder 200 caracteres")
        public String institutionName;

        @NotBlank(message = "El nombre de la unidad o división es obligatorio")
        @Size(max = 200, message = "El nombre de la unidad no puede exceder 200 caracteres")
        public String departmentName;

        @NotBlank(message = "El número de cuenta concentradora es obligatorio")
        @Size(max = 40, message = "El número de cuenta no puede exceder 40 caracteres")
        public String bankAccountDefault;

        @NotBlank(message = "La denominación de la cuenta bancaria es obligatoria")
        @Size(max = 150, message = "La denominación de la cuenta no puede exceder 150 caracteres")
        public String bankAccountName;

        @NotNull(message = "El plazo máximo de concentración es obligatorio")
        @Min(value = 1, message = "El plazo mínimo permitido es de 1 día hábil")
        @Max(value = 30, message = "El plazo máximo permitido es de 30 días hábiles")
        public Integer concentrationMaxDays;

        @NotNull(message = "Debe indicar si se requiere sello institucional en PDF")
        public Boolean stampRequired;
    }

    public static class CustomHolidayItem {
        @NotBlank(message = "La fecha del asueto es obligatoria")
        @Size(min = 10, max = 10, message = "La fecha debe tener formato YYYY-MM-DD")
        public String date;

        @NotBlank(message = "Debe ingresar la descripción o decreto del asueto")
        @Size(min = 3, max = 160, message = "La descripción debe tener entre 3 y 160 caracteres")
        public String label;
    }

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @Inject
    ObjectMapper objectMapper;

    @GET
    public Map<String, String> obtenerConfiguracion() {
        Map<String, String> map = new LinkedHashMap<>(DEFAULTS);
        List<SystemSetting> settings = SystemSetting.listAll();
        for (SystemSetting s : settings) {
            if (s.settingKey != null && s.settingValue != null) {
                map.put(s.settingKey, s.settingValue);
            }
        }
        // Sincronizar metadatos si existieran fechas legadas en CUSTOM_HOLIDAYS sin CUSTOM_HOLIDAYS_META
        List<Map<String, String>> mergedHolidays = readNormalizedHolidays(
                map.get("CUSTOM_HOLIDAYS"),
                map.get("CUSTOM_HOLIDAYS_META")
        );
        try {
            map.put("CUSTOM_HOLIDAYS_META", objectMapper.writeValueAsString(mergedHolidays));
        } catch (Exception ignored) {
        }
        return map;
    }

    @PUT
    @RolesAllowed("ADMIN")
    @Transactional
    public Response actualizarConfiguracion(@Valid SettingUpdateRequest req) {
        if (req == null) {
            return badRequest("Datos de configuración inválidos");
        }

        String institutionName = InputSanitizer.cleanSingleLine(req.institutionName);
        String departmentName = InputSanitizer.cleanSingleLine(req.departmentName);
        String bankAccountDefault = InputSanitizer.cleanSingleLine(req.bankAccountDefault);
        String bankAccountName = InputSanitizer.cleanSingleLine(req.bankAccountName);

        if (institutionName == null || institutionName.length() < 5) {
            return badRequest("Ingrese un nombre institucional válido (mínimo 5 caracteres).");
        }
        if (departmentName == null || departmentName.length() < 5) {
            return badRequest("Ingrese el nombre de la unidad o división responsable (mínimo 5 caracteres).");
        }
        if (bankAccountDefault == null || !ACCOUNT_PATTERN.matcher(bankAccountDefault).matches()) {
            return badRequest("El número de cuenta concentradora contiene caracteres no permitidos (use dígitos, letras o guiones, entre 4 y 40 caracteres).");
        }
        if (bankAccountName == null || bankAccountName.length() < 3) {
            return badRequest("Ingrese la denominación de la cuenta concentradora (mínimo 3 caracteres).");
        }
        if (req.concentrationMaxDays == null || req.concentrationMaxDays < 1 || req.concentrationMaxDays > 30) {
            return badRequest("El plazo máximo de concentración debe estar entre 1 y 30 días hábiles.");
        }

        List<String> changes = new ArrayList<>();
        upsertSetting("INSTITUTION_NAME", institutionName, "Institución", changes);
        upsertSetting("DEPARTMENT_NAME", departmentName, "Unidad/División", changes);
        upsertSetting("BANK_ACCOUNT_DEFAULT", bankAccountDefault, "Cuenta BCR", changes);
        upsertSetting("BANK_ACCOUNT_NAME", bankAccountName.toUpperCase(), "Denominación Cuenta", changes);
        upsertSetting("CONCENTRATION_MAX_DAYS", String.valueOf(req.concentrationMaxDays), "Plazo Máx. Concentración (días)", changes);
        upsertSetting("STAMP_REQUIRED", String.valueOf(Boolean.TRUE.equals(req.stampRequired)), "Sello PDF", changes);

        String summary = changes.isEmpty()
                ? "Revisión/guardado de parámetros institucionales sin cambios de valor"
                : "Parámetros actualizados: " + String.join(" | ", changes);

        auditService.log(resolveCurrentUser(), jwtName(), "ACTUALIZAR_CONFIGURACION", summary);

        return Response.ok(obtenerConfiguracion()).build();
    }

    @POST
    @Path("/holidays")
    @RolesAllowed("ADMIN")
    @Transactional
    public Response agregarAsueto(@Valid CustomHolidayItem req) {
        if (req == null) {
            return badRequest("Datos del asueto inválidos");
        }

        String rawDate = InputSanitizer.cleanSingleLine(req.date);
        String label = InputSanitizer.cleanSingleLine(req.label);

        if (rawDate == null || label == null || label.length() < 3) {
            return badRequest("Debe indicar una fecha válida (YYYY-MM-DD) y la descripción del decreto o asueto.");
        }

        LocalDate parsedDate;
        try {
            parsedDate = LocalDate.parse(rawDate);
        } catch (DateTimeParseException e) {
            return badRequest("Formato de fecha inválido. Utilice YYYY-MM-DD.");
        }

        if (parsedDate.getYear() < 2020 || parsedDate.getYear() > 2100) {
            return badRequest("El año del asueto debe estar comprendido entre 2020 y 2100.");
        }

        String isoDate = parsedDate.toString();
        Map<String, String> current = obtenerConfiguracion();
        List<Map<String, String>> list = new ArrayList<>(readNormalizedHolidays(
                current.get("CUSTOM_HOLIDAYS"),
                current.get("CUSTOM_HOLIDAYS_META")
        ));

        boolean updatedExisting = false;
        for (Map<String, String> item : list) {
            if (isoDate.equals(item.get("date"))) {
                item.put("label", label);
                updatedExisting = true;
                break;
            }
        }
        if (!updatedExisting) {
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("date", isoDate);
            entry.put("label", label);
            list.add(entry);
        }

        persistHolidayList(list);

        auditService.log(
                resolveCurrentUser(),
                jwtName(),
                updatedExisting ? "ACTUALIZAR_ASUETO" : "AGREGAR_ASUETO",
                (updatedExisting ? "Actualización de asueto institucional: " : "Nuevo asueto institucional registrado: ")
                        + isoDate + " — " + label
        );

        return Response.ok(obtenerConfiguracion()).build();
    }

    @DELETE
    @Path("/holidays/{date}")
    @RolesAllowed("ADMIN")
    @Transactional
    public Response eliminarAsueto(@PathParam("date") String dateParam) {
        String cleanDate = InputSanitizer.cleanSingleLine(dateParam);
        if (cleanDate == null) {
            return badRequest("Fecha de asueto inválida");
        }

        LocalDate parsed;
        try {
            parsed = LocalDate.parse(cleanDate);
        } catch (DateTimeParseException e) {
            return badRequest("Formato de fecha inválido. Utilice YYYY-MM-DD.");
        }

        String isoDate = parsed.toString();
        Map<String, String> current = obtenerConfiguracion();
        List<Map<String, String>> list = new ArrayList<>(readNormalizedHolidays(
                current.get("CUSTOM_HOLIDAYS"),
                current.get("CUSTOM_HOLIDAYS_META")
        ));

        String removedLabel = null;
        var iterator = list.iterator();
        while (iterator.hasNext()) {
            Map<String, String> item = iterator.next();
            if (isoDate.equals(item.get("date"))) {
                removedLabel = item.get("label");
                iterator.remove();
            }
        }

        if (removedLabel == null) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", "No se encontró un asueto personalizado para la fecha " + isoDate))
                    .build();
        }

        persistHolidayList(list);

        auditService.log(
                resolveCurrentUser(),
                jwtName(),
                "ELIMINAR_ASUETO",
                "Eliminación de asueto institucional: " + isoDate + " — " + removedLabel
        );

        return Response.ok(obtenerConfiguracion()).build();
    }

    private void persistHolidayList(List<Map<String, String>> list) {
        list.sort(Comparator.comparing(m -> m.getOrDefault("date", "")));
        String csvDates = list.stream()
                .map(m -> m.get("date"))
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.joining(","));

        String metaJson = "[]";
        try {
            metaJson = objectMapper.writeValueAsString(list);
        } catch (Exception ignored) {
        }

        saveSettingDirect("CUSTOM_HOLIDAYS", csvDates);
        saveSettingDirect("CUSTOM_HOLIDAYS_META", metaJson);
    }

    private List<Map<String, String>> readNormalizedHolidays(String rawCsv, String rawMetaJson) {
        Map<String, String> byDate = new LinkedHashMap<>();

        if (rawMetaJson != null && !rawMetaJson.isBlank()) {
            try {
                List<Map<String, String>> parsed = objectMapper.readValue(
                        rawMetaJson,
                        new TypeReference<List<Map<String, String>>>() {}
                );
                for (Map<String, String> item : parsed) {
                    String d = InputSanitizer.cleanSingleLine(item.get("date"));
                    String l = InputSanitizer.cleanSingleLine(item.get("label"));
                    if (d != null && isValidIsoDate(d)) {
                        byDate.put(d, l != null ? l : "Asueto institucional");
                    }
                }
            } catch (Exception ignored) {
            }
        }

        Set<LocalDate> csvDates = BusinessDayCalculator.parseCustomHolidays(rawCsv);
        for (LocalDate d : csvDates) {
            byDate.putIfAbsent(d.toString(), "Asueto / Decreto institucional");
        }

        return byDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("date", e.getKey());
                    m.put("label", e.getValue());
                    return m;
                })
                .toList();
    }

    private boolean isValidIsoDate(String val) {
        try {
            LocalDate.parse(val);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void upsertSetting(String key, String newValue, String label, List<String> changes) {
        SystemSetting existing = SystemSetting.findById(key);
        String oldVal = existing != null ? existing.settingValue : DEFAULTS.getOrDefault(key, "");
        if (!Objects.equals(oldVal, newValue)) {
            changes.add(label + ": '" + oldVal + "' -> '" + newValue + "'");
        }
        if (existing == null) {
            existing = new SystemSetting();
            existing.settingKey = key;
            existing.settingValue = newValue;
            existing.persist();
        } else {
            existing.settingValue = newValue;
        }
    }

    private void saveSettingDirect(String key, String value) {
        SystemSetting existing = SystemSetting.findById(key);
        if (existing == null) {
            existing = new SystemSetting();
            existing.settingKey = key;
            existing.settingValue = value != null ? value : "";
            existing.persist();
        } else {
            existing.settingValue = value != null ? value : "";
        }
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
