package sv.gob.hacienda.sic.security;

import com.fasterxml.jackson.core.JsonProcessingException;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.util.Map;
import java.util.stream.Collectors;

@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    private static final Logger LOG = Logger.getLogger(GlobalExceptionMapper.class);

    @Override
    public Response toResponse(Throwable exception) {
        if (exception instanceof ConstraintViolationException cve) {
            String msg = cve.getConstraintViolations().stream()
                    .map(ConstraintViolation::getMessage)
                    .distinct()
                    .collect(Collectors.joining(". "));
            return jsonError(Response.Status.BAD_REQUEST, msg.isBlank() ? "Datos de entrada inválidos" : msg);
        }

        if (exception instanceof JsonProcessingException) {
            return jsonError(Response.Status.BAD_REQUEST, "Formato JSON o tipo de dato inválido en la solicitud");
        }

        if (exception instanceof UnauthorizedException) {
            return jsonError(Response.Status.UNAUTHORIZED, "No autenticado o sesión expirada");
        }

        if (exception instanceof ForbiddenException) {
            return jsonError(Response.Status.FORBIDDEN, "No cuenta con permisos para realizar esta acción");
        }

        if (exception instanceof WebApplicationException wae) {
            Response original = wae.getResponse();
            if (original != null && original.hasEntity()) {
                return original;
            }
            int code = original != null ? original.getStatus() : 400;
            return Response.status(code)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", "Solicitud rechazada (" + code + ")"))
                    .build();
        }

        LOG.error("Excepción no controlada en el servidor", exception);
        return jsonError(Response.Status.INTERNAL_SERVER_ERROR, "Error interno del servidor. Intente nuevamente.");
    }

    private Response jsonError(Response.Status status, String message) {
        return Response.status(status)
                .type(MediaType.APPLICATION_JSON)
                .entity(Map.of("error", message))
                .build();
    }
}
