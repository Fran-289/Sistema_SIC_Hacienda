package sv.gob.hacienda.sic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ConsulateRequest {

    @Size(max = 30, message = "El código no puede exceder 30 caracteres")
    @Pattern(regexp = "^[A-Za-z0-9\\-_]*$", message = "El código solo permite letras, números, guiones y guion bajo")
    public String code;

    @NotBlank(message = "El tipo de sede es obligatorio")
    @Size(max = 20, message = "El tipo no puede exceder 20 caracteres")
    public String type;

    @NotBlank(message = "La región es obligatoria")
    @Size(max = 100, message = "La región no puede exceder 100 caracteres")
    public String region;

    @NotBlank(message = "El país es obligatorio")
    @Size(max = 100, message = "El país no puede exceder 100 caracteres")
    public String country;

    @NotBlank(message = "La ciudad o ubicación de la sede es obligatoria")
    @Size(max = 150, message = "La ubicación no puede exceder 150 caracteres")
    public String location;

    @Size(max = 500, message = "La dirección no puede exceder 500 caracteres")
    public String address;

    @Size(max = 50, message = "El teléfono no puede exceder 50 caracteres")
    public String phone;

    @Email(message = "El correo electrónico de contacto no es válido")
    @Size(max = 150, message = "El correo de contacto no puede exceder 150 caracteres")
    public String contactEmail;

    @Size(max = 20, message = "El estado no puede exceder 20 caracteres")
    public String status;

    @Size(max = 500, message = "La justificación no puede exceder 500 caracteres")
    public String statusReason;
}
