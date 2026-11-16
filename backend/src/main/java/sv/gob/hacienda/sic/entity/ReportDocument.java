package sv.gob.hacienda.sic.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "report_documents")
public class ReportDocument extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne
    @JoinColumn(name = "group_id", nullable = false)
    public ReportGroup group;

    @NotNull
    @Column(name = "report_type", nullable = false, length = 50)
    public String reportType;

    @Column(name = "pdf_url", length = 500)
    public String pdfUrl;

    @Column(name = "excel_url", length = 500)
    public String excelUrl;

    @Column(name = "signed_pdf_url", length = 500)
    public String signedPdfUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    public LocalDateTime updatedAt;
}