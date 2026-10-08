-- Permite clasificar cargos sindicales para asignarlos a la Directiva Departamental.
BEGIN;

ALTER TABLE cargo_sindical
    ADD COLUMN IF NOT EXISTS es_departamental BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE cargo_sindical
SET es_departamental = TRUE
WHERE nombre IN (
    'Presidente General',
    'Vicepresidente General',
    'Secretario General',
    'Fiscal General',
    'Tesorero General'
);

COMMIT;
