# Verificación de EduControl v1.1

Fecha de verificación: 22 de septiembre de 2026.

## Resultado

La prueba automatizada de integración terminó correctamente con 29 comprobaciones. Cubre el flujo compartido entre perfiles, la migración y los nuevos flujos de horario e invitaciones.

Flujo comprobado sobre un único registro persistente:

1. Administrador inicia la aplicación.
2. Administrador crea un estudiante vinculado a Mariela Soto.
3. Administrador entra como Andrés Villalobos.
4. Profesor registra presencia y finaliza la clase; los no marcados pasan a ausente.
5. Profesor crea una actividad.
6. Profesor guarda calificaciones como borrador.
7. Profesor publica la evaluación completa.
8. Profesor crea una citación.
9. Administrador entra como Mariela Soto.
10. Acudiente ve el estudiante creado, la actividad, la nota y la ausencia.
11. Acudiente informa que entregará justificación formal.
12. Acudiente responde que asistirá a la citación.
13. Administrador entra como Carolina Ríos.
14. Consejera ve y valida el documento pendiente.
15. Administrador vuelve a entrar como Andrés Villalobos.
16. Profesor ve la ausencia como justificada.
17. Profesor ve la respuesta de la citación.
18. Se vuelve a leer `educontrol_v1` y los cambios permanecen.
19. Un consejero sin salón crea un aula desde cero.
20. El nuevo salón queda asignado al consejero.
21. Carolina Ríos prepara las invitaciones de 8.º A.
22. La invitación de Mariela Soto queda persistida.
23. Andrés Villalobos agrega una nueva hora de Matemática para 8.º A.
24. La hora queda guardada en el horario compartido.
25. Mariela Soto ve esa hora en el horario consolidado de Valentina.
26. El bloque del horario abre directamente Matemática.
27. El profesor elimina el bloque y queda inactivo sin borrar historial académico.
28. Una estructura de datos v1 migra automáticamente al esquema 2.
29. La migración conserva el nombre institucional y agrega las nuevas colecciones.

## Revisiones adicionales de v1.1

- `data.js` y `app.js` pasan `node --check`.
- `manifest.webmanifest` contiene JSON válido y rutas relativas compatibles con un subdirectorio de GitHub Pages.
- Todos los recursos principales responden por servidor HTTP estático.
- Los iconos PNG miden 192×192 y 512×512.
- El CSS incluye adaptaciones específicas a 1120, 820 y 580 píxeles.
- Se conserva la clave fija `educontrol_v1` y el esquema anterior migra sin reiniciar datos.
- Los profesores pueden agregar, editar, duplicar y eliminar horas de sus asignaciones.
- Los acudientes reciben el horario consolidado a partir de los bloques registrados por profesores.
- El consejero puede crear su salón y preparar invitaciones por WhatsApp o correo.
- Las fotografías se reducen antes de guardarse para disminuir el consumo de almacenamiento.
- Los botones con `data-action` tienen controlador funcional; la importación se procesa mediante el evento de archivo.

El entorno de ejecución no pudo descargar un motor Chromium para producir una captura automatizada final; la verificación funcional se realizó ejecutando los mismos controladores de clic, formulario, cambio de perfil y persistencia usados por la aplicación.
