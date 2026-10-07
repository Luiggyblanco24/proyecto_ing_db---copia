# SUTENS — Plataforma Web del Sindicato

Sistema de información web para el **Sindicato Unitario de Trabajadores de la Educación de
Norte de Santander (SUTENS)**. «Defensa de la Educación, Unidad de los Trabajadores».
Centraliza el padrón de afiliados, la estructura de subdirectivas, la gestión documental y
la comunicación oficial, con control de acceso basado en roles (RBAC).

La identidad visual usa verde institucional (`#1B7A38`), amarillo lápiz (`#F59E0B`),
fondo crema (`#F8F6F0`) y texto carbón (`#1E293B`). Los logos SVG están en `public/brand/`.

## Estructura del repositorio

```
proyecto_ing_db/
├── database/             # Esquema, semillas y migraciones PostgreSQL
├── public/               # Login, registro, dashboard y recursos del backend
├── src/                  # API REST Node.js (Express + pg)
└── Sutens lading page/   # Landing pública Astro + Tailwind
```

## 1. Crear la base de datos en PostgreSQL

```bash
# Crear la base de datos
createdb sutens

# Aplicar el esquema
psql -d sutens -f database/schema.sql

# Cargar datos semilla
psql -d sutens -f database/seed.sql
```

Si la base ya existía antes de la gestión de subdirectivas, aplica la migración una sola vez:

```bash
psql -d sutens -f database/migrations/001_gestion_subdirectivas.sql
psql -d sutens -f database/migrations/002_roles_laborales_sede.sql
psql -d sutens -f database/migrations/003_activar_afiliados_asignados.sql
psql -d sutens -f database/migrations/004_perfil_usuario.sql
psql -d sutens -f database/migrations/005_directiva_principal.sql
psql -d sutens -f database/migrations/006_tipo_evento.sql
psql -d sutens -f database/migrations/007_asistencia_eventos.sql
psql -d sutens -f database/migrations/008_cancelar_eventos.sql
psql -d sutens -f database/migrations/009_instituciones_educativas.sql
psql -d sutens -f database/migrations/010_afiliaciones_locales_directiva.sql
psql -d sutens -f database/migrations/011_galeria_publica.sql
psql -d sutens -f database/migrations/012_resoluciones_publicas.sql
psql -d sutens -f database/migrations/013_biblioteca_educativa_secretarios.sql
```

> La migración 009 ya fue aplicada en la base existente. Aplica las migraciones posteriores que aún estén pendientes, en orden; no ejecutes otra vez una migración que ya terminó correctamente. La 011 crea la galería pública y sus seis entradas iniciales. La 012 agrega la opción de publicación pública de documentos sindicales. La 013 habilita la biblioteca educativa y permite varios Secretarios Generales.

### Modelo de datos (resumen)

| Grupo | Tablas |
|-------|--------|
| Personas y afiliación | `persona`, `afiliado` (con `estado`: pendiente/aprobado/rechazado/retirado) |
| Usuarios y RBAC | `usuario`, `rol_sistema`, `usuario_rol` |
| Estructura organizacional | `subdirectiva`, `institucion`, `sede`, `cargo_sindical`, `rol_laboral`, `subdirectiva_afiliado`, `afiliado_sede` |
| Gestión documental | `tipo_documento`, `documento`, `documento_sindical`, `categoria`, `documento_educativo`, `materia` |
| Calendario | `evento` |

La migración 005 marca `Directiva Departamental` como Directiva Principal y crea los cargos Presidente General, Vicepresidente General, Secretario General, Fiscal General y Tesorero General. Sus titulares tienen acceso al padrón y gestión global de afiliados; la aprobación/rechazo de solicitudes está limitada al administrador y al Secretario General. La migración 009 agrega instituciones educativas debajo de cada subdirectiva y organiza las sedes existentes en una institución temporal llamada `Institución por clasificar`, que puedes renombrar después. La migración 010 permite conservar el cargo departamental junto con una afiliación en otra subdirectiva; esa afiliación puede no tener cargo sindical y puede quedar sin sede ni rol laboral.

## 2. Instalar y compilar la landing pública

```bash
cd "Sutens lading page"
npm install
npm run build
```

El build estático queda en `Sutens lading page/dist`; Express lo sirve como portada.

## 3. Levantar el backend (Node.js)

Desde la raíz del repositorio:

```bash
npm install
# Copia .env.example a .env y configura DATABASE_URL, JWT_SECRET y las variables de Supabase
npm run dev
```

El servidor queda en `http://localhost:3000`. En producción, compila primero la landing y luego inicia Express con `npm start`.

