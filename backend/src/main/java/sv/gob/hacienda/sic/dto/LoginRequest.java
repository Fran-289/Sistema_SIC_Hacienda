package sv.gob.hacienda.sic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Debe ser un correo válido")
    @Size(max = 150, message = "El correo no puede exceder 150 caracteres")
    public String email;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 1, max = 72, message = "La contraseña excede la longitud permitida")
    public String password;
}
