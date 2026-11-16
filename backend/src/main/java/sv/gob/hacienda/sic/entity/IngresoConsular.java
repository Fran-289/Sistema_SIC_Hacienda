package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ingreso_consular")
public class IngresoConsular extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "correlativo_documento", nullable = false, length = 50)
    public String correlativoDocumento;

    @Column(name = "consulado", nullable = false, length = 150)
    public String consulado;

    @Column(name = "tipo_tramite", nullable = false, length = 100)
    public String tipoTramite;

    @Column(name = "monto_usd", nullable = false, precision = 10, scale = 2)
    public BigDecimal montoUsd;

    @Column(name = "fecha_transaccion", nullable = false)
    public LocalDate fechaTransaccion;

    @Column(name = "nombre_solicitante", length = 150)
    public String nombreSolicitante;

    @Column(name = "observaciones", length = 255)
    public String observaciones;

    @Column(name = "estado", length = 20)
    public String estado = "REGISTRADO"; // REGISTRADO, CONCILIADO, ANULADO

    @Column(name = "fecha_registro")
    public LocalDateTime fechaRegistro = LocalDateTime.now();
}