package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "report_histories")
public class ReportHistory extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    public User user;

    @NotNull
    @Column(name = "report_type", nullable = false, length = 50)
    public String reportType;

    @NotNull
    @Column(name = "period_month", nullable = false)
    public Integer periodMonth;

    @NotNull
    @Column(name = "period_year", nullable = false)
    public Integer periodYear;

    @NotNull
    @Column(nullable = false, length = 30)
    public String status;

    @NotNull
    @Column(nullable = false, length = 10)
    public String format;

    @NotNull
    @Column(name = "file_name", nullable = false, length = 255)
    public String fileName;

    @NotNull
    @Column(name = "file_path", nullable = false, length = 500)
    public String filePath;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;
}