package sv.gob.hacienda.sic.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class IngresoConsularRequest {

    @NotBlank(message = "El correlativo del documento es obligatorio")
    @Size(max = 50, message = "El correlativo no puede exceder 50 caracteres")
    public String correlativoDocumento;

    @NotBlank(message = "El consulado es obligatorio")
    @Size(max = 150, message = "El consulado no puede exceder 150 caracteres")
    public String consulado;

    @NotBlank(message = "El tipo de trámite es obligatorio")
    @Size(max = 100, message = "El tipo de trámite no puede exceder 100 caracteres")
    public String tipoTramite;

    @NotNull(message = "El monto en USD es obligatorio")
    @DecimalMin(value = "0.01", message = "El monto debe ser mayor a $0.00")
    @Digits(integer = 8, fraction = 2, message = "Formato inválido para el monto USD")
    public BigDecimal montoUsd;

    @NotNull(message = "La fecha de transacción es obligatoria")
    public LocalDate fechaTransaccion;

    @Size(max = 150, message = "El nombre del solicitante no puede exceder 150 caracteres")
    public String nombreSolicitante;

    @Size(max = 255, message = "Las observaciones no pueden exceder 255 caracteres")
    public String observaciones;

    @Size(max = 20, message = "El estado no puede exceder 20 caracteres")
    public String estado;
}
