# Verificación de EduControl v1.3.0

## Prueba automatizada integral desde cero

Ejecutada con:

`node integration-test-v1.3.js`

Resultado: **44 comprobaciones aprobadas**.

Flujo verificado:

1. Primer inicio con elección entre estructura vacía y datos de demostración.
2. Configuración del colegio y turno por el administrador.
3. Registro exclusivo de una profesora consejera con fotografía obligatoria.
4. Creación de su único salón, aula, turno y bachillerato nuevo.
5. Registro de estudiante sin control de fotografía para el docente.
6. Docencia de la consejera desde la misma cuenta.
7. Registro exclusivo de profesor con una materia que no existía.
8. Creación de horario seleccionando espacios de 45 minutos.
9. Cálculo automático de 07:00–07:45 para el espacio 1.
10. Cambio de lugar para una fecha sin alterar el aula habitual.
11. Actividad en casa conectada a la hora real de clase.
12. Registro de acudiente con fotografía.
13. Vinculación por nombre, grado y cédula.
14. Fotografía del estudiante agregada exclusivamente por su acudiente.
15. Horario del acudiente formado con la información subida por docentes.
16. Aviso anticipado de ausencia del estudiante.
17. Aviso de ausencia docente y validación administrativa.
18. Reprogramación automática de la actividad a la siguiente clase disponible.
19. Conservación de penalización y días de atraso en cero.
20. Creación de alternativa para adelantar una clase con otro profesor libre.
21. Aceptación del adelanto y registro conectado en `scheduleMoves`.
22. Persistencia completa tras volver a cargar los datos.
23. Migración de esquema 3 a 4 manteniendo institución y registros.

## Regresión de los procesos académicos anteriores

Ejecutada con:

`node regression-test-v1.3.js`

Resultado: **35 comprobaciones adicionales aprobadas**. Se volvieron a verificar sobre los datos de demostración:

- asistencia y cierre automático de ausentes;
- actividad para varios salones del mismo grado;
- máximo de cuatro compromisos diarios;
- calificación en borrador y publicación conjunta;
- nota visible para el acudiente;
- citación y respuesta del acudiente;
- justificación pendiente y validación del consejero;
- actualización visible para el profesor;
- creación de estudiante por el consejero;
- horario consolidado y detalle de asistencia;
- migración y persistencia.

Total de esta entrega: **79 comprobaciones funcionales aprobadas**.

Resultado concreto de la prueba de reprogramación:

- Fecha original: 28 de septiembre de 2026.
- Nueva fecha: 5 de octubre de 2026.
- Razón visible: ausencia docente.
- Penalización: 0.

## Verificaciones técnicas

- `node --check data.js`: aprobado.
- `node --check app.js`: aprobado.
- `node --check sw.js`: aprobado.
- Clave de almacenamiento: `educontrol_v1`.
- Versión: `1.3.0`.
- Esquema: `4`.
- Caché PWA: `educontrol-shell-v1.3.0`.

## Comprobaciones visuales

- Vista móvil Android: navegación, formularios, botones de tamaño táctil y horario semanal con desplazamiento horizontal.
- Vista de computadora: menú lateral, tarjetas, formularios y cinco columnas del horario.
- Ninguna tabla obliga a ampliar toda la página en móvil; se desplaza dentro de su contenedor.
- Las cápsulas de resumen, materias y horario son botones que abren una vista o detalle real.

## Prueba manual recomendada después de publicar

1. Abrir la URL de GitHub Pages en una pestaña privada.
2. Elegir **Configurar colegio desde cero**.
3. Seguir el flujo descrito en la pantalla.
4. Cerrar y volver a abrir el navegador.
5. Confirmar que el colegio, perfiles y horarios siguen allí.
6. Instalar la PWA desde Chrome en Android.
