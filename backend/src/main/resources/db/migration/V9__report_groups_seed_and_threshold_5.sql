-- V9__report_groups_seed_and_threshold_5.sql
-- Actualiza umbral de concentración a 5 días hábiles, amplía report_documents y carga trámites base en Tareas Pendientes

ALTER TABLE report_documents
    ADD COLUMN signed_file_name VARCHAR(255) NULL AFTER signed_pdf_url,
    ADD COLUMN uploaded_at TIMESTAMP NULL AFTER signed_file_name;

-- Ajustar umbral de atraso de concentración a 5 días hábiles
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('CONCENTRATION_MAX_DAYS', '5')
ON DUPLICATE KEY UPDATE setting_value = '5';

-- Semilla inicial de paquetes de reportes para Tareas Pendientes (solo si la tabla está vacía)
INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7', 'No Identificados / No Distribuidos', 7, 2026, 'N/A', 'Firma Jefatura', u.id, '2026-07-16 14:46:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND NOT EXISTS (SELECT 1 FROM report_groups);

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7', 'Reportes Consulares', 7, 2026, 'DEFINITIVO', 'Firma Jefatura', u.id, '2026-07-16 15:05:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 1;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7.1', 'Reportes Consulares', 7, 2026, 'DEFINITIVO MODIFICADO', 'Firma Jefatura', u.id, '2026-07-16 15:05:30'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 2;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7', 'No Identificados / No Distribuidos', 7, 2026, 'N/A', 'Firma Jefatura', u.id, '2026-07-17 08:09:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 3;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7.2', 'Reportes Consulares', 7, 2026, 'DEFINITIVO MODIFICADO', 'Firma Jefatura', u.id, '2026-07-30 10:20:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 4;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7.3', 'Reportes Consulares', 7, 2026, 'DEFINITIVO MODIFICADO', 'Firma Jefatura', u.id, '2026-07-30 10:20:30'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 5;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '7.4', 'Reportes Consulares', 7, 2026, 'DEFINITIVO MODIFICADO', 'Firma Jefatura', u.id, '2026-07-30 10:24:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 6;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '10', 'Reportes Consulares', 10, 2026, 'PRELIMINAR', 'Firma Jefatura', u.id, '2026-10-07 11:37:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 7;

INSERT INTO report_groups (correlative, group_type, period_month, period_year, status, process_status, created_by_id, created_at)
SELECT '10', 'Reportes Consulares', 10, 2026, 'PRELIMINAR', 'Firma Jefatura', u.id, '2026-10-07 12:50:00'
FROM users u WHERE u.email = 'admin@hacienda.gob.sv'
AND (SELECT COUNT(*) FROM report_groups) = 8;

-- Crear los 4 documentos (CAJA, SALDOS, LIQUIDACION, CABLEGRAFICAS) para cada paquete 'Reportes Consulares' sin documentos
INSERT INTO report_documents (group_id, report_type)
SELECT rg.id, doc_types.rtype
FROM report_groups rg
CROSS JOIN (
    SELECT 'CAJA' AS rtype
    UNION ALL SELECT 'SALDOS'
    UNION ALL SELECT 'LIQUIDACION'
    UNION ALL SELECT 'CABLEGRAFICAS'
) doc_types
WHERE rg.group_type = 'Reportes Consulares'
AND NOT EXISTS (SELECT 1 FROM report_documents rd WHERE rd.group_id = rg.id);

-- Crear el documento único NOIDENTIFICADOS_NODISTRIBUIDOS para paquetes 'No Identificados / No Distribuidos'
INSERT INTO report_documents (group_id, report_type)
SELECT rg.id, 'NOIDENTIFICADOS_NODISTRIBUIDOS'
FROM report_groups rg
WHERE rg.group_type = 'No Identificados / No Distribuidos'
AND NOT EXISTS (SELECT 1 FROM report_documents rd WHERE rd.group_id = rg.id);
