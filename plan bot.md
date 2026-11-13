# Plan de implementación del chatbot de SUTENS

## 1. Objetivo

Convertir el widget actual del dashboard en un asistente seguro y útil que ayude a navegar el sistema y consultar informes de afiliación con filtros. El asistente debe responder con información autorizada, explicar de dónde proviene y no sustituir las funciones de aprobación ni las decisiones de la Directiva.

Este documento es un plan, no autoriza por sí solo cambios en producción, contratación de servicios externos ni acceso a datos personales adicionales.

## 2. Estado actual — actualizado

- ✅ El widget ofrece ayuda determinista, preguntas sugeridas y consulta de los datos básicos del propio perfil; no usa IA externa ni conserva historial.
- ✅ El backend expone cuatro informes estructurados, con filtros validados, consultas parametrizadas de solo lectura, timeout y límite de resultados.
- ✅ El servidor autoriza informes a Administrador SUTENS y Directiva Departamental activa. Las exportaciones PDF/Excel y correos existen, pero siguen apagadas por defecto y sujetas a revisión legal/operativa.
- ✅ Las descargas están habilitadas explícitamente en la configuración local; otros entornos conservan el apagado por defecto hasta que su variable de entorno se active.
- ✅ La Directiva Departamental tiene acceso global a informes/exportaciones del chatbot mediante validación de su cargo departamental activo en el servidor; pruebas de staging pendientes.
- ✅ La auditoría registra una referencia seudónima HMAC para atribución operativa sin guardar el ID directo. Deriva de `JWT_SECRET`; rotar el secreto cambia la referencia.
- ⏳ El canal oficial de soporte aún no está configurado; el chatbot lo comunica sin mostrar un marcador interno.
- ⏳ Staging, operación, privacidad y producción no están validados; consultar `docs/chatbot-operacion.md`.
- No hay búsqueda individual libre, IA externa, acciones que modifiquen datos ni historial de conversación.

## 3. Principios y límites

1. **Autorización en el servidor:** cada petición identifica al usuario desde su JWT y aplica permisos y alcance por rol/subdirectiva. No confiar en filtros, roles o IDs enviados por el navegador.
2. **Consultas permitidas:** el backend ejecuta funciones de consulta explícitas, parametrizadas y de solo lectura. No aceptar ni ejecutar SQL redactado por un usuario o generado por una IA.
3. **Minimización de datos:** priorizar conteos y agrupaciones. Nombres, cédulas, celulares, correos y otros datos individuales solo podrán consultarse si el permiso existente lo autoriza y el usuario los necesita para su tarea.
4. **Sin exposición externa por defecto:** preguntas, resultados e identificadores personales no se envían a proveedores de IA. Integrar un proveedor externo requerirá decisión explícita, evaluación de privacidad/costos y aprobación del responsable del tratamiento.
5. **Respuestas verificables:** mostrar filtros aplicados, alcance consultado, fecha/hora de generación y fuente del informe. Si no entiende una pregunta, pedir aclaración en vez de adivinar.
6. **No realizar cambios críticos:** no aprobar/rechazar solicitudes, modificar afiliaciones, borrar datos ni cambiar roles desde el chat. Enlazar a la pantalla existente y exigir sus controles normales.
7. **Auditoría mínima:** usar referencia seudónima derivada de `JWT_SECRET`, nunca el ID directo; no guardar texto libre ni resultados personales por defecto. Restringir acceso a logs y definir retención.
8. **Cumplimiento:** revisar finalidad, autorización, retención y acceso conforme a la Ley 1581 de 2012 y a las políticas de SUTENS antes de habilitar datos personales.

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

### 4.5 Identidad, alcance y permisos solicitados

Se incorpora al plan el modelo de dos niveles pedido. El rol efectivo y el alcance se obtienen
del JWT y de las asignaciones existentes en el servidor; el prompt y la interfaz nunca conceden
permisos.

- **Acceso completo:** Administrador SUTENS y Directiva Departamental consultan los informes y
  exportaciones de todas las subdirectivas de SUTENS. Se mantienen la supresión de grupos pequeños
  en resultados agregados y los límites existentes; los datos individuales se descargan por los
  flujos autorizados del padrón/chatbot.
- La Directiva se identifica por los cargos departamentales activos reconocidos por la política
  existente (`Presidente General`, `Vicepresidente General`, `Secretario General`, `Fiscal General`
  y `Tesorero General`), no por un rol enviado por el cliente.
- **Acceso limitado:** los demás usuarios consultan información general aprobada y sus propios
  datos. No reciben datos personales de terceros; el servidor rechaza solicitudes fuera de su
  autorización.
- ✅ La interfaz ofrece un acceso rápido a datos básicos del perfil autenticado y responde a
  consultas simples como “mis datos” y “mi estado”. No incluye cédula ni datos de terceros.
