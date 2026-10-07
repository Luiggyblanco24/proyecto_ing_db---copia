import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const certificadoSsl = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n');

// Pool de conexiones a PostgreSQL
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ...(process.env.NODE_ENV === 'production'
    ? { ssl: { rejectUnauthorized: true, ...(certificadoSsl ? { ca: certificadoSsl } : {}) } }
    : {}),
});

pool.on('error', (error) => {
  console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error);
});

// Helper para ejecutar consultas con parámetros (evita SQL injection)
export const query = (text, params) => pool.query(text, params);
