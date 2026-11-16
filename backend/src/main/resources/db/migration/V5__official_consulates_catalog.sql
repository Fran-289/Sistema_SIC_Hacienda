-- V5__official_consulates_catalog.sql
-- Reemplaza el catálogo de prueba por las 91 Embajadas, Consulados y Misiones oficiales del Ministerio

DELETE FROM system_logs
WHERE action IN ('CREAR_SEDE_CONSULAR', 'EDITAR_SEDE_CONSULAR', 'CAMBIAR_ESTADO_SEDE');

TRUNCATE TABLE consulates;

INSERT INTO consulates (code, type, region, country, location, address, phone, contact_email, status) VALUES
-- NORTEAMERICA: CANADÁ
('EMB-CAN-OTT', 'EMBAJADA', 'NORTEAMERICA', 'CANADÁ', 'Ottawa, Ontario', '209 Kent Street, K2P 1Z8, Ottawa, Ontario', '+1 (613) 238-2939', 'embajada.ottawa@rree.gob.sv', 'ACTIVO'),
('CON-CAN-MTL', 'CONSULADO', 'NORTEAMERICA', 'CANADÁ', 'Montreal, Québec', '2055 Rue Peel, Oficina 840, Montreal, Quebec, H3A-1V4', '+1 (514) 861-6515', 'consulado.montreal@rree.gob.sv', 'ACTIVO'),
('CON-CAN-TOR', 'CONSULADO', 'NORTEAMERICA', 'CANADÁ', 'Toronto, Ontario', '425 Bloor Street East Suite 510 Código Postal M4W3R4, Toronto', '+1 (416) 975-0812', 'consulado.toronto@rree.gob.sv', 'ACTIVO'),
('CON-CAN-VAN', 'CONSULADO', 'NORTEAMERICA', 'CANADÁ', 'Vancouver, Columbia Británica', '1111 Melville Street, Suite 602, Vancouver, BC, V6E 3V6', '+1 (604) 732-8142', 'consulado.vancouver@rree.gob.sv', 'ACTIVO'),
('CON-CAN-CAL', 'CONSULADO', 'NORTEAMERICA', 'CANADÁ', 'Calgary, Provincia de Alberta', '505 3rd Street SW Suite 1730, Calgary, Alberta T2P 3E6.', '+1 (403) 452-6622', 'consulado.calgary@rree.gob.sv', 'ACTIVO'),

