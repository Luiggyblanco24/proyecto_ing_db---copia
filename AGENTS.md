# Instrucciones para agentes

## Contexto del proyecto
- Consulta [README.md](README.md) para el flujo de instalación, configuración de PostgreSQL y endpoints documentados.
- `backend/src/server.js` sirve `backend/public` y monta la API en `/api`; las rutas delegan en controladores y el acceso a PostgreSQL se centraliza en `backend/src/config/db.js`.
- El frontend usa HTML, CSS y JavaScript sin framework en `backend/public`. El esquema y los datos iniciales viven en `database/schema.sql` y `database/seed.sql`.

## Convenciones
- Mantén los módulos ES, imports con extensión `.js`, indentación de dos espacios y punto y coma, siguiendo el código existente.
- Conserva la separación entre rutas, controladores, middleware y acceso a datos; evita mover lógica entre capas sin una razón concreta.
- Usa consultas SQL parametrizadas con el helper existente; no construyas SQL concatenando datos de usuario.
- Valida autorización en el servidor, especialmente en operaciones administrativas. No confíes en controles de interfaz como límite de acceso.
- Trata los datos de usuarios como no confiables al renderizarlos en HTML. No publiques secretos ni uses credenciales de demostración como valores de producción.

## Comandos y validación
- Desde `backend/`, instala dependencias con `npm install`, inicia desarrollo con `npm run dev` o producción con `npm start`.
- `backend/package.json` no define scripts de pruebas, lint o build. No afirmes que esas verificaciones pasaron; si son relevantes, indica qué comprobaciones manuales o alternativas ejecutaste y qué quedó sin verificar.
- Para cambios de base de datos, comprueba la coherencia entre `database/schema.sql`, `database/seed.sql` y las consultas del backend. El README documenta cómo crear la base y cargar ambos archivos.

## Revisiones de código
- Si te piden revisar archivos o cambios, informa primero los defectos concretos, ordenados por gravedad, con ruta y línea, condición de activación e impacto. Distingue errores demostrables de riesgos o preguntas abiertas.
- Sigue el flujo afectado hasta sus validaciones, autorización, consultas y respuesta; en cambios de interfaz comprueba también el origen y escape de los valores renderizados.
- No conviertas preferencias de estilo en defectos. Si no encuentras problemas, dilo claramente y menciona las limitaciones de cobertura o verificaciones pendientes.
- En una solicitud de revisión, no edites archivos salvo que también se pida implementar las correcciones.