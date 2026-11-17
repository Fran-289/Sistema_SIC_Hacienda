-- V8__informes_caja_totals_and_notes.sql
-- Agrega columnas de total depositado, comisión bancaria y observaciones/justificación a informes_caja

ALTER TABLE informes_caja
    ADD COLUMN total_depositos DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER saldo_anterior,
    ADD COLUMN total_comision DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER total_consulares,
    ADD COLUMN observaciones TEXT NULL AFTER status;
