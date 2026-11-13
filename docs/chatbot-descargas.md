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

Administrador SUTENS y titulares activos de la Directiva Departamental tienen acceso global en
el chatbot. La Directiva se autoriza mediante los cargos departamentales activos validados por el
servidor. PDF/Excel del padrón incluyen nombre completo, cédula, correo, subdirectiva, institución
educativa, cargo sindical, sede, rol laboral, estado de solicitud y estado sindical. El Excel de
correos contiene direcciones, sin otras columnas personales. Cada archivo contiene el aviso de
datos de uso restringido.

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
conoce, resultado y una referencia seudónima HMAC para usuarios autenticados; no guardan el ID
directo, valores de filtros ni contenido de archivos. La referencia deriva de `JWT_SECRET`, por
lo que su rotación cambia los valores. Los logs requieren acceso restringido y retención definida.
La autenticación actualiza la actividad de sesión; las consultas del informe son de solo lectura.

## Limitación conocida de privacidad

La supresión, incluida la complementaria, se aplica a cada respuesta y **no garantiza anonimato
frente a consultas solapadas**. Por ejemplo, si un corte devuelve 40 personas y otro, dentro del
mismo corte, devuelve 39 activas, la resta revela una inactiva aunque el grupo de inactivas se
suprima. El acceso global de la Directiva Departamental es intencional y corresponde a un grupo
con acceso autorizado a la gestión del padrón; los informes no deben presentarse como anónimos.
Afiliados y demás roles no reciben acceso a informes o exportaciones de terceros.

La subprueba `LIMITACIÓN CONOCIDA` de
[`chatbot-reports.integration.test.js`](../tests/chatbot-reports.integration.test.js) reproduce
el caso 40 − 39 = 1 con datos sintéticos en PostgreSQL aislado. Es una prueba que documenta el
riesgo existente: pasarla no significa que la protección contra inferencias esté resuelta.

La autorización global no resuelve el riesgo de inferencia ni limita las copias de datos
personales. Se mantiene la supresión como protección adicional para resultados agregados, pero no
como garantía de anonimato. Revisar el riesgo al combinar estos informes con otros endpoints y
mantener controles de frecuencia/volumen; sus límites actuales son por proceso y no globales.

## Pendientes antes de producción

- Validación jurídica de la finalidad, exclusiones, base de tratamiento, autorización aplicable,
  acceso, retención y eliminación conforme a la Ley 1581 de 2012 y demás normativa aplicable.
- Definir responsables, destino de logs, plazo de conservación, revisión de alertas y respuesta.
- Definir controles compartidos entre instancias y evaluar el riesgo de consultas o extracciones
  repetitivas y las inferencias por diferencia en monitoreo y operación.
- Revisar `/api/membresia/estadisticas`, que es una vía independiente de estadísticas: sus
  permisos, grupos pequeños, alcance y posibilidad de combinarlos con informes del chatbot.
  Actualmente no está sometida a la supresión del chatbot.
