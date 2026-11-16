-- V4__consulates_contact_and_seed.sql
-- Agrega código de identificación y datos de contacto al Directorio Consular + catálogo base

ALTER TABLE consulates
    ADD COLUMN code VARCHAR(30) NULL AFTER id,
    ADD COLUMN phone VARCHAR(50) NULL AFTER address,
    ADD COLUMN contact_email VARCHAR(150) NULL AFTER phone,
    ADD INDEX idx_consulates_code (code),
    ADD INDEX idx_consulates_status (status);

-- Actualizar sedes existentes si hubiera alguna sin código
UPDATE consulates SET code = 'EMB-USA-WDC', region = 'AMÉRICA DEL NORTE', phone = '+1 (202) 595-7500', contact_email = 'embajada.washington@rree.gob.sv'
WHERE location = 'Washington D.C.' AND code IS NULL;

-- Poblar catálogo inicial de Embajadas y Consulados (idempotente)
INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'EMB-USA-WDC', 'EMBAJADA', 'AMÉRICA DEL NORTE', 'Estados Unidos', 'Washington D.C.', '1400 16th St NW, Washington, DC 20036', '+1 (202) 595-7500', 'embajada.washington@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Estados Unidos' AND location = 'Washington D.C.');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-USA-LAX', 'CONSULADO', 'AMÉRICA DEL NORTE', 'Estados Unidos', 'Los Ángeles, California', '3250 Wilshire Blvd Suite 550, Los Angeles, CA 90010', '+1 (213) 234-9200', 'consulado.losangeles@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Estados Unidos' AND location LIKE 'Los %ngeles%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-USA-HOU', 'CONSULADO', 'AMÉRICA DEL NORTE', 'Estados Unidos', 'Houston, Texas', '8300 Bissonnet St Suite 400, Houston, TX 77074', '+1 (713) 270-6239', 'consulado.houston@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Estados Unidos' AND location LIKE 'Houston%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-USA-NYC', 'CONSULADO', 'AMÉRICA DEL NORTE', 'Estados Unidos', 'Nueva York, NY', '46 Park Ave, New York, NY 10016', '+1 (212) 889-3608', 'consulado.nuevayork@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Estados Unidos' AND (location LIKE 'New York%' OR location LIKE 'Nueva York%'));

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-USA-ATL', 'CONSULADO', 'AMÉRICA DEL NORTE', 'Estados Unidos', 'Duluth, Atlanta, Georgia', '1505 Lakes Pkwy Suite 120, Lawrenceville, GA 30043', '+1 (770) 591-4140', 'consulado.atlanta@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Estados Unidos' AND location LIKE '%Atlanta%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-USA-MCA', 'CONSULADO', 'AMÉRICA DEL NORTE', 'Estados Unidos', 'McAllen, Texas', '701 S Broadway St, McAllen, TX 78501', '+1 (956) 800-1362', 'consulado.mcallen@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Estados Unidos' AND location LIKE '%McAllen%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-CAN-TOR', 'CONSULADO', 'AMÉRICA DEL NORTE', 'Canadá', 'Toronto, Ontario', '151 Bloor St W Suite 320, Toronto, ON M5S 1S4', '+1 (416) 975-0812', 'consulado.toronto@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Canadá' AND location LIKE 'Toronto%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'EMB-GTM-GUA', 'EMBAJADA', 'CENTROAMÉRICA', 'Guatemala', 'Ciudad de Guatemala', '12 Calle 1-25 Zona 10, Edificio Géminis 10, Guatemala', '+502 2382-7484', 'embajada.guatemala@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Guatemala' AND location LIKE '%Guatemala%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'EMB-CRI-SJO', 'EMBAJADA', 'CENTROAMÉRICA', 'Costa Rica', 'San José', 'Paseo Colón, San José, Costa Rica', '+506 2257-6768', 'embajada.costarica@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Costa Rica' AND location LIKE 'San Jos%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'EMB-COL-BOG', 'EMBAJADA', 'AMÉRICA DEL SUR', 'Colombia', 'Bogotá', 'Cra. 9 #80-15 Oficina 502, Bogotá', '+57 (601) 313-2509', 'embajada.colombia@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Colombia' AND location LIKE 'Bogot%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'EMB-ESP-MAD', 'EMBAJADA', 'EUROPA', 'España', 'Madrid', 'Calle Serrano 114, 2º Derecha, 28006 Madrid', '+34 915 628 002', 'embajada.espana@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'España' AND location = 'Madrid');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'CON-ITA-MIL', 'CONSULADO', 'EUROPA', 'Italia', 'Milán', 'Via Carlo Botta 19, 20135 Milano', '+39 02 5501 7890', 'consulado.milan@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Italia' AND location LIKE 'Mil%n%');

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status)
SELECT 'EMB-KOR-SEL', 'EMBAJADA', 'ASIA Y OCEANÍA', 'Corea del Sur', 'Seúl', 'Sejong-daero 55, Jung-gu, Seoul', '+82 2-753-3432', 'embajada.corea@rree.gob.sv', 'ACTIVO'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM consulates WHERE country = 'Corea del Sur' AND location LIKE 'Se%l%');
