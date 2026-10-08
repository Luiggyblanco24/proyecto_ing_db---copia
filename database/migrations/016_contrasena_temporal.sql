-- Fuerza a cambiar la contraseña temporal entregada por administración.
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS requiere_cambio_contrasena BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;
