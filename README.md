# EduControl v1.1

Prototipo funcional avanzado para GitHub Pages. No requiere servidor, compilación ni dependencias externas.

## Abrir la aplicación

La forma recomendada es publicarla en GitHub Pages siguiendo `GUIA_PUBLICACION.md`. También puede servirse con cualquier servidor web estático.

## Persistencia

- Datos principales: `localStorage` con la clave fija `educontrol_v1`.
- Sesión de prueba: `sessionStorage` con la clave `educontrol_session_v1`.
- Los datos ficticios solo se crean cuando `educontrol_v1` no existe.
- Las futuras versiones deben migrar la estructura sin cambiar la clave ni reiniciar los datos.
- El restablecimiento solo ocurre al usar Administrador → Configuración → Restablecer datos de demostración.

## Contenido inicial

- 4 perfiles funcionales.
- 8 salones.
- 96 estudiantes.
- 48 acudientes.
- 12 profesores, incluyendo 8 consejeros.
- 100 asignaciones de materia.
- 320 bloques de horario.
- 300 actividades con entregas y calificaciones.
- 480 registros de asistencia.
- Citaciones, autorizaciones, observaciones, grupos, prórrogas, justificaciones, notificaciones y auditoría.

## Cambios principales de v1.1

- Horario colaborativo: cada profesor registra cada hora de su materia y salón.
- Panel docente en tiempo real con clase actual, próxima clase y acceso directo a asistencia.
- Horario consolidado del estudiante para el acudiente, con materias navegables.
- Creación del salón desde cero por el profesor consejero.
- Invitaciones de acudientes por WhatsApp, correo o enlace copiable, con estados de seguimiento.
- Fotografías optimizadas para profesores, acudientes, estudiantes y salones.
- Formularios guiados, cápsulas navegables y tablas convertidas en tarjetas en móvil.
- Eliminación o anulación auditada de los principales registros creados.
- Migración automática del esquema 1 al esquema 2 sin cambiar `educontrol_v1`.

## Archivos de la aplicación

- `index.html`: entrada de GitHub Pages.
- `styles.css`: diseño responsive para computadora y teléfono.
- `data.js`: datos ficticios, migraciones y persistencia.
- `app.js`: interfaz y flujos funcionales.
- `manifest.webmanifest`: configuración PWA.
- `sw.js`: funcionamiento sin conexión después de la primera carga.
- `icon-192.png` y `icon-512.png`: iconos PWA.

## Límite deliberado de esta etapa

Los datos viven solamente en el navegador y dispositivo donde se usan. WhatsApp y correo preparan invitaciones reales, pero no sincronizan datos entre dispositivos. No hay autenticación compartida ni notificaciones push garantizadas. Una etapa comercial debe migrar el almacenamiento a un servicio seguro con control de acceso.
