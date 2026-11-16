package sv.gob.hacienda.sic.resource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.vertx.core.http.HttpServerRequest;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import sv.gob.hacienda.sic.dto.LoginRequest;
import sv.gob.hacienda.sic.dto.LoginResponse;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;
import sv.gob.hacienda.sic.security.LoginAttemptService;
import sv.gob.hacienda.sic.security.PasswordUtil;
import sv.gob.hacienda.sic.security.TokenService;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    TokenService tokenService;

    @Inject
    LoginAttemptService loginAttemptService;

    @Inject
    AuditService auditService;

    @Inject
    ObjectMapper objectMapper;

    @GET
    @PermitAll
    public Response getApiStatus() {
        return Response.ok(Map.of(
            "status", "UP",
            "system", "Sistema de Ingresos Consulares (SIC)",
            "institution", "Ministerio de Hacienda de El Salvador",
            "version", "1.0.0"
        )).build();
    }

    @POST
    @Path("/auth/login")
    @PermitAll
    public Response login(@Valid LoginRequest request, @Context HttpServerRequest httpRequest) {
        if (request == null || request.email == null || request.password == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new LoginResponse(false, null, "Correo y contraseña son obligatorios", null))
                .build();
        }

        String normalizedEmail = InputSanitizer.cleanSingleLine(request.email);
        if (normalizedEmail == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new LoginResponse(false, null, "Correo inválido", null))
                .build();
        }
        normalizedEmail = normalizedEmail.toLowerCase();
        String clientIp = resolveClientIp(httpRequest);

        if (loginAttemptService.isBlocked(clientIp, normalizedEmail)) {
            auditService.log(null, normalizedEmail, "LOGIN_BLOQUEADO",
                    "Cuenta/IP bloqueada temporalmente por múltiples intentos fallidos desde IP: " + clientIp);
            return Response.status(Response.Status.TOO_MANY_REQUESTS)
                .entity(new LoginResponse(false, null,
                    "Demasiados intentos fallidos. Por seguridad, espere 15 minutos antes de volver a intentar.", null))
                .build();
        }

        User user = User.findByEmail(normalizedEmail);
        boolean authenticated;
        if (user == null) {
            PasswordUtil.verifyDummy(request.password);
            authenticated = false;
        } else {
            authenticated = PasswordUtil.verify(request.password, user.password);
        }

        if (!authenticated) {
            loginAttemptService.recordFailure(clientIp, normalizedEmail);
            auditService.log(user, normalizedEmail, "LOGIN_FALLIDO",
                    "Intento de inicio de sesión fallido desde IP: " + clientIp);
            return Response.status(Response.Status.UNAUTHORIZED)
                .entity(new LoginResponse(false, null, "Credenciales incorrectas. Verifique su correo y contraseña.", null))
                .build();
        }

        loginAttemptService.recordSuccess(clientIp, normalizedEmail);
        String token = tokenService.generateToken(user);

        List<String> permissions = parsePermissions(user.permissions);

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.id);
        userInfo.put("email", user.email);
        userInfo.put("name", user.name);
        userInfo.put("role", user.role);
        userInfo.put("jobTitle", user.jobTitle != null ? user.jobTitle : "");
        userInfo.put("permissions", permissions);

        auditService.log(user, user.email, "LOGIN_EXITOSO",
                "Inicio de sesión exitoso desde IP: " + clientIp);

        return Response.ok(new LoginResponse(true, token, "Autenticación exitosa", userInfo)).build();
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

    private String resolveClientIp(HttpServerRequest req) {
        if (req == null) {
            return "unknown";
        }
        return req.remoteAddress() != null ? req.remoteAddress().hostAddress() : "unknown";
    }
}