En producción, configura `CORS_ORIGINS` como una lista separada por comas de los orígenes exactos autorizados para consumir la API (por ejemplo, el dominio de Vercel, sin rutas). No uses `*`. Mantén `DATABASE_URL` y `JWT_SECRET` como variables secretas del proveedor de despliegue; no subas `.env` ni archivos de configuración local al repositorio.

### Descargas con identidad SUTENS

Los informes del padrón incluyen el logo tanto en Excel como en PDF. Las descargas sindicales y educativas producen una copia PDF con una portada SUTENS y conservan sin cambios el archivo original almacenado. Los archivos PDF se incorporan detrás de la portada; los archivos DOC y DOCX se convierten primero a PDF.

Para habilitar la conversión de Word, instala LibreOffice en el equipo que ejecuta el backend y asegúrate de que `soffice` esté disponible en `PATH`. Si está instalado en otra ubicación, configura `LIBREOFFICE_PATH` con la ruta completa al ejecutable `soffice` (por ejemplo, `C:\Program Files\LibreOffice\program\soffice.exe` en Windows). Si falta LibreOffice, la descarga Word devuelve un error explícito y el original permanece intacto.

### Interfaz web (frontend)

Al abrir `http://localhost:3000` verás el sitio público de SUTENS:

- `/` → **Landing pública Astro**
- `/login.html` → **Iniciar sesión** (el panel requiere una sesión válida)
- `/register.html` → **Registro público de afiliación**
- `/dashboard.html` → **Panel**: requiere haber iniciado sesión; las solicitudes pendientes aparecen por defecto y se puede buscar por nombre o cédula y filtrar por subdirectiva.
- `/Nosotros/` → Directiva Departamental y galería pública; administración y miembros activos de la Directiva Departamental pueden gestionar las imágenes al iniciar sesión.
- `/Secretarias/` → Presidentes, vicepresidentes y cargos administrativos de las subdirectivas.
- `/Afiliate/` → Registro en línea y descarga del formulario PDF.
- En la vista **Biblioteca sindical** del panel se puede elegir qué documentos aparecen en el slider de `/Comunicaciones/`; solo Administración o la Directiva Departamental pueden cambiar su visibilidad pública.
- La **Biblioteca educativa** permite a todos los afiliados aprobados compartir guías organizadas por grado y materia, así como metodologías de apoyo docente sin grado ni materia. El autor o cualquier miembro activo de la Directiva Departamental puede eliminar cada recurso.

