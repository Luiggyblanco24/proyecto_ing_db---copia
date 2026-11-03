import { pool } from '../src/config/db.js';

const REPETICIONES = Number(process.argv[2]) || 30;
const UMBRAL_MS = 1500;

const consultas = [
  ['Ping (SELECT 1)', 'SELECT 1'],
  ['Conteo de afiliados', 'SELECT count(*) FROM afiliado'],
  ['Listado de afiliados (50)', `
    SELECT a.id_afiliado, p.nombre1, p.apellido1, p.cedula, p.correo, a.estado
    FROM afiliado a JOIN persona p ON p.id_persona = a.id_persona
    ORDER BY p.apellido1, p.nombre1 LIMIT 50`],
  ['Búsqueda por nombre', `
    SELECT a.id_afiliado FROM afiliado a JOIN persona p ON p.id_persona = a.id_persona
    WHERE p.nombre1 ILIKE '%ma%' OR p.apellido1 ILIKE '%ma%' LIMIT 50`],
  ['Solicitudes pendientes', `SELECT count(*) FROM afiliado WHERE estado = 'pendiente'`],
  ['Próximos eventos', `
    SELECT id_evento, titulo, fecha_inicio FROM evento
    WHERE eliminado_at IS NULL ORDER BY fecha_inicio DESC LIMIT 50`],
  ['Biblioteca (documentos)', 'SELECT id_documento, titulo FROM documento ORDER BY fecha_publicacion DESC LIMIT 50'],
];

function percentil(ordenados, p) {
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)];
}

async function medir(sql) {
  const tiempos = [];
  for (let i = 0; i < REPETICIONES + 1; i += 1) {
    const inicio = performance.now();
    await pool.query(sql);
    // La primera ejecución calienta la conexión y la caché, no se cuenta
    if (i > 0) tiempos.push(performance.now() - inicio);
  }
  return tiempos.sort((a, b) => a - b);
}

const destino = new URL(process.env.DATABASE_URL || 'postgresql://sin-configurar');
console.log(`Base: ${destino.hostname} · ${REPETICIONES} repeticiones por consulta · umbral ${UMBRAL_MS} ms\n`);

const resultados = [];
for (const [nombre, sql] of consultas) {
  try {
    const t = await medir(sql);
    const promedio = t.reduce((suma, x) => suma + x, 0) / t.length;
    resultados.push({
      Consulta: nombre,
      'Min (ms)': t[0].toFixed(1),
      'Prom (ms)': promedio.toFixed(1),
      'P95 (ms)': percentil(t, 95).toFixed(1),
      'Máx (ms)': t[t.length - 1].toFixed(1),
      Resultado: percentil(t, 95) < UMBRAL_MS ? 'OK' : 'LENTA',
    });
  } catch (error) {
    resultados.push({ Consulta: nombre, Resultado: `ERROR: ${error.message}` });
  }
}
console.table(resultados);
await pool.end();
