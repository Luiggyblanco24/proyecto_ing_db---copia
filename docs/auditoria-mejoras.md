# SUTENS · Informe de correcciones

23 de noviembre de 2026. Cambios aplicados al proyecto local.

| Mejora | Implementación | Efecto |
|---|---|---|
| 1. Instalación sin credenciales compartidas | La semilla carga catálogos y galería. El operador promueve el radicado pendiente de un titular verificado mediante `database/primer-administrador.sql`. La operación es transaccional y registra la aprobación. | Cada instalación utiliza la contraseña personal del titular. La migración 023 desactiva la cuenta antigua que conserva el hash de muestra e invalida sus sesiones. |
| 2. Permisos del calendario | La consulta mantiene la asignación territorial para la lectura ordinaria y concede el cargo directivo únicamente mientras el afiliado esté activo. | La inactivación retira las facultades de gestión y exportación de asistentes, incluso si la asignación sigue registrada. |
| 3. Nombres en Secretarías | El encabezado recibe el nombre de la subdirectiva mediante `textContent`. | El navegador muestra literalmente los caracteres del nombre almacenado. |
| 4. Errores de la API | Los controladores de las rutas propagan los rechazos al manejador de Express. El manejador devuelve errores JSON y omite los detalles internos en la respuesta. | Un fallo de consulta queda limitado a la petición afectada. |
| 5. Cambio de contraseña | Mi cuenta incrementa la versión de autenticación y emite el nuevo token dentro de la misma transacción. El panel guarda ese token. | La sesión actual continúa y los tokens anteriores dejan de autorizar peticiones. |
| 6. Baja de afiliados | La eliminación parte de la persona y utiliza las relaciones de PostgreSQL. Las restricciones de auditoría y consentimiento siguen bloqueando las bajas que afectarían registros protegidos. | Una baja permitida libera cédula y correo para un nuevo registro. La operación devuelve un conflicto si hay registros de conservación obligatoria según el esquema. |
| 7. Padrón y exportación | La API evalúa todas las asignaciones habilitadas. Un cargo departamental autorizado concede alcance global. Para cargos locales se aplica el conjunto de subdirectivas autorizadas y el filtro solicitado. | El resultado deja de depender del orden de las filas que devuelve PostgreSQL. |
| 8. Cierre con contraseña temporal | El middleware permite cerrar la sesión también durante el cambio obligatorio de contraseña. | El servidor revoca el identificador de sesión al salir. |
| 9. Asistencia concurrente | La escritura de asistencia selecciona y bloquea el evento dentro de la misma sentencia, con comprobaciones de estado, eliminación y vencimiento. | Si una cancelación obtiene primero el bloqueo, la confirmación posterior recibe un conflicto. |
| 10. Noticias | Astro genera las cuatro páginas de detalle desde los textos, fechas e imágenes que ya tenía el proyecto. | Cada tarjeta abre su noticia y ofrece regreso al listado. |
| 11. Cifra de subdirectivas | Una consulta pública devuelve el total de subdirectivas registradas y excluye a la Directiva Departamental. | El indicador incluye subdirectivas con y sin integrantes publicados. Refleja el contenido de la base. |

## Aplicación en una base existente

El procedimiento está en el [README del proyecto](../README.md). La migración `database/migrations/023_retirar_credencial_demo.sql` afecta únicamente a la cuenta activa de muestra que conserva el hash original. Si era el único administrador activo, el operador debe tener identificado a su reemplazo y verificar su radicado antes de la ventana de mantenimiento. El script de alta requiere acceso administrativo directo a PostgreSQL.

Las bases desplegadas y los servicios externos requieren una operación de despliegue independiente. En instalaciones que ya acumulaban personas sin afiliación por bajas anteriores, conviene revisar esos expedientes individualmente antes de decidir su tratamiento.

## Resultados de la verificación local

- Pasaron las 38 pruebas de unidad e interfaz del chatbot. La prueba del widget utilizó el navegador instalado y comprobó las descargas habilitadas y deshabilitadas.
- El ejecutor de PostgreSQL 18 informó 9 pruebas aprobadas, contando la suite y sus subpruebas. Se usaron bases temporales, con 10.000 personas sintéticas en las pruebas de informes. Se verificaron el alta del primer administrador, el rechazo de una segunda alta, la migración de la credencial antigua, el reingreso tras una baja permitida y la conservación de un expediente protegido.
- Se comprobó el bloqueo entre una cancelación y una confirmación simultáneas, la denegación de una exportación al inactivar al dirigente y la recuperación de la API tras un fallo de consulta. También se verificaron las versiones de sesión antes y después de cambiar la contraseña y la revocación durante el cambio obligatorio.
- Astro compiló diez páginas. A 375 y 1440 píxeles se comprobó la apertura de las cuatro noticias, el regreso al listado, el nombre visible de la subdirectiva y la cifra territorial con una API simulada. El verificador de sintaxis de Node revisó 63 archivos JavaScript.
- La consulta de vulnerabilidades de npm quedó pendiente porque el registro no resolvió por DNS. La compatibilidad con el entorno desplegado de Render, Vercel y Supabase y la conversión con LibreOffice requieren verificación en el despliegue.
- La prueba de privacidad confirma que combinar informes exactos con filtros solapados puede revelar grupos pequeños por diferencia. Este riesgo documentado sigue vigente para los usuarios autorizados a consultar informes.
