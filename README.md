# EduControl v1.4.0

PWA escolar funcional para GitHub Pages. Funciona con HTML, CSS y JavaScript y conserva los datos en `localStorage` con la clave fija `educontrol_v1`.

## Abrir la aplicación

Publique todos los archivos en la raíz del repositorio y abra:

`https://<usuario>.github.io/educontrol/`

Para probar localmente use un servidor HTTP. Abrir `index.html` directamente permite ver parte de la aplicación, pero la instalación PWA, la caché sin conexión y el service worker requieren HTTPS o `localhost`.

## Primer inicio

EduControl permite elegir de forma explícita:

- **Configurar colegio desde cero:** inicia sin profesores, salones, estudiantes, materias, horarios ni actividades.
- **Usar datos de demostración:** carga una institución ficticia abundante para recorrer los módulos.

La actualización no borra ni reemplaza datos existentes. Desde Configuración se puede iniciar voluntariamente una estructura vacía o restablecer la demostración, siempre con confirmación.

## Flujo de creación

1. El administrador configura nombre, lema, logo, año, trimestre, colores, turnos y espacios de 45 minutos.
2. El profesor consejero crea su perfil exclusivo, su materia y un solo salón de consejería.
3. El consejero define grado, sección, nivel, turno, aula y bachillerato/programa; luego registra estudiantes.
4. El profesor crea su perfil y puede escribir una materia que todavía no exista.
5. El profesor elige una jornada, ve la cuadrícula institucional, selecciona uno o dos espacios disponibles y luego indica el grado y salón.
6. El acudiente crea su perfil, vincula al estudiante por nombre, grado y cédula y es el único que puede administrar la fotografía del estudiante.

Una cuenta docente entra como profesor o como consejero, nunca por los dos accesos. El consejero también enseña desde esa misma cuenta.

## Horarios y lugares

- Semana de lunes a viernes, un día por columna.
- La semana actual abre en el día de hoy; los días pasados quedan a la izquierda y los próximos a la derecha.
- Incluye botones para semana anterior, esta semana y semana siguiente.
- Marca la clase que está ocurriendo en el momento real.
- Cada bloque muestra materia, profesor, salón, hora, lugar, asistencia y actividades programadas.
- La misma cuadrícula se usa en los perfiles de profesor, consejero, acudiente y administrador.
- Materias del acudiente incluye el horario completo y, al abrir una materia, su horario filtrado.
- El lugar habitual es opcional; si queda vacío se usa el aula de consejería.
- El profesor puede cambiar el lugar solo para una fecha o convertirlo en lugar habitual.
- En un bloque doble puede cambiar el lugar de ambos espacios o de cada mitad.
- Los espacios ocupados por el profesor o el salón permanecen visibles, pero no se pueden seleccionar. Los posibles cruces de lugar se notifican a la administración.

## Actividades

El profesor elige materia, grado, semana y secciones. EduControl muestra las clases reales de cada salón y toma automáticamente la hora de entrega.

- En clase o en casa.
- Borrador, publicación programada o publicación inmediata.
- El contenido se escribe una vez y crea seguimiento separado por salón y estudiante.
- Máximo cuatro entregas por salón y día; los días completos quedan deshabilitados.
- Las materias y actividades pueden borrarse o anularse según conserven historial.
- Si el profesor falta el día de entrega, la actividad pasa a la siguiente clase de la materia que tenga cupo, sin atraso ni penalización.

La publicación programada se procesa al volver a abrir la PWA. GitHub Pages no garantiza ejecución o notificaciones push en segundo plano.

## Ausencias

- El acudiente puede avisar una ausencia futura o del mismo día y señalar que llevará documento físico.
- El aviso previo no justifica automáticamente; el consejero valida la documentación.
- El profesor informa su ausencia con motivo interno y mensaje general para familias.
- La administración valida la ausencia docente.
- Otros profesores libres pueden aceptar adelantar una clase; la fecha queda reflejada en el horario familiar sin modificar el horario recurrente.

## Persistencia y migración

- Clave estable: `educontrol_v1`.
- Esquema actual: 4.
- Las actualizaciones conservan turnos, programas, lugares, espacios, cambios de aula, avisos y ausencias sin borrar los registros existentes.
- Antes de acciones de reinicio se mantiene disponible la descarga de respaldo JSON.

## Archivos principales

- `index.html`: entrada de la aplicación.
- `styles.css`: diseño responsive para Android y computadora.
- `data.js`: datos iniciales, persistencia y migraciones.
- `app.js`: navegación y lógica funcional.
- `manifest.webmanifest`: instalación PWA.
- `sw.js`: caché offline.
- `icon-192.png` y `icon-512.png`: iconos PWA.
