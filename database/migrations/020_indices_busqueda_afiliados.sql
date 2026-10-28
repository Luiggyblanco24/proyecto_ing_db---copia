CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_nombre_completo_trgm
    ON persona USING gin (
      (
        COALESCE(nombre1, '') ||
        CASE WHEN nombre2 IS NOT NULL THEN ' ' || nombre2 ELSE '' END ||
        ' ' || apellido1 ||
        CASE WHEN apellido2 IS NOT NULL THEN ' ' || apellido2 ELSE '' END
      ) gin_trgm_ops
    );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_persona_cedula_trgm
    ON persona USING gin (cedula gin_trgm_ops);
