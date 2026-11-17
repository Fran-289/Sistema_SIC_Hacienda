-- V7__users_status_column.sql
-- Agrega estado operativo (ACTIVO / INACTIVO) a los usuarios del sistema

ALTER TABLE users
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' AFTER role,
    ADD INDEX idx_users_status (status);

UPDATE users
SET permissions = '["ingresos","reportes","tareas","directorio"]'
WHERE role = 'ADMIN';