-- NORTEAMERICA: ESTADOS UNIDOS
('EMB-USA-WDC', 'EMBAJADA', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Washington, D.C.', '1400 Sixteenth Street, N.W., Suite 100, Washington, D.C. 20036', '+1 (202) 595-7500', 'embajada.washington@rree.gob.sv', 'ACTIVO'),
('CON-USA-WDC', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Wisconsin Ave NW, Washington D.C.', '2332 Wisconsin Ave NW, Washington, DC 20007, Estados Unidos', '+1 (202) 331-4033', 'consulado.washington@rree.gob.sv', 'ACTIVO'),
('CON-USA-BOS', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Boston, Massachusetts', '46 Bennington Street East Boston, MA 02128', '+1 (888) 301-1130', 'consulado.boston@rree.gob.sv', 'ACTIVO'),
('CON-USA-CHI', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Chicago, Illinois', '177 North State Street, 2do. Piso Mezzanine, Chicago, IL 60601', '+1 (888) 301-1130', 'consulado.chicago@rree.gob.sv', 'ACTIVO'),
('CON-USA-DOR', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Doral, Florida', '8550 NW 33rd Street, Suite 100, Doral, FL 33122-1941', '+1 (888) 301-1130', 'consulado.doral@rree.gob.sv', 'ACTIVO'),
('CON-USA-DAL', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Dallas, Texas', '7610 Stemmons Fwy. Suite 400, Dallas, Texas 75247', '+1 (888) 301-1130', 'consulado.dallas@rree.gob.sv', 'ACTIVO'),
('CON-USA-MCA', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'McAllen, Condado de Hidalgo, Texas.', '701 S. Broadway St., McAllen, TX. 78501', '+1 (888) 301-1130', 'consulado.mcallen@rree.gob.sv', 'ACTIVO'),
('CON-USA-LAR', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Laredo, Texas', '6010 McPherson Rd. Ste #140, Laredo, Texas, 78041.', '+1 (888) 301-1130', 'consulado.laredo@rree.gob.sv', 'ACTIVO'),
('CON-USA-HOU', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Houston, Texas', '8300 Bissonnet St, Suite 400 Houston, TX 77074', '+1 (888) 301-1130', 'consulado.houston@rree.gob.sv', 'ACTIVO'),
('CON-USA-ELP', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'El Paso, Texas', '400 W. San Antonio St Suite B, El Paso, TX 79901', '+1 (888) 301-1130', 'consulado.elpaso@rree.gob.sv', 'ACTIVO'),
('CON-USA-ELI', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Elizabeth, New Jersey', '40 Parker Road, Suite 100, Elizabeth, NJ 07208', '+1 (888) 301-1130', 'consulado.elizabeth@rree.gob.sv', 'ACTIVO'),
('CON-USA-LAS', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Las Vegas, Nevada', '765 N. Nellis Blvd, Suite C-5, Las Vegas, NV, 89110', '+1 (888) 301-1130', 'consulado.lasvegas@rree.gob.sv', 'ACTIVO'),
('CON-USA-AUR', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Aurora, Colorado', '1450 S. Havana St. Suite 100, Aurora, CO, 80012', '+1 (888) 301-1130', 'consulado.aurora@rree.gob.sv', 'ACTIVO'),
('CON-USA-LAX', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Los Ángeles, California', '3250 Wilshire Blvd. Suite 550, Los Ángeles, CA, 90010', '+1 (888) 301-1130', 'consulado.losangeles@rree.gob.sv', 'ACTIVO'),
('CON-USA-LGI', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Long Island, New York', '151 Alkier St. Brentwood, NY 11717', '+1 (888) 301-1130', 'consulado.longisland@rree.gob.sv', 'ACTIVO'),
('CON-USA-NYC', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Nueva York, NY', '46 Park Avenue, New York, NY, 10016.', '+1 (888) 301-1130', 'consulado.nuevayork@rree.gob.sv', 'ACTIVO'),
('CON-USA-SFO', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'San Francisco, California', '507 Polk Street, Suite 280, San Francisco, CA, 94102', '+1 (888) 301-1130', 'consulado.sanfrancisco@rree.gob.sv', 'ACTIVO'),
('CON-USA-SBD', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'San Bernardino, California', '3505 Highland Ave, Highland, CA 92346, Estados Unidos', '+1 (888) 301-1130', 'consulado.sanbernardino@rree.gob.sv', 'ACTIVO'),
('CON-USA-SEA', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Seattle, Washington', 'Broderick Building 615, Second Ave. Suite # 50, Seattle, WA 98104', '+1 (888) 301-1130', 'consulado.seattle@rree.gob.sv', 'ACTIVO'),
('CON-USA-TUS', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Tucson, Arizona', '1039 N. 6th Ave., Tucson, AZ, 85705', '+1 (888) 301-1130', 'consulado.tucson@rree.gob.sv', 'ACTIVO'),
('CON-USA-SSP', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Silver Spring, Maryland', '926 Philadelphia Ave. Silver Spring, MD, 20910', '+1 (888) 301-1130', 'consulado.silverspring@rree.gob.sv', 'ACTIVO'),
('CON-USA-DUL', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Duluth, Atlanta', '3550 Corporate Way, Suite A, Duluth, GA 30096', '+1 (888) 301-1130', 'consulado.atlanta@rree.gob.sv', 'ACTIVO'),
('CON-USA-WBG', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Woodbridge, Virginia', '14572 Potomac, Mills Road, Woodbridge, VA, 22192', '+1 (888) 301-1130', 'consulado.woodbridge@rree.gob.sv', 'ACTIVO'),
('CON-USA-CLT', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Charlotte, Carolina del Norte.', '1520 West Boulevard Suite "C", Charlotte, N.C. 28208', '+1 (888) 301-1130', 'consulado.charlotte@rree.gob.sv', 'ACTIVO'),
('CON-USA-STP', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Saint Paul, Minnesota', '60 PLAZA BLVD E. SUITE 150 ST PAUL MN 55107 USA', '+1 (888) 301-1130', 'consulado.saintpaul@rree.gob.sv', 'ACTIVO'),
('CON-USA-SPD', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Springdale, Arkansas', '3875 W Sunset Ave, Springdale, AR 72762, Estados Unidos', '+1 (888) 301-1130', 'consulado.springdale@rree.gob.sv', 'ACTIVO'),
('CON-USA-FAT', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Fresno, California', '49 W. Alluvial Ave. Fresno, CA, 93650', '+1 (888) 301-1130', 'consulado.fresno@rree.gob.sv', 'ACTIVO'),
('CON-USA-BNA', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Nashville, Tennessee', '311 Plus Park Blvd, Suite 110, Nashville, TN 37217', '+1 (888) 301-1130', 'consulado.nashville@rree.gob.sv', 'ACTIVO'),
('CON-USA-OMA', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Omaha, Nebraska', '11422 Miracle Hills DR Suite 205 Omaha, Nebraska', '+1 (888) 301-1130', 'consulado.omaha@rree.gob.sv', 'ACTIVO'),
('CON-USA-SLC', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'Salt Lake City, Utah', '124 S 400 E STE 410 SALT LAKE CITY UT 84111-2186 USA 84111', '+1 (888) 301-1130', 'consulado.saltlakecity@rree.gob.sv', 'ACTIVO'),

-- NORTEAMERICA: MEXICO
('EMB-MEX-CDMX', 'EMBAJADA', 'NORTEAMERICA', 'MEXICO', 'México', 'Calle Temístocles 88, Colonia Polanco, Delegación Miguel Hidalgo, C.P. 11560, Ciudad de México', '+52 55 5281-5725', 'embajada.mexico@rree.gob.sv', 'ACTIVO'),
('CON-MEX-MTY', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Monterrey, Nuevo León', 'Calle Montes Cárpatos, N°. 320. Esquina con Calle Cerro de la Luz, Residencial San Agustín, San Pedro Garza-García, Nuevo León, Monterrey, C.P. 66260.', '+52 81 8363-5215', 'consulado.monterrey@rree.gob.sv', 'ACTIVO'),
('CON-MEX-TIJ', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Tijuana, Baja California', 'Brigoz Corporativo, interior 303, José María Velazco #2789, Zona Urbana Río Tijuana, Baja California, CP 22010', '+52 664 683-6567', 'consulado.tijuana@rree.gob.sv', 'ACTIVO'),
('CON-MEX-CJS', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Ciudad Juárez, Chihuahua', 'Avenida Abraham Lincoln #1126, Local 5 FRACCTO. La Playa III, Condominio Lincoln, Código Postal 32317, Ciudad Juárez, Chihuahua', '+52 656 616-0193', 'consulado.ciudadjuarez@rree.gob.sv', 'ACTIVO'),
('CON-MEX-TAP', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Tapachula, Chiapas', 'Avenida Central Norte, S/N entre 37 y 39 calle poniente, Colonia 5 de Febrero, Tapachula, Chiapas. Código Postal: 30710', '+52 962 626-7130', 'consulado.tapachula@rree.gob.sv', 'ACTIVO'),
('CON-MEX-ACA', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Acayucan, Veracruz', 'Calle Melchor Ocampo Norte, N° 1212, Ciudad de Acayucan, Veracruz, C.P. 96000', '+52 924 245-4179', 'consulado.acayucan@rree.gob.sv', 'ACTIVO'),
('CON-MEX-SLP', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'San Luis Potosí', 'Calle Avanzada N° 513, entre V. Carranza y Quintana Roo, Barrio Tequisquiapán, Código Postal 78250, San Luís Potosí', '+52 444 814-2926', 'consulado.sanluispotosi@rree.gob.sv', 'ACTIVO'),
('CON-MEX-GDL', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Guadalajara, Mexico', 'Av. Ignacio Luis Vallarta 3233, local F-12 Vallarta Poniente 44110 Guadalajara México', '+52 33 3615-5270', 'consulado.guadalajara@rree.gob.sv', 'ACTIVO'),
('CON-MEX-OAX', 'CONSULADO', 'NORTEAMERICA', 'MEXICO', 'Oaxaca, Oaxaca', 'Colonia Reforma, Calle Violetas, N° 505-B, C.P. 68050, Oax, Mex.', '+52 951 206-2142', 'consulado.oaxaca@rree.gob.sv', 'ACTIVO'),

-- CENTRO AMÉRICA Y EL CARIBE
('EMB-BLZ-BMP', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'BELICE', 'Belmopán, Belice', '20 Tangerine St., Cohune Walk Area, Belmopan. Dirección Postal: P.O. Box 215, Belmopán', '+501 822-3404', 'embajada.belice@rree.gob.sv', 'ACTIVO'),
('EMB-CRI-SJO', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'COSTA RICA', 'San José, Costa Rica', 'Del restaurante Mcdonald''s de Plaza del Sol, 7 cuadras sur y 50 metros este, Curridabat, San José', '+506 2253-0724', 'embajada.costarica@rree.gob.sv', 'ACTIVO'),
('EMB-GTM-GUA', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'GUATEMALA', 'Guatemala, Guatemala', '15ª Avenida, 12-01, Zona 13 Ciudad de Guatemala', '+502 2382-7484', 'embajada.guatemala@rree.gob.sv', 'ACTIVO'),
('EMB-HND-TGU', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'HONDURAS', 'Tegucigalpa, Honduras', 'Colonia Rubén Darío, calle Froylán Turcios No. 2144 Tegucigalpa, M.D.C. Honduras. C.A.', '+504 2239-8490', 'embajada.honduras@rree.gob.sv', 'ACTIVO'),
('EMB-NIC-MGA', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'NICARAGUA', 'Managua, Nicaragua', '9 ½, Carretera a Masaya. Residencial Las Colinas, Av. Del Campo, Pasaje Los Cerros, 142, Managua', '+505 2276-0712', 'embajada.nicaragua@rree.gob.sv', 'ACTIVO'),
('EMB-PAN-PTY', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'PANAMÁ', 'Panamá, Panamá', 'Av. Anastasio Ruiz. Duplex 6, Urbanización Marbella, Frente a Escuela Japonesa Panamá. Apartado Postal 0823-05432', '+507 223-3020', 'embajada.panama@rree.gob.sv', 'ACTIVO'),
('EMB-CUB-HAV', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'CUBA', 'La Habana, Cuba', 'Calle 24, 307, entre 3ª. y 5ª. Miramar, Playa, Ciudad de La Habana', '+53 7 204-7929', 'embajada.cuba@rree.gob.sv', 'ACTIVO'),
('EMB-DOM-SDQ', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'REPUBLICA DOMINICANA', 'Santo Domingo, República Dominicana', 'Calle Itzamana No. 22, Los Cacicazgos, Santo Domingo', '+1 (809) 540-3252', 'embajada.republicadominicana@rree.gob.sv', 'ACTIVO'),
('EMB-TTO-POS', 'EMBAJADA', 'CENTRO AMÉRICA Y EL CARIBE', 'TRINIDAD Y TOBAGO', 'Puerto España, Trinidad y Tobago', NULL, '+1 (868) 622-1827', 'embajada.trinidadytobago@rree.gob.sv', 'ACTIVO'),
('CON-HND-CHO', 'CONSULADO', 'CENTRO AMÉRICA Y EL CARIBE', 'HONDURAS', 'Choluteca, Honduras', 'Barrio El Centro, Costado Norte del Parque Valle, Choluteca', '+504 2782-0614', 'consulado.choluteca@rree.gob.sv', 'ACTIVO'),
('CON-HND-SAP', 'CONSULADO', 'CENTRO AMÉRICA Y EL CARIBE', 'HONDURAS', 'San Pedro Sula, Honduras', 'Edificio Park Plaza, Local 10, 11 Av., entre 5ª. y 6ª. Calle N.O. del Barrio Guamilito, San Pedro Sula', '+504 2557-7682', 'consulado.sanpedrosula@rree.gob.sv', 'ACTIVO'),
('CON-HND-TGU', 'CONSULADO', 'CENTRO AMÉRICA Y EL CARIBE', 'HONDURAS', 'Tegucigalpa, Honduras', 'Colonia Rubén Darío, calle Froylán Turcios No. 2144 Tegucigalpa, M.D.C. Honduras. C.A.', '+504 2239-8490', 'consulado.tegucigalpa@rree.gob.sv', 'ACTIVO'),

-- SURAMERICA
('EMB-ARG-BUE', 'EMBAJADA', 'SURAMERICA', 'ARGENTINA', 'Buenos Aires, Argentina', 'Calle Rodríguez Peña, N°. 1524, C.P. 1021, Capital Federal', '+54 11 5277-4020', 'embajada.argentina@rree.gob.sv', 'ACTIVO'),
('EMB-BRA-BSB', 'EMBAJADA', 'SURAMERICA', 'BRASIL', 'Brasilia, Brasil', 'SHIS QL 22 Conjunto 07, Casa 08, Lago Sul. Brasilia- Distrito Federal. CEP:71650-275', '+55 61 3364-4140', 'embajada.brasil@rree.gob.sv', 'ACTIVO'),
('EMB-CHL-SCL', 'EMBAJADA', 'SURAMERICA', 'CHILE', 'Santiago, Chile', 'Calle Coronel 2330, 5to. Piso, Oficina 51, Providencia, Santiago de Chile', '+56 2 2233-8324', 'embajada.chile@rree.gob.sv', 'ACTIVO'),
('EMB-COL-BOG', 'EMBAJADA', 'SURAMERICA', 'COLOMBIA', 'Bogotá, Colombia', 'Carrera 12 # 119-51, Santa Bárbara, Bogotá, D.C.', '+57 (601) 313-2509', 'embajada.colombia@rree.gob.sv', 'ACTIVO'),
('EMB-ECU-UIO', 'EMBAJADA', 'SURAMERICA', 'ECUADOR', 'Quito, Ecuador', 'Avenida República de El Salvador y calle Suecia, Edificio "DELTA" 890, 6° PISO, San Francisco de Quito, Pichincha', '+593 2 243-3066', 'embajada.ecuador@rree.gob.sv', 'ACTIVO'),
('EMB-PER-LIM', 'EMBAJADA', 'SURAMERICA', 'PERÚ', 'Lima, Perú', 'Av. Dos de Mayo 843, San Isidro - Lima 27', '+51 1 440-1081', 'embajada.peru@rree.gob.sv', 'ACTIVO'),
('EMB-BOL-LPB', 'EMBAJADA', 'SURAMERICA', 'BOLIVIA', 'La Paz, Bolivia', 'Avenida República de El Salvador y calle Suecia, Edificio "DELTA" 890, 6° PISO, San Francisco de Quito, Pichincha', '+593 2 243-3066', 'embajada.bolivia@rree.gob.sv', 'ACTIVO'),
('EMB-URY-MVD', 'EMBAJADA', 'SURAMERICA', 'URUGUAY', 'Montevideo, Uruguay', 'Pasaje Arq. Raúl Lerena Acevedo, N°. 1453, Punta Gorda. Código Postal: 11400, Montevideo', '+598 2600-8661', 'embajada.uruguay@rree.gob.sv', 'ACTIVO'),
('EMB-VEN-CCS', 'EMBAJADA', 'SURAMERICA', 'VENEZUELA', 'Caracas, Venezuela', 'Calle Roraima, Urbanización Chuao, municipio Baruta, Estado Miranda', '+58 212 991-0024', 'embajada.venezuela@rree.gob.sv', 'ACTIVO'),

-- EUROPA
('EMB-DEU-BER', 'EMBAJADA', 'EUROPA', 'ALEMANIA', 'Berlín, Alemania', 'Hessische Strasse 11, 10115, Berlín', '+49 30 2064-660', 'embajada.alemania@rree.gob.sv', 'ACTIVO'),
('EMB-AUT-VIE', 'EMBAJADA', 'EUROPA', 'AUSTRIA', 'Viena, Austria', 'Prinz-Eugen-Strasse, 72/2/1, 1040 Wien', '+43 1 505-3874', 'embajada.austria@rree.gob.sv', 'ACTIVO'),
('EMB-BEL-BRU', 'EMBAJADA', 'EUROPA', 'BELGICA', 'Bélgica', 'Rue Belliard 15-17, 5° Nivel. 1000, Bruselas', '+32 2 733-0485', 'embajada.belgica@rree.gob.sv', 'ACTIVO'),
('MIS-CHE-GVA', 'MISIÓN PERMANENTE', 'EUROPA', 'SUIZA', 'Ginebra, Suiza', '65 Rue de Lausanne, 1202, Ginebra', '+41 22 732-7036', 'mision.ginebra@rree.gob.sv', 'ACTIVO'),
('EMB-ESP-MAD', 'EMBAJADA', 'EUROPA', 'ESPAÑA', 'Madrid, España', 'Paseo de la Castellana, 178, 1º D, 28046, Madrid', '+34 915 628 002', 'embajada.espana@rree.gob.sv', 'ACTIVO'),
('EMB-FRA-PAR', 'EMBAJADA', 'EUROPA', 'FRANCIA', 'París, Francia', '12 Rue Galilée, 75116, Paris', '+33 1 4720-4202', 'embajada.francia@rree.gob.sv', 'ACTIVO'),
('EMB-GBR-LON', 'EMBAJADA', 'EUROPA', 'REINO UNIDO', 'Londres, Reino Unido', '2nd. Floor, 8 Dorset Square, London, NW1 6PU', '+44 20 7224-9800', 'embajada.reinounido@rree.gob.sv', 'ACTIVO'),
('EMB-ITA-ROM', 'EMBAJADA', 'EUROPA', 'ITALIA', 'Roma, Italia', 'Vía Gualtiero Castellini, 13, interno D 10, Roma', '+39 06 807-6605', 'embajada.italia@rree.gob.sv', 'ACTIVO'),
('EMB-VAT-ROM', 'EMBAJADA', 'EUROPA', 'ITALIA', 'Roma, Santa Sede', 'Via Lima 10, Interno 15, Secondo Piano, 00198 Roma, Italia', '+39 06 841-5211', 'embajada.santasede@rree.gob.sv', 'ACTIVO'),
('EMB-NLD-HAG', 'EMBAJADA', 'EUROPA', 'PAISES BAJOS', 'La Haya, Países Bajos', 'Riouwstraat 137, 2585 HP, La Haya', '+31 70 352-0712', 'embajada.paisesbajos@rree.gob.sv', 'ACTIVO'),
('EMB-RUS-MOW', 'EMBAJADA', 'EUROPA', 'RUSIA', 'Moscú, Rusia', 'Mitnaya Street 3, Office 14, Moscow. 119049', '+7 499 238-0155', 'embajada.rusia@rree.gob.sv', 'ACTIVO'),
('EMB-SWE-STO', 'EMBAJADA', 'EUROPA', 'SUECIA', 'Estocolmo, Suecia', 'Herserudsvägen 5, 5th. Floor, 181 50, Lidingö, Stockholm', '+46 8 765-8621', 'embajada.suecia@rree.gob.sv', 'ACTIVO'),
('CON-ESP-BCN', 'CONSULADO', 'EUROPA', 'ESPAÑA', 'Barcelona, España', 'Calle Sardenya 175, Planta baja local 2, 08013, Barcelona, España', '+34 931 127 212', 'consulado.barcelona@rree.gob.sv', 'ACTIVO'),
('CON-ITA-MIL', 'CONSULADO', 'EUROPA', 'ITALIA', 'Milán, Italia', 'Piazza Santa Maria Beltrade, 2, 20123, Milán, Italia', '+39 02 5501 7890', 'consulado.milan@rree.gob.sv', 'ACTIVO'),

-- ASIA Y OCEANÍA
('CON-AUS-MEL', 'CONSULADO', 'ASIA Y OCEANÍA', 'AUSTRALIA', 'Melbourne, Australia', 'Level 7, 20-22, Albert Road, South Melbourne, 3205, Victoria', '+61 3 9867-4470', 'consulado.melbourne@rree.gob.sv', 'ACTIVO'),
('EMB-AUS-CBR', 'EMBAJADA', 'ASIA Y OCEANÍA', 'AUSTRALIA', 'Canberra, Australia', '3/110 Giles Street, Kingston, ACT, 2604 Canberra', '+61 2 6162-0661', 'embajada.australia@rree.gob.sv', 'ACTIVO'),
('EMB-KOR-SEL', 'EMBAJADA', 'ASIA Y OCEANÍA', 'COREA', 'Seúl, Corea', '20th. Floor, BuyoungTaepyung, Building # 55, Sejongdae-ro, Jung-ku, Seoul, 04513', '+82 2 753-3432', 'embajada.corea@rree.gob.sv', 'ACTIVO'),
('EMB-CHN-BJS', 'EMBAJADA', 'ASIA Y OCEANÍA', 'CHINA', 'Beijing, China', 'Apartment No.101, Entrance No.1, Building No.15, Jianguomenwai DRC, Chaoyang District, Beijing, 100600', '+86 10 8532-6992', 'embajada.china@rree.gob.sv', 'ACTIVO'),
('EMB-IND-DEL', 'EMBAJADA', 'ASIA Y OCEANÍA', 'INDIA', 'Nueva Delhi, India', '8, Munirka Marg, Vasant Vihar, Nueva Delhi, 110057', '+91 11 4601-7407', 'embajada.india@rree.gob.sv', 'ACTIVO'),
('EMB-ISR-TLV', 'EMBAJADA', 'ASIA Y OCEANÍA', 'ISRAEL', 'Tel-Aviv, Israel', '6 Hamada Street, Naor Building, 4º piso, Herzliya Pituah, 46733', '+972 9 957-7680', 'embajada.israel@rree.gob.sv', 'ACTIVO'),
('EMB-JPN-TYO', 'EMBAJADA', 'ASIA Y OCEANÍA', 'JAPON', 'Tokio, Japón', '38 Kowa Building, N° 803, 4-12-24, Nishi Azabu, Minato Ku, Tokio, 106-0031', '+81 3 3499-4461', 'embajada.japon@rree.gob.sv', 'ACTIVO'),
('EMB-QAT-DOH', 'EMBAJADA', 'ASIA Y OCEANÍA', 'QATAR', 'Doha, Qatar', 'Villa No. 54 A, Al Riyahd Street West Bay Lagoon, East Gate (Near of Zig Zag Towers Roundabout, West Bay), Doha', '+974 4411-0054', 'embajada.qatar@rree.gob.sv', 'ACTIVO'),
('EMB-VNM-HAN', 'EMBAJADA', 'ASIA Y OCEANÍA', 'VIETNAM', 'Hanói, Vietnam', '11TH FLOOR TOWER 2 CAPITAL PLACE BUILDING NO 29 LIEU GIAI STREET NGOC KHANH BA DINH HANOI', '+84 24 3201-6899', 'embajada.vietnam@rree.gob.sv', 'ACTIVO'),

-- SEDES ADICIONALES EN EUROPA Y NORTEAMERICA
('CON-ESP-SVQ', 'CONSULADO', 'EUROPA', 'ESPAÑA', 'Sevilla, España', 'Avenida Menéndez y Pelayo, Nº8, 5ª nivel, Sevilla, Reino de España', '+34 955 314 780', 'consulado.sevilla@rree.gob.sv', 'ACTIVO'),
('CON-USA-SAT', 'CONSULADO', 'NORTEAMERICA', 'ESTADOS UNIDOS', 'San Antonio, Texas', '12521 Nacogdoches Road, suite 102, San Antonio, Texas, 78217.', '+1 (888) 301-1130', 'consulado.sanantonio@rree.gob.sv', 'ACTIVO'),
('CON-CAN-YWG', 'CONSULADO', 'NORTEAMERICA', 'CANADÁ', 'Winnipeg, Manitoba', '205-233 Portage Ave Winnipeg, Manitoba R3B 2A7', '+1 (204) 505-2360', 'consulado.winnipeg@rree.gob.sv', 'ACTIVO');
