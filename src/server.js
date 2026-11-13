import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { auditarIntentoDescarga, manejarCuerpoInvalidoDescarga } from './middleware/chatbot-download-policy.js';
import { exigirChatbotHabilitado, manejarCuerpoInvalidoChatbot } from './config/chatbot.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const saltosProxyConfiables = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(saltosProxyConfiables) || saltosProxyConfiables < 0) {
  throw new Error('TRUST_PROXY_HOPS debe ser un entero no negativo');
}
app.set('trust proxy', saltosProxyConfiables);
const raizProyecto = path.join(__dirname, '..');
const directorioLanding = path.join(raizProyecto, 'landing_page', 'dist');
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
app.use('/api/chatbot', exigirChatbotHabilitado);
app.use('/api/chatbot/informes/exportar', auditarIntentoDescarga);
app.use(express.json());
app.use('/api/chatbot/informes/exportar', manejarCuerpoInvalidoDescarga);
app.use('/api/chatbot', manejarCuerpoInvalidoChatbot);

// La landing de Astro es la entrada pública; login y panel permanecen en public.
// public va primero: dist contiene una copia de public que quedaría desactualizada.
app.use(express.static(path.join(raizProyecto, 'public')));
app.use(express.static(directorioLanding));

// Rutas de la API
app.use('/api', routes);

// Ruta de salud
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Servidor SUTENS escuchando en http://localhost:${PORT}`);
});
