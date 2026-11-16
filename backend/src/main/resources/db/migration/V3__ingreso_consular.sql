-- V3__ingreso_consular.sql
-- Tabla de Ingresos Consulares (faltaba en el esquema inicial)

CREATE TABLE ingreso_consular (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    correlativo_documento VARCHAR(50) NOT NULL,
    consulado VARCHAR(150) NOT NULL,
    tipo_tramite VARCHAR(100) NOT NULL,
    monto_usd DECIMAL(10,2) NOT NULL,
    fecha_transaccion DATE NOT NULL,
    nombre_solicitante VARCHAR(150) NULL,
    observaciones VARCHAR(255) NULL,
    estado VARCHAR(20) DEFAULT 'REGISTRADO',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ingreso_estado (estado),
    INDEX idx_ingreso_fecha (fecha_transaccion),
    INDEX idx_ingreso_correlativo (correlativo_documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
