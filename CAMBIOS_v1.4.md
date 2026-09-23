# Cambios de EduControl v1.4.0

## Horario semanal unificado

- Todos los perfiles consultan los horarios con lunes a viernes en columnas.
- Cada columna conserva los espacios de 45 minutos y los recreos en su posición real.
- La semana actual se desplaza automáticamente hasta el día de hoy en teléfonos.
- Los días pasados quedan a la izquierda y los próximos a la derecha.
- Se agregaron controles para semana anterior, esta semana y semana siguiente.
- En semanas diferentes a la actual, la vista comienza en lunes.
- El profesor consejero puede alternar entre sus propias clases y el horario completo de su salón.

## Materias del acudiente

- La pantalla principal de Materias incluye el horario semanal por columnas.
- Cada bloque abre asistencia, aula y actividades de esa clase.
- Al entrar en una materia aparece el mismo horario filtrado a esa materia.
- La asistencia conserva sus estados: presente, tardanza, retiro, ausencia, justificación pendiente o validada.

## Creación del horario docente

- El profesor selecciona la jornada configurada por el colegio.
- La disponibilidad se muestra en una cuadrícula de lunes a viernes.
- Los espacios ocupados por el profesor o por el salón permanecen visibles y desactivados.
- Se pueden seleccionar uno o dos espacios consecutivos sin escribir horas.
- Después se conecta el espacio con el grado y salón existente.
- Los bloques no pueden atravesar un recreo.
- Un posible cruce del lugar físico se guarda con aviso para la administración; nunca duplica al profesor o al salón.

## Persistencia

- Clave local conservada: `educontrol_v1`.
- Esquema conservado: 4.
- La actualización no restablece ni reemplaza los datos creados por el usuario.
- Caché PWA actualizada a `educontrol-shell-v1.4.0`.
