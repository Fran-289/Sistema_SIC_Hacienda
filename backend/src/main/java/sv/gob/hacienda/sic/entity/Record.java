package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "records")
public class Record extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotNull
    @Column(name = "deposit_date", nullable = false)
    public LocalDate depositDate;

    @NotNull
    @Column(name = "deposit_amount", nullable = false, precision = 14, scale = 2)
    public BigDecimal depositAmount;

    @Column(name = "concentration_date")
    public LocalDate concentrationDate;

    public Integer days;
    public String region;
    public String country;
    public String location;

    @Column(name = "passport_value", precision = 14, scale = 2)
    public BigDecimal passportValue = BigDecimal.ZERO;

    @Column(name = "dui_value", precision = 14, scale = 2)
    public BigDecimal duiValue = BigDecimal.ZERO;

    @Column(name = "consular_value", precision = 14, scale = 2)
    public BigDecimal consularValue = BigDecimal.ZERO;

    @Column(name = "commission_value", precision = 14, scale = 2)
    public BigDecimal commissionValue = BigDecimal.ZERO;

    @Column(name = "diversos_value", precision = 14, scale = 2)
    public BigDecimal diversosValue = BigDecimal.ZERO;

    @NotNull
    @Column(nullable = false, length = 50)
    public String status = "NO IDENTIFICADO";

    @Column(name = "deleted_at")
    public LocalDateTime deletedAt;

    @Column(name = "delete_reason")
    public String deleteReason;

    @ManyToOne
    @JoinColumn(name = "informe_caja_id")
    public InformeCaja informeCaja;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    public User createdBy;

    @ManyToOne
    @JoinColumn(name = "updated_by_id")
    public User updatedBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}