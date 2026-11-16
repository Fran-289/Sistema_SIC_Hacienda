-- V6__clear_placeholder_consulate_contacts.sql
-- Limpia teléfonos y correos de ejemplo en las 91 sedes oficiales para que queden vacíos (opcionales e informativos)

UPDATE consulates
SET phone = NULL,
    contact_email = NULL;
