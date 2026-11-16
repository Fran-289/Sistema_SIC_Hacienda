package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Entity
@Table(name = "consulates")
public class Consulate extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(length = 30)
    public String code;

    @NotNull
    @Column(nullable = false, length = 20)
    public String type;

    @NotNull
    @Column(nullable = false, length = 100)
    public String region;

    @NotNull
    @Column(nullable = false, length = 100)
    public String country;

    @NotNull
    @Column(nullable = false, length = 150)
    public String location;

    public String address;

    @Column(length = 50)
    public String phone;

    @Column(name = "contact_email", length = 150)
    public String contactEmail;

    @NotNull
    @Column(nullable = false, length = 20)
    public String status = "ACTIVO";

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    public User createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}