### Endpoints disponibles

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/api/auth/registrar` | Público | Crea afiliado y cuenta con estado pendiente de validación sindical |
| POST | `/api/auth/login` | Público | Inicio de sesión (devuelve JWT) |
| GET | `/api/auth/me` | Autenticado | Perfil del usuario actual |
| GET | `/api/public/directivas/departamental` | Público | Integrantes activos de la Directiva Departamental, con foto de perfil |
| GET | `/api/public/directivas/subdirectivas` | Público | Presidentes, vicepresidentes y cargos administrativos de las subdirectivas |
| GET | `/api/public/galeria` | Público | Lista imágenes y descripciones de la galería |
| POST/PATCH/DELETE | `/api/public/galeria` | Administrador o Directiva Departamental | Gestiona imágenes de la galería |
| GET | `/api/public/documentos` | Público | Lista documentos sindicales autorizados para publicación con descripción, tipo y fecha |
| GET | `/api/public/documentos/:id/descargar` | Público | Descarga una copia PDF con portada SUTENS de un documento sindical visible públicamente |
| PATCH | `/api/auth/me` | Autenticado | Actualiza datos propios, contraseña y foto de perfil (JPG/PNG/WebP, máximo 4 MB) |
| GET | `/api/biblioteca` | Afiliado aprobado | Lista documentos sindicales por fecha descendente |
| GET | `/api/biblioteca/categorias` | Afiliado aprobado | Lista categorías documentales |
| GET | `/api/biblioteca/:id/archivo` | Afiliado aprobado | Descarga una copia PDF con portada SUTENS del documento sindical |
| GET | `/api/biblioteca/educativa` | Afiliado aprobado | Lista guías por grado y materia y metodologías de apoyo docente |
| GET | `/api/biblioteca/educativa/materias` | Afiliado aprobado | Catálogo de materias para clasificar guías |
| GET | `/api/biblioteca/educativa/:id/archivo` | Afiliado aprobado | Descarga una copia PDF con portada SUTENS del material educativo |
| POST | `/api/biblioteca/educativa` | Afiliado aprobado | Comparte guía por grado y materia o metodología general de apoyo docente |
| DELETE | `/api/biblioteca/educativa/:id` | Autor o Directiva Departamental activa | Elimina material educativo |
| POST | `/api/biblioteca` | Admin o presidente, vicepresidente, secretario o fiscal activo | Sube un PDF, DOC o DOCX (máximo 20 MB) |
| PATCH | `/api/biblioteca/:id` | Autor, admin o Directiva Departamental | Edita título, categoría, descripción o reemplaza el archivo |
| PATCH | `/api/biblioteca/:id/publicacion` | Administrador o Directiva Departamental | Publica u oculta un documento sindical en Comunicaciones |
| DELETE | `/api/biblioteca/:id` | Autor, admin o Directiva Departamental | Elimina el registro y el archivo privado |
| GET | `/api/calendario/eventos` | Afiliado autenticado | Actividades departamentales y de su subdirectiva |
| POST | `/api/calendario/eventos` | Administrador o dirigente autorizado | Crear reunión, asamblea, capacitación u otra actividad |
| PATCH | `/api/calendario/eventos/:id/asistencia` | Afiliado con acceso al evento | Confirmar o cancelar asistencia |
| PATCH | `/api/calendario/eventos/:id/realizado` | Administrador o dirigente del evento | Marcar como realizada después de la hora de inicio |
| PATCH | `/api/calendario/eventos/:id/cancelar` | Administrador o dirigente del evento | Cancelar la actividad antes de su inicio |
| GET | `/api/calendario/eventos` | Autenticado | Próximas actividades de su subdirectiva y Directiva Departamental; esta última se muestra a todos |
| POST | `/api/calendario/eventos` | Administrador o dirigente | Crear actividad general o de subdirectiva, según alcance del cargo |
| GET | `/api/afiliados?q=texto&cargo=Presidente&rol=Rector&id_subdirectiva=1&estado=aprobado&estado_sindical=activo` | Administrador o Directiva Principal | Busca por nombre/cédula y filtra el padrón global |
| GET | `/api/afiliados/exportar?formato=excel` | Administrador o Directiva Principal | Descarga resultados filtrados como XLSX (`excel`) o PDF (`pdf`) |
| GET | `/api/afiliados/roles` | Administrador | Lista los roles disponibles |
| PATCH | `/api/afiliados/:id/asignacion` | Administrador o Directiva Principal | Actualizar afiliación local; sede y rol laboral son opcionales y se asignan juntos, al igual que el cargo local |
| PATCH | `/api/afiliados/:id/estado-sindical` | Administrador o Directiva Principal | Marcar afiliado como `activo` o `inactivo` |
| POST | `/api/afiliados` | Administrador | Registrar usuario (aprobado + rol) |
| PATCH | `/api/afiliados/:id/estado` | Administrador o Secretario General | Aprobar/rechazar solicitud |
| PATCH | `/api/afiliados/:id/roles` | Administrador | Reemplazar roles de un usuario (`{"roles":["Afiliado"]}`) |
| GET | `/api/membresia/afiliados?q=texto&cargo=Vicepresidente&rol=Profesor&id_subdirectiva=1` | Administrador o dirigente aprobado | Admin/directiva principal consulta el padrón completo; dirigentes locales consultan su subdirectiva asignada |
| GET | `/api/membresia/exportar?formato=pdf` | Administrador o dirigente aprobado | Descarga el padrón visible con los filtros activos; `formato=excel` genera XLSX |
| GET | `/api/subdirectivas` | Autenticado | Lista la jerarquía de subdirectivas, instituciones educativas y sedes |
| POST | `/api/subdirectivas/:id/instituciones` | Administrador o Directiva Principal | Crea una institución educativa dentro de una subdirectiva |
| PATCH | `/api/subdirectivas/:id` | Administrador o Directiva Principal | Cambia el nombre de una subdirectiva |
| PATCH | `/api/subdirectivas/instituciones/:id` | Administrador o Directiva Principal | Cambia el nombre de una institución educativa |
| POST | `/api/subdirectivas/instituciones/:id/sedes` | Administrador o Directiva Principal | Crea una sede dentro de una institución educativa |
| PATCH | `/api/subdirectivas/sedes/:id` | Administrador o Directiva Principal | Cambia el nombre de una sede |
| GET | `/api/subdirectivas/cargos` | Administrador o Directiva Principal | Lista cargos sindicales y si pueden repetirse |
| GET | `/api/subdirectivas/roles-laborales` | Administrador o Directiva Principal | Lista roles educativos disponibles para asignar en una sede |
| POST | `/api/subdirectivas` | Administrador o Directiva Principal | Crear subdirectiva (`{"nombre":"..."}`) |

### Ejemplo de uso

```bash
# 1. Solicitar el registro de un docente
curl -X POST http://localhost:3000/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nombre1":"Juan","apellido1":"Rojas","cedula":"1090999999","correo":"juan@mail.com","usuario":"juan","password":"clave123"}'

