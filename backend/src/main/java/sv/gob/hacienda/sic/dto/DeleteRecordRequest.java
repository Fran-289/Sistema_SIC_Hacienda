package sv.gob.hacienda.sic.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DeleteRecordRequest {

    @NotBlank(message = "El motivo de anulación es obligatorio")
    @Size(min = 5, max = 500, message = "El motivo debe contener entre 5 y 500 caracteres")
    public String motivo;
}