- Si una persona sin permiso pide datos de terceros, responder de forma breve y respetuosa que
  no tiene autorización para compartirlos. La respuesta se da después del rechazo del backend,
  no como sustituto de este.

### 4.6 Alcance de las respuestas

- Responder en español, con tono respetuoso, claro y profesional, y priorizar respuestas breves.
- Atender consultas del sistema, procesos y funcionamiento general del sindicato a partir de
  contenido aprobado por SUTENS. No inventar cifras, requisitos, cargos, calendarios ni políticas;
  si falta información, declararlo y orientar al usuario al administrador/canal oficial.
- Para consultas ajenas al sindicato y al sistema, usar una respuesta amable de fuera de alcance
  y ofrecer ayuda sobre el sistema o la organización.
- Las consultas de datos se resuelven con operaciones tipadas y autorizadas del backend. No
  aceptar SQL, roles, IDs ni instrucciones del usuario como autoridad.
- Respuesta estándar ante una petición de información personal de terceros sin permiso:
  “No tengo autorización para compartir información personal de otros afiliados. Puedo ayudarte
  con información general del sindicato o con tus propios datos.”
- Respuesta estándar para temas ajenos al alcance: “Lo siento, mis funciones están limitadas a
  temas relacionados con el sindicato. ¿Puedo ayudarte con alguna consulta sobre el sistema o la
  organización?”
- El texto de sistema propuesto puede orientar tono, idioma, alcance y abstención, pero no es un
  control de seguridad. Si se mantiene el chatbot sin IA, estas reglas se implementarán como
  catálogo, clasificación determinista y respuestas seguras; no se integrará un proveedor externo
  solo para poder copiar un prompt.

### 4.7 Descargas generadas desde el chatbot

- Los PDF descargados directamente desde una conversación reutilizarán el mismo diseño aprobado
  del PDF del padrón: portada, jerarquía tipográfica, paleta, metadatos, tablas, márgenes y
  paginación coherentes. Mantener el exportador compartido cuando sea posible.
- En el pie de la portada de cada PDF generado directamente por el chatbot debe aparecer
  exactamente: **“Informe generado con chatbot SUTENS”**. La frase se añade solo a PDFs creados
  desde el chatbot, no a descargas del padrón ni a documentos subidos.
- Los Excel generados desde el chatbot conservarán la identidad visual y estructura de las
  exportaciones del padrón (título, metadatos, encabezados, anchos, filtros y formatos), sin
  alterar datos, orden ni semántica de columnas.
- La descarga es opcional después de presentar un informe autorizado. El PDF incluirá solo los
  datos que el mismo usuario está autorizado a consultar y el mismo resultado/filtros visibles.
  Recalcular en servidor, aplicar límites y registrar la descarga; no construir el archivo desde
  datos confiados al navegador.

## 5. Arquitectura propuesta

1. **Frontend (`public/js/chatbot.js`):** interfaz, acciones guiadas, estado temporal de conversación y envío de intención/filtros a la API autenticada.
2. **Rutas backend existentes:** extender `/api/chatbot/*` con autorización por capacidad/alcance para cada nivel; no depender del prompt ni de controles del navegador.
3. **Capa de servicio/intenciones:** convierte una selección guiada o una intención reconocida en una operación permitida. En la primera versión se prefieren códigos de intención y campos estructurados, no interpretación abierta.
4. **Autorización:** reusar `autenticar` y las funciones RBAC existentes; calcular el alcance usando el usuario autenticado y las asignaciones guardadas en la base.
5. **Consultas de informes:** SQL parametrizado con lista permitida de filtros, columnas y agrupaciones. Establecer topes de resultados, timeout y límites de frecuencia.
6. **Catálogo de ayuda:** respuestas revisadas y versionadas en una ubicación mantenible del proyecto. No incluir datos confidenciales ni instrucciones administrativas que el usuario no pueda ejecutar.
7. **Auditoría mínima:** registrar solo lo necesario para investigar abuso o errores (referencia seudónima derivada de `JWT_SECRET`, intención, hora y resultado/código; nunca el ID directo ni valores de filtros). No guardar texto libre ni resultados personales por defecto; restringir logs y definir retención.

## 6. Fases de trabajo

### Fase 0 — Definición y aprobación

**Estado: 🟡 decisiones de implementación aplicadas; aprobación legal y validación operativa pendientes.**

- ✅ Roles habilitados para informes: Administrador SUTENS y Directiva Departamental activa; los demás reciben rechazo del servidor.
- ✅ Informes de estadísticas; exportaciones individuales existentes autorizadas en la conversación y deshabilitadas por defecto.
- ✅ Sin historial y sin proveedor externo de IA.
- ⏳ Revisar finalidad, base legal, retención, textos legales y responsable de aprobación para despliegue.
- ⏳ Confirmar preguntas frecuentes publicables y definir el canal oficial de soporte.
- ⏳ Completar la validación de staging antes de habilitar acceso en producción.

