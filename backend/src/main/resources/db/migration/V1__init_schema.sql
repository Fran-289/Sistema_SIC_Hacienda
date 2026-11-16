-- V1__init_schema.sql
-- Esquema Inicial para el Sistema de Ingresos Consulares (SIC)

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    job_title VARCHAR(100) NULL,
    avatar VARCHAR(255) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    permissions JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consulates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    region VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    address TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    created_by_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_consulate_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_consulates_region_country (region, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE informes_caja (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    correlative VARCHAR(50) NULL,
    bank_account VARCHAR(50) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    saldo_anterior DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_pasaporte DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_dui DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_consulares DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_diversos DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    saldo_pendiente DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PRELIMINAR',
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_informes_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_informe_period (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    deposit_date DATE NOT NULL,
    deposit_amount DECIMAL(14,2) NOT NULL,
    concentration_date DATE NULL,
    days INT NULL,
    region VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    location VARCHAR(150) NULL,
    passport_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    dui_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    consular_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    commission_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    diversos_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'NO IDENTIFICADO',
    deleted_at TIMESTAMP NULL,
    delete_reason TEXT NULL,
    informe_caja_id BIGINT NULL,
    created_by_id BIGINT NULL,
    updated_by_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_records_informe FOREIGN KEY (informe_caja_id) REFERENCES informes_caja(id) ON DELETE SET NULL,
    CONSTRAINT fk_records_created_by FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_records_updated_by FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_records_deposit_date (deposit_date),
    INDEX idx_records_status (status),
    INDEX idx_records_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    user_name VARCHAR(150) NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    correlative VARCHAR(50) NOT NULL,
    group_type VARCHAR(100) NOT NULL,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PRELIMINAR',
    process_status VARCHAR(50) NOT NULL DEFAULT 'Generado',
    created_by_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_groups_user FOREIGN KEY (created_by_id) REFERENCES users(id),
    INDEX idx_report_groups_period (period_year, period_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    pdf_url VARCHAR(500) NULL,
    excel_url VARCHAR(500) NULL,
    signed_pdf_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_documents_group FOREIGN KEY (group_id) REFERENCES report_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    status VARCHAR(30) NOT NULL,
    format VARCHAR(10) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_histories_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;