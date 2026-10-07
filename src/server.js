import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const raizProyecto = path.join(__dirname, '..');
const directorioLanding = path.join(raizProyecto, 'Sutens lading page', 'dist');
const origenesPermitidos = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  origin: origenesPermitidos,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// La landing de Astro es la entrada pública; login y panel permanecen en public.
app.use(express.static(directorioLanding));
app.use(express.static(path.join(raizProyecto, 'public')));

// Rutas de la API
app.use('/api', routes);

// Ruta de salud
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor SUTENS escuchando en http://localhost:${PORT}`);
});
