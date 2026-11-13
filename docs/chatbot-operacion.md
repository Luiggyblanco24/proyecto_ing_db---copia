# Operación del chatbot

## Alcance y configuración inicial

Los informes se autorizan para Administrador SUTENS y titulares activos de los cargos de la
Directiva Departamental reconocidos por el servidor (`Presidente General`, `Vicepresidente
General`, `Secretario General`, `Fiscal General` y `Tesorero General`). Su alcance es todo SUTENS.
Afiliados y demás roles no tienen acceso a estos informes. Las descargas individuales permanecen
apagadas por defecto. Sin IA externa ni historial de conversación. Las consultas son de solo
lectura; la autenticación actualiza la actividad de sesión.

- `CHATBOT_ENABLED=false` por defecto bloquea todas las rutas `/api/chatbot/*` con 404 y oculta
  el widget. Con `true` se habilita el asistente; la autorización por rol sigue en el servidor.
- `CHATBOT_DOWNLOADS_ENABLED=false` mantiene descargas apagadas incluso con chatbot habilitado.
- Las variables se leen al iniciar el proceso. Asegurar la misma configuración en todas las
  instancias y esperar que los procesos anteriores terminen; una pestaña abierta necesita
  recargarse para reflejar el estado visual.
- Los límites y alertas son en memoria por proceso, se pierden al reiniciar y no son globales.
  Los valores de configuración están en `.env.example` y el README.

## Checklist de staging — pendiente de ejecución

Usar servicios y base PostgreSQL **aislados**, cuentas y datos sintéticos, secretos diferentes
y buckets separados. Confirmar con el operador que la URL de Vercel de pruebas reescribe al
Render de pruebas; el destino de `vercel.json` es fijo y no debe reutilizarse sin verificarlo.
No usar una previsualización conectada a producción ni copiar datos reales.

- [ ] Verificar aislamiento y acceso restringido a staging, logs y datos sintéticos.
- [ ] Con ambas banderas en `false`, verificar por HTTP que todas las rutas del chatbot
      responden 404, incluso sin sesión y con cuerpo JSON inválido, y que no aparece el widget.
- [ ] Activar solo `CHATBOT_ENABLED`; reiniciar todas las instancias y recargar el panel.
      Verificar ayuda, sesión ausente/vencida, informes de administrador y Directiva activa,
      y rechazo por backend de afiliados/otros roles, incluidos roles y filtros manipulados.
- [ ] Con `CHATBOT_DOWNLOADS_ENABLED=false`, comprobar que el botón no aparece y el endpoint
      de descarga devuelve 404 para administrador y Directiva Departamental autenticados.
- [ ] Comparar los cuatro informes con consultas de referencia; probar límites, timeout,
      escritura rechazada, PDF con leyenda exacta de chatbot en portada, formato Excel, mensajes
      genéricos, consulta del perfil propio, XSS, teclado, lector de pantalla y móvil.
- [ ] Generar eventos sintéticos de éxito, 400, 401, 403, 429, timeout y errores; comprobar
      que no contienen IDs directos, tokens, valores de filtros, SQL, datos personales ni texto
      libre; verificar el uso esperado de `actor_ref` seudónimo. Confirmar que los logs de aplicación y proveedor no son accesibles a usuarios
      normales; revisar también proxies, exportadores y errores de infraestructura.
- [ ] Ejecutar el build Astro real y verificar que se copian dashboard, scripts y estilos del
      chatbot a `dist`, sin copiar `uploads`. Comprobar el resultado servido por staging.
- [ ] Medir p50/p95 y carga con datos sintéticos; acordar umbrales, revisar costos, tasa de
      errores y disponibilidad. Confirmar que ninguna instancia mantiene código/configuración
      anterior durante el cambio.
- [ ] Desactivar la bandera, verificar 404 desde frontend y backend y realizar rollback
      controlado. Registrar resultados y responsables de aprobación.

## Activación y observación

1. Completar la lista de staging y las revisiones de seguridad y legal; aceptar explícitamente
   el riesgo conocido de inferencia entre consultas para el administrador.
2. Desplegar inicialmente con `CHATBOT_ENABLED=false` y `CHATBOT_DOWNLOADS_ENABLED=false`;
   comprobar 404 por la ruta publicada y por cada instancia accesible.
3. Solo tras aprobación, establecer `CHATBOT_ENABLED=true`, mantener descargas en `false`,
   reiniciar/actualizar todas las instancias y comprobar sesión, autorización y widget con
   cuentas autorizadas. No modificar roles.
4. Vigilar `chatbot_informe` por resultado y `duracion_ms` (p50/p95 de los eventos con esa
   duración, medida en el controlador, no extremo a extremo), aumentos de 403, 429,
   500 y `timeout`, además de disponibilidad, carga y costos. La alerta
   `chatbot_exportacion_volumen` solo aparece si se habilitan descargas y se alcanza el umbral;
   ninguna alerta de volumen es global entre procesos. Definir responsables y umbrales antes
   de producción; no existe una integración de alertas externa configurada en el repositorio.

Los eventos autenticados de informes, exportaciones y rechazos de autorización incluyen
`actor_ref`: HMAC truncado derivado del ID autenticado y `JWT_SECRET`, no el identificador
directo. Permite relacionar esos eventos mientras se mantenga la clave; rotarla cambia las
referencias. Sigue siendo dato seudónimo sensible: restringir acceso y definir retención. No se
ha comprobado el acceso, la retención ni el contenido de logs de Render, Vercel, Supabase u otros
componentes de infraestructura.

## Incidente y rollback

Ante exposición de datos, inferencia sospechosa, acceso indebido o degradación, notificar al
responsable, poner `CHATBOT_ENABLED=false` en todas las instancias, reiniciarlas y verificar
404 externo y por instancia. Mantener `CHATBOT_DOWNLOADS_ENABLED=false`. Conservar evidencia
limitada y restringida sin copiar datos personales a canales de soporte; evaluar impacto y
obligaciones de notificación con el responsable jurídico.

Si la bandera no contiene el incidente o el despliegue es defectuoso, volver al último despliegue
conocido y revisado que incluya el bloqueo; una versión anterior a la bandera puede reactivar
el chatbot. Asegurar que variables, frontend, backend y rewrites corresponden a ese despliegue.
Si no puede garantizarse el bloqueo, deshabilitar temporalmente el servicio afectado. Verificar
de nuevo cada instancia, documentar la causa y no reactivar sin aprobación.

## Criterios para pasar a producción

Staging aislado y pruebas por rol aprobados; sin errores críticos, accesos indebidos ni
escrituras en consultas; p95, carga y costos aceptados; logs restringidos y revisados;
rollback ensayado; revisión de inferencia y legal documentada; responsable de monitoreo
asignado. El cumplimiento en producción sigue pendiente hasta ejecutar y registrar esas
verificaciones allí, de forma autorizada.
