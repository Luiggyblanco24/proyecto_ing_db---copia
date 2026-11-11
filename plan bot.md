# Plan de implementación del chatbot de SUTENS

## 1. Objetivo

Convertir el widget actual del dashboard en un asistente seguro y útil que ayude a navegar el sistema y consultar informes de afiliación con filtros. El asistente debe responder con información autorizada, explicar de dónde proviene y no sustituir las funciones de aprobación ni las decisiones de la Directiva.

Este documento es un plan, no autoriza por sí solo cambios en producción, contratación de servicios externos ni acceso a datos personales adicionales.

## 2. Estado actual

- El widget se carga desde `public/js/chatbot.js` en `public/dashboard.html`.
- Permite abrir y cerrar un panel, escribir hasta 500 caracteres y muestra una respuesta fija.
- No tiene integración con la API, consultas a la base de datos, IA, catálogo de ayuda ni memoria de conversaciones.
- El backend es Express y PostgreSQL; las rutas autenticadas usan JWT y middleware RBAC.
- La búsqueda existente de afiliados está en el servidor. El chatbot debe reutilizar reglas y consultas autorizadas, nunca copiar credenciales ni conectarse directamente desde el navegador a PostgreSQL.

## 3. Principios y límites

1. **Autorización en el servidor:** cada petición identifica al usuario desde su JWT y aplica permisos y alcance por rol/subdirectiva. No confiar en filtros, roles o IDs enviados por el navegador.
2. **Consultas permitidas:** el backend ejecuta funciones de consulta explícitas, parametrizadas y de solo lectura. No aceptar ni ejecutar SQL redactado por un usuario o generado por una IA.
3. **Minimización de datos:** priorizar conteos y agrupaciones. Nombres, cédulas, celulares, correos y otros datos individuales solo podrán consultarse si el permiso existente lo autoriza y el usuario los necesita para su tarea.
4. **Sin exposición externa por defecto:** preguntas, resultados e identificadores personales no se envían a proveedores de IA. Integrar un proveedor externo requerirá decisión explícita, evaluación de privacidad/costos y aprobación del responsable del tratamiento.
5. **Respuestas verificables:** mostrar filtros aplicados, alcance consultado, fecha/hora de generación y fuente del informe. Si no entiende una pregunta, pedir aclaración en vez de adivinar.
6. **No realizar cambios críticos:** no aprobar/rechazar solicitudes, modificar afiliaciones, borrar datos ni cambiar roles desde el chat. Enlazar a la pantalla existente y exigir sus controles normales.
7. **Cumplimiento:** revisar finalidad, autorización, retención y acceso conforme a la Ley 1581 de 2012 y a las políticas de SUTENS antes de habilitar datos personales.

## 4. Experiencia propuesta

### 4.1 Bienvenida y opciones guiadas

Al abrir el widget, presentar acciones rápidas según los permisos del usuario:

- **Consultar informes**
- **Buscar ayuda del sistema**
- **Ver preguntas sugeridas**

Ejemplos de preguntas sugeridas: “¿Cuántos afiliados aprobados hay?”, “Resume los afiliados por subdirectiva” y “¿Cómo actualizo mis datos?”. No ofrecer opciones para las que el rol no tenga acceso.

### 4.2 Informes de afiliación

Primera versión con filtros estructurados y comprensibles:

- Estado de afiliación: pendiente, aprobado, rechazado o retirado, según lo que el rol pueda ver.
- Subdirectiva, institución y sede, limitadas al alcance autorizado.
- Estado sindical activo/inactivo cuando sea pertinente.
- Periodo de fechas para informes de solicitudes o aprobaciones, si se valida la semántica y disponibilidad de las fechas.
- Agrupar por subdirectiva, institución, sede, estado y periodo, según permisos.

Resultados iniciales recomendados:

- Conteo de afiliados, solicitudes pendientes y aprobaciones en un periodo.
- Distribución por subdirectiva/sede.
- Tendencia temporal de altas aprobadas.
- Lista individual solo si la autorización actual del padrón lo permite; aplicar paginación y campos mínimos.

El sistema indicará cuando un filtro se haya ignorado o no sea válido. No debe ampliar silenciosamente el alcance para poder responder.

### 4.3 Ayuda contextual

Crear un catálogo de preguntas y respuestas revisadas por SUTENS sobre tareas existentes, como iniciar sesión, recuperar contraseña, actualizar datos, usar biblioteca/calendario y solicitar soporte. Cada respuesta debe incluir enlaces internos a la vista o procedimiento correspondiente cuando exista.

La ayuda inicial será determinista (búsqueda por palabras clave o categorías), sin IA generativa. Cuando no encuentre una respuesta, indicará que no puede resolverla y sugerirá el canal de soporte aprobado.

### 4.4 Conversación

