package sv.gob.hacienda.sic.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public class RecordRequest {

    @NotNull(message = "La fecha de depósito es obligatoria")
    public LocalDate depositDate;

    @NotNull(message = "El monto del depósito es obligatorio")
    @DecimalMin(value = "0.01", message = "El monto del depósito debe ser mayor a $0.00")
    @Digits(integer = 12, fraction = 2, message = "Formato inválido para el monto del depósito")
    public BigDecimal depositAmount;

    public LocalDate concentrationDate;

    @Min(value = 0, message = "Los días de concentración no pueden ser negativos")
    @Max(value = 3650, message = "Los días de concentración exceden el límite permitido")
    public Integer days;

    @Size(max = 100, message = "La región no puede exceder 100 caracteres")
    public String region;

    @Size(max = 100, message = "El país no puede exceder 100 caracteres")
    public String country;

    @Size(max = 150, message = "La sede consular no puede exceder 150 caracteres")
    public String location;

    @DecimalMin(value = "0.00", message = "El total de ingresos no puede ser negativo")
    @Digits(integer = 12, fraction = 2, message = "Formato inválido para total de ingresos")
    public BigDecimal totalIncome;

    @DecimalMin(value = "0.00", message = "El valor de pasaporte no puede ser negativo")
    @Digits(integer = 12, fraction = 2, message = "Formato inválido para valor de pasaporte")
    public BigDecimal passportValue;

    @DecimalMin(value = "0.00", message = "El valor de DUI no puede ser negativo")
    @Digits(integer = 12, fraction = 2, message = "Formato inválido para valor de DUI")
    public BigDecimal duiValue;

    @DecimalMin(value = "0.00", message = "El valor consular no puede ser negativo")
    @Digits(integer = 12, fraction = 2, message = "Formato inválido para valor consular")
    public BigDecimal consularValue;

    @DecimalMin(value = "0.00", message = "El valor de comisión no puede ser negativo")
    @Digits(integer = 12, fraction = 2, message = "Formato inválido para valor de comisión")
    public BigDecimal commissionValue;

    @NotBlank(message = "El estado del ingreso es obligatorio")
    @Size(max = 50, message = "El estado no puede exceder 50 caracteres")
    public String status;
}
