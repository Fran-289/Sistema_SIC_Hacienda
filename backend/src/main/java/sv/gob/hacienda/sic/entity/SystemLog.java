package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_logs")
public class SystemLog extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    public User user;

    @Column(name = "user_name", length = 150)
    public String userName;

    @NotNull
    @Column(nullable = false, length = 100)
    public String action;

    public String details;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;
}