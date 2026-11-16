package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "informes_caja")
public class InformeCaja extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String correlative;

    @NotNull
    @Column(name = "bank_account", nullable = false, length = 50)
    public String bankAccount;

    @NotNull
    public Integer month;

    @NotNull
    public Integer year;

    @Column(name = "saldo_anterior", precision = 14, scale = 2)
    public BigDecimal saldoAnterior = BigDecimal.ZERO;

    @Column(name = "total_pasaporte", precision = 14, scale = 2)
    public BigDecimal totalPasaporte = BigDecimal.ZERO;

    @Column(name = "total_dui", precision = 14, scale = 2)
    public BigDecimal totalDui = BigDecimal.ZERO;

    @Column(name = "total_consulares", precision = 14, scale = 2)
    public BigDecimal totalConsulares = BigDecimal.ZERO;

    @Column(name = "total_diversos", precision = 14, scale = 2)
    public BigDecimal totalDiversos = BigDecimal.ZERO;

    @Column(name = "saldo_pendiente", precision = 14, scale = 2)
    public BigDecimal saldoPendiente = BigDecimal.ZERO;

    @NotNull
    @Column(nullable = false, length = 20)
    public String status = "PRELIMINAR";

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}