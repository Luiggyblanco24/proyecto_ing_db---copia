# Descargas del asistente SUTENS

## Autorización y finalidad declaradas

El solicitante del proyecto autorizó las descargas en la conversación de desarrollo y confirmó
su consolidación el 9 de noviembre de 2026. Esto documenta esa decisión, no acredita su cargo,
facultad legal ni una aprobación jurídica formal.

- PDF/Excel del padrón: uso exclusivo de la administración del sistema para verificar y depurar
  registros de afiliación, apoyar la gestión de solicitudes y preparar informes para la Directiva
  en ejercicio de las funciones estatutarias de SUTENS.
- Excel de correos: comunicaciones institucionales a afiliados sobre convocatorias, citaciones,
  avisos y novedades de la afiliación y actividad sindical.
- Exclusiones propuestas: fines comerciales, publicitarios o de terceros; cesión o transferencia
  a terceros sin autorización; uso personal o ajeno a las funciones sindicales.

## Datos y controles

Únicamente Administrador SUTENS tiene acceso global. PDF/Excel del padrón incluyen nombre completo,
cédula, correo, subdirectiva, institución educativa, cargo sindical, sede, rol laboral, estado de
solicitud y estado sindical. El Excel de correos contiene direcciones, sin otras columnas personales.
Cada archivo contiene el aviso de datos de uso restringido.

La aplicación genera el archivo en memoria y lo entrega con `Cache-Control: no-store`; no lo guarda
deliberadamente en el servidor. No controla las copias guardadas por el destinatario, navegador,
sistema operativo, infraestructura o herramientas externas. La política y el plazo de conservación
de esas copias deben definirlos SUTENS.

Las descargas están deshabilitadas por defecto mediante `CHATBOT_DOWNLOADS_ENABLED=false`.
Hay límite por archivo y frecuencia, y alerta por volumen, configurables como se describe en el
README. Estos controles en memoria son por proceso: reinicios y múltiples instancias impiden una
cuota global. No garantizan que datos de grupos ocultos sean imposibles de inferir mediante
consultas o descargas solapadas; una persona en grupos visibles y ocultos puede aparecer.
El mecanismo limita el tamaño de cada archivo pero no implementa paginación de consultas individuales.

Los eventos operativos registran fecha, informe, formato, nombres de filtros, cantidad cuando se
conoce y resultado, sin identidad de usuario, valores de filtros ni contenido de archivos. Por
decisión del solicitante esto elimina la trazabilidad individual previamente existente; debe
evaluarse su suficiencia legal y operativa antes de habilitar descargas. La autenticación existente
actualiza la actividad de sesión; las consultas del informe son de solo lectura.

## Limitación conocida y propuesta para Directiva

La supresión, incluida la complementaria, se aplica a cada respuesta y **no garantiza anonimato
frente a consultas solapadas**. Por ejemplo, si un corte devuelve 40 personas y otro, dentro del
mismo corte, devuelve 39 activas, la resta revela una inactiva aunque el grupo de inactivas se
suprima. Por este riesgo, los informes del chatbot solo están habilitados para Administrador
SUTENS; habilitar Directiva u otros roles requiere resolver y validar primero esta limitación.

La subprueba `LIMITACIÓN CONOCIDA` de
[`chatbot-reports.integration.test.js`](../tests/chatbot-reports.integration.test.js) reproduce
el caso 40 − 39 = 1 con datos sintéticos en PostgreSQL aislado. Es una prueba que documenta el
riesgo existente: pasarla no significa que la protección contra inferencias esté resuelta.

**Propuesta, no implementada:** antes de dar acceso a Directiva, definir en el servidor una
partición fija de cortes mutuamente excluyentes por persona y por periodo cerrado, con celdas
aprobadas y umbral mínimo. Permitir únicamente esas celdas; no ofrecer totales que contengan
esas celdas, filtros adicionales, agrupaciones alternativas ni descargas individuales que
permitan comparaciones reveladoras. El alcance se calcularía en el servidor. Las asignaciones
en varias subdirectivas requieren una regla de pertenencia única o impedir el corte que las
solape. Deben evaluarse también cambios entre periodos, revisiones de datos y estadísticas de
otros endpoints antes de aprobar el diseño.

Como medida complementaria, se propone detectar y alertar consultas casi idénticas o repetidas
mediante metadatos estructurados mínimos y un contador compartido entre instancias, con retención
y responsables definidos. La alerta por sí sola no bloquea la inferencia ni garantiza anonimato;
no sustituye la restricción de cortes ni las pruebas adversariales entre consultas y endpoints.

## Pendientes antes de producción

- Validación jurídica de la finalidad, exclusiones, base de tratamiento, autorización aplicable,
  acceso, retención y eliminación conforme a la Ley 1581 de 2012 y demás normativa aplicable.
- Definir responsables, destino de logs, plazo de conservación, revisión de alertas y respuesta.
- Definir controles compartidos entre instancias y evaluar el riesgo de consultas o extracciones
  repetitivas y las inferencias por diferencia antes de habilitar descargas.
- Revisar `/api/membresia/estadisticas`, que es una vía independiente de estadísticas: sus
  permisos, grupos pequeños, alcance y posibilidad de combinarlos con informes del chatbot.
  Actualmente no está sometida a la supresión del chatbot.
