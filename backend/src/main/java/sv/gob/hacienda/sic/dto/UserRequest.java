package sv.gob.hacienda.sic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class UserRequest {

    @NotBlank(message = "El nombre completo es obligatorio")
    @Size(min = 3, max = 150, message = "El nombre debe tener entre 3 y 150 caracteres")
    public String name;

    @NotBlank(message = "El correo electrónico institucional es obligatorio")
    @Email(message = "Ingrese un correo electrónico válido")
    @Size(max = 150, message = "El correo no puede exceder 150 caracteres")
    public String email;

    @Size(max = 100, message = "El cargo no puede exceder 100 caracteres")
    public String jobTitle;

    @NotBlank(message = "El rol del usuario es obligatorio")
    @Size(max = 20, message = "El rol no puede exceder 20 caracteres")
    public String role;

    public List<String> permissions;

    @Size(max = 72, message = "La contraseña no puede exceder 72 caracteres")
    public String password;

    @Size(max = 20, message = "El estado no puede exceder 20 caracteres")
    public String status;

    @Size(max = 500, message = "La justificación no puede exceder 500 caracteres")
    public String statusReason;
}