**Salida:** matriz de permisos, catálogo inicial de informes y respuestas, criterios de privacidad aprobados.

### Fase 1 — Asistente de ayuda

**Estado: ✅ implementada.** `contentVerified` es la única puerta de publicación del catálogo; se retira el campo `reviewed` que no intervenía en la búsqueda. El canal oficial de soporte sigue pendiente.

- ✅ Se reemplazó la respuesta fija por navegación guiada y catálogo determinista.
- ✅ La búsqueda de ayuda funciona sin consultar el padrón.
- ✅ Se integraron enlaces internos y estados de interacción; ⏳ falta validar accesibilidad en staging.

**Criterio de aceptación:** preguntas de ayuda conocidas llevan a respuestas aprobadas; preguntas fuera del catálogo no inventan respuestas ni acceden a datos.

### Fase 2 — Informes agregados

**Estado: ✅ informes, exportaciones y autorización global para Directiva Departamental/Admin implementados; ⏳ staging y habilitación operativa pendientes.** La auditoría incorpora `actor_ref` seudónimo, sin ID directo ni valores de filtros.

- ✅ Endpoint autenticado para informes predefinidos.
- ✅ Conteos y agrupaciones con filtros permitidos.
- ✅ Alcance de RBAC, límites, parametrización y registro mínimo en servidor.
- ✅ Respuesta con filtros, fecha de consulta y alcance del resultado.

**Criterio de aceptación:** pruebas por rol demuestran que los informes no revelan información de otra subdirectiva y que la manipulación de parámetros no amplía permisos.

#### Ampliación aprobada: descargas desde el informe

- Administrador SUTENS y Directiva Departamental activa pueden descargar un listado de personas de los grupos visibles en
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

### Fase 3 — Búsqueda individual

**Estado: ❌ retirada del alcance activo.** No se duplicará la búsqueda de personas del padrón dentro del chatbot: agregaría exposición y riesgo de enumeración sin caso de uso aprobado. Reabrir solo con necesidad y revisión de privacidad/seguridad documentadas.

Esta función no tiene tareas activas. El padrón conserva su propio flujo de búsqueda autorizado.

### Fase 4 — Interpretación de lenguaje natural, fuera del alcance activo

**Estado: ⏸ diferida.** La ayuda determinista y los informes estructurados cubren el alcance actual; cualquier clasificador o proveedor de IA requiere decisión explícita y evaluación de privacidad/costos.

### Fase 5 — Validación, despliegue y operación

**Estado: ⏳ pendiente.** El checklist de staging está documentado, pero aún no tiene resultados registrados.

- Ejecutar pruebas unitarias, integración con PostgreSQL local y pruebas manuales por rol.
- Medir latencia p50/p95 y carga de consultas; revisar `EXPLAIN ANALYZE` en datos representativos.
- Probar en staging con datos sintéticos o anonimizados antes de Supabase de producción.
- Desplegar gradualmente con bandera de funcionalidad y monitorear errores, latencia y costos.
- Documentar configuración, permisos, límites, respuesta a incidentes y procedimiento para desactivar el asistente.

**Criterio de aceptación:** no hay accesos fuera de alcance, consultas de escritura, errores silenciosos ni degradación inaceptable; existe mecanismo de desactivación y guía de soporte.

### Fase 6 — Permisos por niveles y alcance organizacional

**Estado: ✅ implementada; ⏳ pruebas de staging pendientes.** La Directiva Departamental activa
consulta todo SUTENS mediante el cargo verificado en servidor, igual que Administrador SUTENS.

- ✅ Se definió el alcance global de SUTENS para Directiva Departamental y Administrador SUTENS.
- ✅ El backend valida el cargo departamental activo para cada informe y exportación; los demás
  usuarios siguen sin acceso a datos ajenos.
- ✅ La interfaz muestra la acción de informes a la Directiva y al administrador.
- ⏳ Añadir/ejecutar pruebas negativas por rol: afiliado, usuario no directivo, cargo inactivo,
  manipulación de filtros y llamada directa al endpoint de exportación.
- Mantener las descargas de datos personales apagadas hasta aprobación legal y aprobación de
  staging; no ampliar destinatarios por el solo texto de este plan.

**Criterio de aceptación:** Directiva activa y Administrador ven todo SUTENS; los demás roles son
rechazados en consulta y descarga por backend, con auditoría sin datos sensibles.

### Fase 7 — Respuestas conversacionales y archivos

**Estado: 🟡 flujo, perfil propio y formato PDF implementados; contenido general amplio y validación visual pendientes.**

- ✅ Aplicar idioma, tono, límites temáticos, abstención y orientación inicial definidos en
  las secciones 4.5–4.6. ⏳ Publicar nuevas respuestas generales solo después de validarlas con SUTENS.