# La solicitud queda pendiente de validación por la Directiva.

# 2. Iniciar sesión como administrador
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"admin123"}'

# 3. Listar afiliados pendientes (usa el token del paso 2)
curl http://localhost:3000/api/afiliados?estado=pendiente \
  -H "Authorization: Bearer <TOKEN>"
```

## Despliegue: Vercel + Render + Supabase

La landing y las páginas HTML se publican como sitio estático en Vercel; Render ejecuta
Express y Supabase proporciona PostgreSQL y almacenamiento duradero. El backend conserva la
autorización de documentos: el bucket privado no se consulta directamente desde el navegador.

### Preparar Supabase

1. Crea un proyecto Supabase y migra/importa el esquema y los datos PostgreSQL que vas a
   conservar. Revisa las migraciones ya aplicadas antes de ejecutar otras.
2. En SQL Editor ejecuta [`database/supabase-storage.sql`](database/supabase-storage.sql).
   Crea un bucket público para fotos de perfil y otro privado para documentos.
3. Obtén `SUPABASE_URL`, la clave **service_role** y una `DATABASE_URL` con TLS. Usa la
   conexión pooler recomendada por Supabase para servicios persistentes si la conexión directa
   no es compatible con tu red.
4. Antes de desplegar la API, copia esas variables en el `.env` local y migra los archivos
   locales presentes:

   ```bash
   npm run migrate:storage
   ```

   El script conserva los archivos originales locales, usa sus nombres actuales para mantener
   las referencias existentes en la base de datos y puede repetirse de forma segura.

### Desplegar la API en Render

Conecta el repositorio a Render y crea el servicio desde [`render.yaml`](render.yaml). El
[`Dockerfile`](Dockerfile) instala LibreOffice para conservar la descarga PDF con portada de
los documentos Word. Render solicita las variables marcadas como secretas; configura:

- `DATABASE_URL`: conexión TLS a PostgreSQL.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: credenciales privadas del proyecto.
- `CORS_ORIGINS`: origen exacto del sitio Vercel, sin rutas ni barra final.
- `JWT_SECRET`: Render genera uno automáticamente desde el blueprint.

El plan de Render está en `free` para permitir iniciar sin comprometer un gasto. Los servicios
gratuitos pueden suspenderse por inactividad; para uso productivo continuo, elige un plan
siempre activo y valida los límites de memoria y tiempo de arranque de LibreOffice.

### Desplegar el sitio en Vercel

Importa el mismo repositorio en Vercel con la raíz del proyecto en `./`. [`vercel.json`](vercel.json)
instala y compila Astro, copia al resultado las páginas y recursos estáticos del backend (sin
copiar uploads locales) y reescribe `/api/*` hacia `https://sutens-api.onrender.com/api/*`.
Si Render asigna otra URL, actualiza ese destino y vuelve a desplegar. Usa Node.js 22.19 o
superior para compilar.

Actualiza `CORS_ORIGINS` en Render con el dominio Vercel real (y dominios personalizados si
corresponde). **No configures la clave `SUPABASE_SERVICE_ROLE_KEY` en Vercel** ni la incluyas
en el frontend; solo existe en el servidor Render. Revisa `/health`, inicio de sesión, subida y
descarga de documentos y carga de fotos tras el despliegue.

## Notas sobre el diseño

- **RBAC separado**: `rol_sistema` (Administrador SUTENS, Afiliado, Público) es distinto de
  `rol_laboral` (rector, coordinador, docente…). Esto corrige la mezcla del DER original.
- **Documentos**: se eliminó la tabla `biblioteca` (era circular). `documento` apunta directo
  a `tipo_documento`, y las subclases `documento_sindical` / `documento_educativo` heredan
  mediante `id_documento` (patrón superclase/subclase).
- **Cardinalidades**: `persona 1:1 afiliado` y `afiliado 1:1 usuario` (un docente = una cuenta).
- **Aprobación**: el `afiliado` nace en estado `pendiente`; el administrador lo aprueba/rechaza
  (panel de aprobación, HU-07).

## Próximos pasos sugeridos

1. Módulo de subdirectivas, instituciones educativas y sedes (CRUD).
2. Repositorio documental (subir/descargar archivos, actas y comunicados).
3. Calendario de eventos (tabla `evento` ya creada).
4. Dashboard de KPIs (reportes sobre afiliados y sedes).
