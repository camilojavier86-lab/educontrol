# EduControl v1.2.0

PWA escolar funcional para GitHub Pages. Funciona con HTML, CSS y JavaScript, conserva los datos en `localStorage` con la clave fija `educontrol_v1` y migra automáticamente los datos creados con v1.1.

## Abrir la aplicación

Publique todos los archivos en la raíz del repositorio de GitHub Pages y abra:

`https://<usuario>.github.io/educontrol/`

Para una prueba local completa use un servidor HTTP. Abrir `index.html` directamente permite ver gran parte de la aplicación, pero la instalación PWA y el service worker requieren HTTPS o `localhost`.

## Flujo de usuarios v1.2

- Administrador: configura la institución, supervisa, corrige, audita y usa “Ver como”. No crea perfiles, estudiantes ni salones.
- Profesor: crea su propio perfil con fotografía y una función exclusiva de profesor. Registra su materia en salones existentes al montar su horario.
- Profesor consejero: crea su propio perfil, conserva todas las funciones docentes y crea un único salón de consejería por año lectivo.
- Acudiente: crea su perfil con fotografía y vincula estudiantes previamente registrados mediante nombre, grado y cédula.

Una cuenta docente entra como profesor o como consejero, nunca por ambos accesos. El consejero enseña su materia desde la misma cuenta.

## Planificación de actividades

El docente selecciona materia, grado, semana y secciones. EduControl presenta únicamente los salones donde ese docente imparte la materia y calcula la fecha/hora de entrega desde su horario.

- Lugar: en clase o en casa.
- Estados: borrador, programada y publicada.
- Las programadas se activan cuando la PWA vuelve a abrirse después de la fecha indicada.
- El contenido se escribe una vez, pero las entregas y notas permanecen separadas por salón y estudiante.
- Máximo cuatro actividades entregables por salón y día.
- Los borradores no ocupan cupo.
- Una actividad puede duplicarse como borrador.

GitHub Pages no garantiza tareas de servidor ni push en segundo plano; la publicación programada se evalúa al abrir la PWA.

## Persistencia

- Clave estable: `educontrol_v1`.
- Esquema actual: 3.
- La migración agrega roles exclusivos, campos de planificación y referencias del consejero sin borrar datos existentes.
- “Restablecer datos de demostración” es la única acción que reemplaza voluntariamente el contenido local por los datos ficticios iniciales.

## Datos de demostración

Incluye 96 estudiantes, 15 docentes, 8 consejeros, 8 salones, 300 actividades, horarios completos sin conflictos ficticios, notas, asistencias, justificaciones, grupos, prórrogas, observaciones, citaciones, autorizaciones e invitaciones.

## Archivos principales

- `index.html`: entrada de la aplicación.
- `styles.css`: diseño responsive.
- `data.js`: datos iniciales, persistencia y migraciones.
- `app.js`: navegación y lógica funcional.
- `manifest.webmanifest`: configuración PWA.
- `sw.js`: caché para funcionamiento instalable/offline.
- `icon-192.png` y `icon-512.png`: iconos PWA.

