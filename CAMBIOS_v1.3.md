# Cambios de EduControl v1.3.0

## Configuración desde cero

- Nuevo primer inicio para elegir estructura vacía o demostración.
- La actualización conserva `educontrol_v1`; nunca restablece datos automáticamente.
- El administrador configura colegio, año, trimestre, colores, logo y turnos.
- Los turnos generan espacios de 45 minutos y recreos automáticamente.

## Perfiles y creación académica

- Profesor y consejero son cuentas exclusivas; el consejero enseña desde su misma cuenta.
- Fotografías obligatorias para los perfiles adultos, con botones separados para cámara y galería.
- El consejero crea un solo salón con nivel, grado, sección, turno, aula y bachillerato/programa.
- El profesor puede escribir una materia nueva; pasa al catálogo reutilizable del colegio.
- Solo el acudiente principal puede agregar, cambiar o eliminar la fotografía del estudiante.

## Horarios

- Selección por espacio 1, 2, 3, etc., sin escribir horas manualmente.
- Bloques de uno o dos espacios consecutivos.
- Vista semanal de lunes a viernes con hora y clase actual.
- Lugar habitual opcional y cambio de aula para una fecha específica.
- Soporte de lugares distintos para las dos mitades de un bloque doble.
- Actividades y asistencia accesibles desde cada bloque del horario del acudiente.

## Actividades y carga diaria

- Planificación por materia, grado, semana y varios salones del mismo grado.
- Entrega automática durante una clase real de cada salón.
- Límite de cuatro entregas por salón y día; opciones completas quedan deshabilitadas.
- Lugar de realización en clase o en casa.
- Borradores, publicación inmediata y publicación programada.

## Ausencias y reorganización

- El acudiente puede avisar una ausencia futura o del mismo día.
- El aviso no justifica automáticamente; el consejero mantiene la validación del documento físico.
- El profesor informa su ausencia y la administración la valida.
- Actividades previstas para una clase cancelada pasan a la siguiente clase disponible, sin atraso ni penalización.
- Otros profesores libres reciben propuestas para adelantar una clase.
- Los adelantos aceptados aparecen en el horario familiar sin modificar el horario semanal habitual.

## Persistencia

- Versión de aplicación: 1.3.0.
- Esquema de datos: 4.
- Clave: `educontrol_v1`.
- Migración automática desde v1.2, conservando perfiles y registros.