- Mostrar mensajes del usuario y respuestas claramente diferenciados.
- Mantener el foco accesible y permitir uso por teclado y lector de pantalla.
- Incorporar estados de carga, error, reintento y respuesta vacía.
- Permitir borrar la conversación localmente.
- No conservar historial en el servidor en la primera versión.
- En respuestas tabulares, presentar tablas accesibles y controles para refinar filtros.

## 5. Arquitectura propuesta

1. **Frontend (`public/js/chatbot.js`):** interfaz, acciones guiadas, estado temporal de conversación y envío de intención/filtros a la API autenticada.
2. **Ruta backend nueva:** endpoint autenticado bajo `/api`, limitado a las capacidades aprobadas del asistente.
3. **Capa de servicio/intenciones:** convierte una selección guiada o una intención reconocida en una operación permitida. En la primera versión se prefieren códigos de intención y campos estructurados, no interpretación abierta.
4. **Autorización:** reusar `autenticar` y las funciones RBAC existentes; calcular el alcance usando el usuario autenticado y las asignaciones guardadas en la base.
5. **Consultas de informes:** SQL parametrizado con lista permitida de filtros, columnas y agrupaciones. Establecer topes de resultados, timeout y límites de frecuencia.
6. **Catálogo de ayuda:** respuestas revisadas y versionadas en una ubicación mantenible del proyecto. No incluir datos confidenciales ni instrucciones administrativas que el usuario no pueda ejecutar.
7. **Auditoría mínima:** registrar solo lo necesario para investigar abuso o errores (usuario, intención, hora, resultado/código y filtros no sensibles). No guardar texto libre completo ni resultados con datos personales por defecto.

## 6. Fases de trabajo

### Fase 0 — Definición y aprobación

- Acordar qué roles usarán el asistente.
- Definir una matriz de informes por rol y el alcance geográfico/organizacional.
- Determinar si se permitirán datos individuales o únicamente estadísticas.
- Revisar finalidad, consentimiento, retención, textos legales y responsable de aprobación.
- Confirmar qué preguntas frecuentes y canal de soporte se publicarán.
- No iniciar la consulta de datos reales hasta cerrar estas decisiones.

**Salida:** matriz de permisos, catálogo inicial de informes y respuestas, criterios de privacidad aprobados.

### Fase 1 — Asistente de ayuda

- Reemplazar la respuesta fija por navegación guiada y catálogo de ayuda revisado.
- Implementar búsqueda de ayuda sin acceso al padrón.
- Añadir enlaces internos, accesibilidad y estados de interacción.

**Criterio de aceptación:** preguntas de ayuda conocidas llevan a respuestas aprobadas; preguntas fuera del catálogo no inventan respuestas ni acceden a datos.

### Fase 2 — Informes agregados

- Añadir el endpoint autenticado para informes predefinidos.
- Implementar conteos y agrupaciones con filtros permitidos.
- Aplicar alcance de RBAC en el servidor, límites, parametrización y registro mínimo.
- Mostrar filtros aplicados, fecha de consulta y alcance del resultado.

**Criterio de aceptación:** pruebas por rol demuestran que los informes no revelan información de otra subdirectiva y que la manipulación de parámetros no amplía permisos.

#### Ampliación aprobada: descargas desde el informe

- El Administrador SUTENS puede descargar un listado de personas de los grupos visibles en
  PDF o Excel con el diseño y columnas del padrón, o un Excel separado solo con correos.
  SUTENS confirmó la autorización de nombre, cédula y correo para esta finalidad.
- Los grupos suprimidos no aportan correos por sí solos; una persona también puede pertenecer
  a un grupo visible. Como el acceso a correos individuales puede permitir inferencias entre
  consultas, no ofrece la misma privacidad que un informe agregado.
- Cada descarga recalcula filtros y supresión en el servidor; puede diferir del resultado
  mostrado si los datos cambiaron. Se mantiene la autorización, el límite de frecuencia,
  el timeout, la auditoría sin resultados y una transacción de lectura consistente.
- Se confirmó la autorización de esta finalidad en la conversación; corresponde a SUTENS
  conservar el soporte y verificar el cumplimiento legal y las políticas de tratamiento.

### Fase 3 — Búsqueda individual, solo si se aprueba

- Definir campos permitidos (por ejemplo, nombre y estado) y excluir por defecto cédula, correo y celular.
- Reutilizar permisos y alcance del padrón; paginar resultados y ocultar campos no aprobados.
- Someter la funcionalidad a revisión legal y de seguridad antes de habilitarla.

**Criterio de aceptación:** pruebas de autorización negativas, mínimo de datos, registro de acceso y controles anti-enumeración aprobados.

### Fase 4 — Interpretación de lenguaje natural, opcional y sujeta a aprobación

