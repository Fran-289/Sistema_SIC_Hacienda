package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
public class SystemSetting extends PanacheEntityBase {

    @Id
    @Column(name = "setting_key", length = 100)
    public String settingKey;

    @Column(name = "setting_value", columnDefinition = "LONGTEXT", nullable = false)
    public String settingValue;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}