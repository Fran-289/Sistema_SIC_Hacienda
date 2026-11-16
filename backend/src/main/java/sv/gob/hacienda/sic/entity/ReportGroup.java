package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "report_groups")
public class ReportGroup extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotNull
    @Column(nullable = false, length = 50)
    public String correlative;

    @NotNull
    @Column(name = "group_type", nullable = false, length = 100)
    public String groupType;

    @NotNull
    @Column(name = "period_month", nullable = false)
    public Integer periodMonth;

    @NotNull
    @Column(name = "period_year", nullable = false)
    public Integer periodYear;

    @NotNull
    @Column(nullable = false, length = 30)
    public String status = "PRELIMINAR";

    @NotNull
    @Column(name = "process_status", nullable = false, length = 50)
    public String processStatus = "Generado";

    @ManyToOne
    @JoinColumn(name = "created_by_id", nullable = false)
    public User createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}