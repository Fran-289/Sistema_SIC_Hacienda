-- V2__seed_data.sql
-- Usuario Administrador Inicial (Password encriptada con Bcrypt: AdminSic2026!)
INSERT INTO users (email, name, password, job_title, role, permissions)
SELECT 'admin@hacienda.gob.sv', 'Administrador General', '$2a$10$V09R6yR7DPX1uutcvwLA1egw3esrrKwcfBZeVm/nQ0T5T0Lfxx5Fq', 'Jefe de Sistemas Contables', 'ADMIN', '["ingresos","reportes","directorio"]'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@hacienda.gob.sv');

-- Parámetros Institucionales por Defecto
INSERT INTO system_settings (setting_key, setting_value) VALUES
('INSTITUTION_NAME', 'Ministerio de Hacienda - Dirección General de Tesorería'),
('BANK_ACCOUNT_DEFAULT', '00110000112233'),
('STAMP_REQUIRED', 'true')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Carga Inicial de Consulados de Prueba
INSERT INTO consulates (type, region, country, location, address, status) VALUES
('EMBAJADA', 'NORTEAMERICA', 'Estados Unidos', 'Washington D.C.', '1400 16th St NW, Washington, DC 20036', 'ACTIVO'),
('CONSULADO', 'NORTEAMERICA', 'Estados Unidos', 'Los Angeles', '3250 Wilshire Blvd, Los Angeles, CA 90010', 'ACTIVO'),
('CONSULADO', 'NORTEAMERICA', 'Estados Unidos', 'Houston', '8300 Bissonnet St, Houston, TX 70074', 'ACTIVO'),
('CONSULADO', 'NORTEAMERICA', 'Estados Unidos', 'New York', '46 Park Ave, New York, NY 10016', 'ACTIVO'),
('EMBAJADA', 'CENTROAMERICA', 'Guatemala', 'Ciudad de Guatemala', '12 Calle 1-25 Zona 10, Guatemala', 'ACTIVO'),
('EMBAJADA', 'EUROPA', 'España', 'Madrid', 'Calle Serrano 114, 28006 Madrid', 'ACTIVO')
ON DUPLICATE KEY UPDATE status = VALUES(status);
