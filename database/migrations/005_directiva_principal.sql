ALTER TABLE subdirectiva
    ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO cargo_sindical (nombre, es_repetible) VALUES
    ('Presidente General', FALSE),
    ('Vicepresidente General', FALSE),
    ('Secretario General', FALSE),
    ('Fiscal General', FALSE),
    ('Tesorero General', FALSE)
ON CONFLICT (nombre) DO UPDATE SET es_repetible = FALSE;

UPDATE subdirectiva
SET nombre = 'Directiva Departamental'
WHERE nombre = 'Directiva General Catatumbo';

UPDATE subdirectiva
SET es_principal = FALSE
WHERE es_principal = TRUE AND nombre <> 'Directiva Departamental';

UPDATE subdirectiva SET es_principal = TRUE WHERE nombre = 'Directiva Departamental';

INSERT INTO subdirectiva (nombre, es_principal)
SELECT 'Directiva Departamental', TRUE
WHERE NOT EXISTS (SELECT 1 FROM subdirectiva WHERE es_principal = TRUE);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subdirectiva_principal
    ON subdirectiva (es_principal)
    WHERE es_principal = TRUE;

UPDATE subdirectiva_afiliado sa
SET id_cargo_sindical = cargo_general.id_cargo_sindical
FROM subdirectiva sd,
     cargo_sindical cargo_actual,
     cargo_sindical cargo_general
WHERE sd.id_subdirectiva = sa.id_subdirectiva
  AND sd.es_principal = TRUE
  AND cargo_actual.id_cargo_sindical = sa.id_cargo_sindical
  AND cargo_general.nombre = CASE cargo_actual.nombre
      WHEN 'Presidente' THEN 'Presidente General'
      WHEN 'Vicepresidente' THEN 'Vicepresidente General'
      WHEN 'Secretario' THEN 'Secretario General'
      WHEN 'Fiscal' THEN 'Fiscal General'
      WHEN 'Tesorero' THEN 'Tesorero General'
  END
  AND cargo_actual.nombre IN ('Presidente', 'Vicepresidente', 'Secretario', 'Fiscal', 'Tesorero');