- ✅ Permitir a cada usuario consultar campos básicos de su propio perfil sin exponer datos de terceros.
- ✅ Después de cada informe permitido con resultados, ofrecer archivos solo si la política
  del usuario lo permite. El servidor vuelve a validar la solicitud al generar el archivo.
- ✅ Reutilizar el generador PDF del padrón y añadir la leyenda de chatbot al pie de la primera
  página, sin cambiar las descargas ajenas al chatbot.
- ✅ Mantener formato coherente en Excel sin cambiar columnas ni datos; ⏳ revisar renderizado de
  contenido largo, acentos y paginación en staging.

**Criterio de aceptación:** respuestas fuera de alcance no consultan datos; respuestas sin
fuente aprobada se abstienen; el PDF conserva el formato del padrón y muestra la leyenda exacta
en portada; el Excel mantiene columnas y contenido, con formato consistente.

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
| RBAC | Afiliado u otro rol no autorizado solicita informe o exportación | 403; manipular rol/alcance en el body no concede acceso |
| Niveles | Directiva activa y Administrador consultan subdirectivas distintas | Alcance global SUTENS; se mantiene supresión de grupos pequeños en agregados |
| Validación | Enviar filtros inválidos, excesivos o manipulados | Rechazo controlado; no se altera el SQL ni se amplían permisos |
| Lectura | Intentar enviar una intención de escritura o SQL en el texto | No se ejecuta ninguna escritura ni SQL proporcionado |
| Privacidad | Preguntar por campos no aprobados | No se revelan; explicación clara de limitación |
| Informes | Comparar conteos con consultas de referencia autorizadas | Totales y filtros coinciden |
| Ayuda | Preguntas conocidas, ambiguas y desconocidas | Respuesta aprobada, aclaración o abstención; nunca inventar |
| Datos propios | Usuario pregunta “mis datos” o “mi estado” | Solo recibe campos básicos de su perfil autenticado; sin datos de terceros |
| Inyección | Mensajes con HTML, scripts o instrucciones de omitir reglas | Se muestran como texto y no alteran permisos ni ejecución |
| Rendimiento | Medir p50/p95 con volumen de datos representativo | Cumplir umbral acordado con responsable del producto |
| Accesibilidad | Teclado, lector de pantalla, foco y móvil | Uso completo sin barreras críticas |
| Resiliencia | API o base temporalmente no disponible | Error entendible, reintento controlado y sin datos parciales engañosos |
| Auditoría | Revisar registros de consultas | Trazabilidad suficiente sin copiar datos personales innecesarios |
| Exportaciones | Generar PDF desde chatbot y comparar con padrón | Mismo diseño, leyenda exacta en portada y sin hojas en blanco |
| Excel | Exportar informe desde chatbot | Identidad visual coherente sin cambiar columnas ni datos |
| Alcance conversacional | Consultar sobre clima u otro tema ajeno | Respuesta breve y amable de fuera de alcance, sin consulta a datos |

## 9. Decisiones y pendientes

Estas decisiones afectan privacidad, permisos, costos o alcance. No se asumirán ni se aplicarán sin consultarlas:

1. ✅ Directiva Departamental activa y Administrador SUTENS tienen alcance sobre todo SUTENS en informes y exportaciones; los demás usuarios no acceden a datos de terceros.
2. ✅ El chat muestra estadísticas; las descargas pueden incluir datos de personas de
   grupos visibles, bajo las condiciones descritas en la Fase 2.
3. ✅ No se guarda historial ni texto libre en servidor.
4. ✅ No se incorpora IA; cualquier propuesta sigue fuera del alcance y requiere evaluación/aprobación.
5. ✅ Exportaciones existentes: PDF/Excel de afiliados y Excel de correos de grupos visibles; deshabilitadas por defecto.
6. ⏳ Definir el canal oficial de soporte para reemplazar la orientación genérica.
7. ⏳ Acordar umbrales de latencia/carga y completar staging antes de producción.
8. ⏳ Definir retención/acceso de logs; al escalar a varias instancias, usar almacenamiento compartido para límites de frecuencia.
9. ⏳ Validar con SUTENS el contenido general del sindicato y la respuesta final para preguntas fuera de alcance.

## 10. Alcance inicial recomendado

El chatbot permite informes para Directiva Departamental activa y Administrador SUTENS, con
alcance global de SUTENS y validación en servidor. Las exportaciones se mantienen apagadas por
defecto mediante la bandera existente. El flujo ofrece PDF/Excel coherentes con el padrón y el
PDF de chatbot incluye la leyenda en portada. Completar staging, revisión operativa/privacidad y
validación visual antes de habilitar en producción. La búsqueda individual libre, las acciones
que modifican datos y la IA externa siguen fuera del alcance.
