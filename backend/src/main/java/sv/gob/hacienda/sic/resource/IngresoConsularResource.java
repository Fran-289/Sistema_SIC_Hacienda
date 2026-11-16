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
import org.eclipse.microprofile.jwt.JsonWebToken;
import sv.gob.hacienda.sic.dto.IngresoConsularRequest;
import sv.gob.hacienda.sic.entity.IngresoConsular;
import sv.gob.hacienda.sic.entity.User;
import sv.gob.hacienda.sic.security.AuditService;
import sv.gob.hacienda.sic.security.InputSanitizer;

import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/ingresos")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class IngresoConsularResource {

    private static final Set<String> VALID_ESTADOS = Set.of("REGISTRADO", "CONCILIADO", "ANULADO");

    @Inject
    JsonWebToken jwt;

    @Inject
    AuditService auditService;

    @GET
    public List<IngresoConsular> obtenerTodos() {
        return IngresoConsular.list(
            "estado <> ?1",
            Sort.descending("fechaTransaccion").and("id", Sort.Direction.Descending),
            "ANULADO"
        );
    }

    @POST
    @Transactional
    public Response crear(@Valid @NotNull(message = "Los datos del ingreso son obligatorios") IngresoConsularRequest datos) {
        IngresoConsular ingreso = new IngresoConsular();
        Response err = applyRequest(ingreso, datos);
        if (err != null) {
            return err;
        }
        ingreso.persist();

        auditService.log(currentUser(), jwtName(), "CREAR_INGRESO_CONSULAR",
                "Ingreso consular #" + ingreso.id + " creado (" + ingreso.correlativoDocumento + ")");

        return Response.status(Response.Status.CREATED).entity(ingreso).build();
    }

    @GET
    @Path("/{id}")
    public Response obtenerPorId(@PathParam("id") Long id) {
        IngresoConsular ingreso = findActive(id);
        if (ingreso == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Registro de ingreso no encontrado"))
                .build();
        }
        return Response.ok(ingreso).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response actualizar(
            @PathParam("id") Long id,
            @Valid @NotNull(message = "Los datos del ingreso son obligatorios") IngresoConsularRequest datos) {
        IngresoConsular ingreso = findActive(id);
        if (ingreso == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Registro de ingreso no encontrado"))
                .build();
        }
        Response err = applyRequest(ingreso, datos);
        if (err != null) {
            return err;
        }

        auditService.log(currentUser(), jwtName(), "EDITAR_INGRESO_CONSULAR",
                "Ingreso consular #" + ingreso.id + " actualizado");

        return Response.ok(ingreso).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response eliminar(@PathParam("id") Long id) {
        IngresoConsular ingreso = findActive(id);
        if (ingreso == null) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("error", "Registro de ingreso no encontrado"))
                .build();
        }
        ingreso.estado = "ANULADO";
        auditService.log(currentUser(), jwtName(), "ANULAR_INGRESO_CONSULAR",
                "Ingreso consular #" + ingreso.id + " marcado como ANULADO");
        return Response.ok(Map.of("success", true, "message", "Registro anulado exitosamente")).build();
    }

    private IngresoConsular findActive(Long id) {
        if (id == null || id <= 0) {
            return null;
        }
        return IngresoConsular.find("id = ?1 and estado <> ?2", id, "ANULADO").firstResult();
    }

    private Response applyRequest(IngresoConsular target, IngresoConsularRequest datos) {
        String correlativo = InputSanitizer.cleanSingleLine(datos.correlativoDocumento);
        String consulado = InputSanitizer.cleanSingleLine(datos.consulado);
        String tramite = InputSanitizer.cleanSingleLine(datos.tipoTramite);
        if (correlativo == null || consulado == null || tramite == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", "Correlativo, consulado y tipo de trámite son obligatorios"))
                .build();
        }

        String estado = datos.estado != null ? InputSanitizer.cleanSingleLine(datos.estado) : "REGISTRADO";
        estado = estado != null ? estado.toUpperCase() : "REGISTRADO";
        if (!VALID_ESTADOS.contains(estado)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("error", "Estado no válido"))
                .build();
        }

        target.correlativoDocumento = correlativo;
        target.consulado = consulado;
        target.tipoTramite = tramite;
        target.montoUsd = datos.montoUsd.setScale(2, RoundingMode.HALF_UP);
        target.fechaTransaccion = datos.fechaTransaccion;
        target.nombreSolicitante = InputSanitizer.cleanSingleLine(datos.nombreSolicitante);
        target.observaciones = InputSanitizer.clean(datos.observaciones);
        target.estado = estado;
        return null;
    }

    private User currentUser() {
        String email = jwtName();
        return email != null ? User.findByEmail(email) : null;
    }

    private String jwtName() {
        return (jwt != null && jwt.getName() != null && !jwt.getName().isBlank()) ? jwt.getName() : null;
    }
}
