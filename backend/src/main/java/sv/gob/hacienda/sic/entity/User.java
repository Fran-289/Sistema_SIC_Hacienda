package sv.gob.hacienda.sic.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotNull
    @Email
    @Column(unique = true, nullable = false, length = 150)
    public String email;

    @NotNull
    @Column(nullable = false, length = 150)
    public String name;

    @NotNull
    @JsonIgnore
    @Column(nullable = false)
    public String password;

    @Column(name = "job_title", length = 100)
    public String jobTitle;

    public String avatar;

    @NotNull
    @Column(nullable = false, length = 20)
    public String role;

    @NotNull
    @Column(columnDefinition = "JSON", nullable = false)
    public String permissions;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;

    public static User findByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return find("LOWER(email) = ?1", email.trim().toLowerCase()).firstResult();
    }
}