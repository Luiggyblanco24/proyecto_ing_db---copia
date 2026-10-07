-- Permite que una persona conserve su cargo departamental y tenga, además,
-- una afiliación local sin cargo sindical o sin sede/rol laboral.
BEGIN;

DROP INDEX IF EXISTS uq_subdirectiva_afiliado_unico;

ALTER TABLE subdirectiva_afiliado
    DROP CONSTRAINT subdirectiva_afiliado_pkey,
    ALTER COLUMN id_cargo_sindical DROP NOT NULL,
    ADD CONSTRAINT subdirectiva_afiliado_pkey
        PRIMARY KEY (id_afiliado, id_subdirectiva);

COMMIT;
