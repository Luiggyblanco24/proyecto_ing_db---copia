import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const certificadoSsl = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');
const esProduccion = process.env.NODE_ENV === 'production';
let connectionString = process.env.DATABASE_URL;

if (esProduccion && connectionString) {
  const databaseUrl = new URL(connectionString);
  ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword', 'uselibpqcompat']
    .forEach((parametro) => databaseUrl.searchParams.delete(parametro));
  connectionString = databaseUrl.toString();
}

// Pool de conexiones a PostgreSQL
export const pool = new pg.Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(esProduccion
    ? { ssl: { rejectUnauthorized: true, ...(certificadoSsl ? { ca: certificadoSsl } : {}) } }
    : {}),
});

pool.on('error', (error) => {
  console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error);
});

// Helper para ejecutar consultas con parámetros (evita SQL injection)
export const query = (text, params) => pool.query(text, params);