- Evaluar primero un clasificador local/reglas para mapear preguntas a intenciones permitidas.
- Si se propone un proveedor externo, presentar antes proveedor, ubicación/retención de datos, costos, contrato y medidas de protección para autorización.
- El modelo solo puede proponer una intención y filtros; el backend valida y ejecuta. Nunca recibe credenciales ni SQL libre.
- Responder con aclaraciones cuando haya ambigüedad y abstenerse ante solicitudes no permitidas.

**Criterio de aceptación:** conjunto de preguntas de prueba demuestra interpretación correcta, rechazo de instrucciones maliciosas, no divulgación entre roles y respuestas basadas únicamente en resultados autorizados.

### Fase 5 — Validación, despliegue y operación

- Ejecutar pruebas unitarias, integración con PostgreSQL local y pruebas manuales por rol.
- Medir latencia p50/p95 y carga de consultas; revisar `EXPLAIN ANALYZE` en datos representativos.
- Probar en staging con datos sintéticos o anonimizados antes de Supabase de producción.
- Desplegar gradualmente con bandera de funcionalidad y monitorear errores, latencia y costos.
- Documentar configuración, permisos, límites, respuesta a incidentes y procedimiento para desactivar el asistente.

**Criterio de aceptación:** no hay accesos fuera de alcance, consultas de escritura, errores silenciosos ni degradación inaceptable; existe mecanismo de desactivación y guía de soporte.

## 7. Seguridad, abuso y privacidad

- Requerir JWT válido; no habilitar informes a usuarios anónimos.
- Validar tipos, longitudes y valores permitidos de cada filtro.
- Parametrizar todos los valores SQL; para columnas y agrupaciones usar listas cerradas en código.
- Limitar frecuencia por usuario/IP y tamaño de respuesta.
- Añadir timeout de consultas y cancelar consultas costosas.
- No mostrar SQL, trazas, variables de entorno ni errores internos al usuario.
- Evitar que mensajes del usuario se inserten como HTML.
- Prevenir enumeración de afiliados, consultas masivas y extracción repetitiva.
- Registrar eventos de acceso sin almacenar datos sensibles innecesarios.
- Definir política de retención y borrado antes de conservar conversaciones o analítica.

## 8. Plan de pruebas

| Área | Prueba | Resultado esperado |
|---|---|---|
| Autenticación | Enviar una consulta sin token o con token vencido | Rechazo 401; no se ejecuta consulta de informe |
| RBAC | Solicitar informe de otra subdirectiva | 403 o resultado limitado al alcance propio, según el diseño aprobado |
| Validación | Enviar filtros inválidos, excesivos o manipulados | Rechazo controlado; no se altera el SQL ni se amplían permisos |
| Lectura | Intentar enviar una intención de escritura o SQL en el texto | No se ejecuta ninguna escritura ni SQL proporcionado |
| Privacidad | Preguntar por campos no aprobados | No se revelan; explicación clara de limitación |
| Informes | Comparar conteos con consultas de referencia autorizadas | Totales y filtros coinciden |
| Ayuda | Preguntas conocidas, ambiguas y desconocidas | Respuesta aprobada, aclaración o abstención; nunca inventar |
| Inyección | Mensajes con HTML, scripts o instrucciones de omitir reglas | Se muestran como texto y no alteran permisos ni ejecución |
| Rendimiento | Medir p50/p95 con volumen de datos representativo | Cumplir umbral acordado con responsable del producto |
| Accesibilidad | Teclado, lector de pantalla, foco y móvil | Uso completo sin barreras críticas |
| Resiliencia | API o base temporalmente no disponible | Error entendible, reintento controlado y sin datos parciales engañosos |
| Auditoría | Revisar registros de consultas | Trazabilidad suficiente sin copiar datos personales innecesarios |

## 9. Decisiones que requieren aprobación antes de implementarse

Estas decisiones afectan privacidad, permisos, costos o alcance. No se asumirán ni se aplicarán sin consultarlas:

1. ¿Qué roles podrán usar el asistente y qué informes verá cada uno?
2. Decidido: el chat muestra estadísticas; las descargas pueden incluir datos de personas de
   grupos visibles, bajo las condiciones descritas en la Fase 2.
3. ¿Se autoriza guardar preguntas o historial? Recomendación inicial: no guardar el texto libre.
4. ¿Se permitirá un proveedor de IA externo? Si sí, ¿cuál y bajo qué revisión jurídica y de privacidad?
5. Decidido: PDF/Excel de afiliados y Excel de correos de grupos visibles.
6. ¿Qué canal de soporte debe recomendar el bot cuando no pueda ayudar?
7. ¿Qué umbral de latencia y límites de consultas concurrentes se consideran aceptables?

## 10. Alcance inicial recomendado

El alcance inicial recomendado fue implementar las fases 0, 1 y 2 sin exportaciones nuevas.
Posteriormente se aprobó la ampliación de descargas descrita en la Fase 2. La IA externa,
la consulta libre de personas y cualquier acción que modifique datos siguen fuera del alcance.
