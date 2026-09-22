# Verificación de EduControl v1.2.0

## Prueba automatizada integral

Ejecutada con:

`node integration-test-v1.2.js`

Resultado: 35 comprobaciones aprobadas.

Flujos verificados:

1. Migración a esquema 3 manteniendo `educontrol_v1`.
2. Roles docentes exclusivos: profesor o consejero.
3. Administrador corrige un estudiante y los demás perfiles reciben el cambio.
4. Profesor registra y finaliza asistencia.
5. Una actividad se crea una vez para 8.º A y 8.º B con seguimiento separado.
6. La entrega toma la clase real del horario.
7. Profesor califica y publica notas.
8. Acudiente ve actividad y nota.
9. El quinto compromiso diario queda bloqueado.
10. Duplicar crea borradores que no consumen cupo.
11. Profesor crea citación y acudiente responde.
12. Acudiente informa justificación formal.
13. Consejero valida la justificación de su salón.
14. Profesor ve la ausencia justificada y la respuesta de la citación.
15. Consejero registra un estudiante sin acudiente y sin duplicar perfiles.
16. Profesor agrega una hora y el acudiente la ve en el horario consolidado.
17. El detalle de horario muestra el estado de asistencia.
18. Los datos permanecen serializados en localStorage.

## Validaciones de datos iniciales

- 96 estudiantes.
- 15 docentes.
- 8 consejeros, cada uno asociado a un solo salón.
- 300 actividades.
- Todas las materias tienen horas en el horario.
- Cero conflictos ficticios de salón o profesor.
- Máximo seis clases diarias por profesor.
- Máximo tres entregas iniciales por salón/día, para dejar cupo de prueba.
- Nombres y género ficticio coherentes.

## Verificaciones técnicas

- `node --check app.js`: aprobado.
- `node --check data.js`: aprobado.
- Clave de almacenamiento: `educontrol_v1`.
- Versión: `1.2.0`.
- Esquema: `3`.
- Los recursos del service worker usan caché `educontrol-shell-v1.2.0`.

La descarga de un navegador automatizado quedó bloqueada por la red del entorno de construcción. La validación móvil se realizó mediante reglas responsive, ausencia de anchos fijos en los nuevos componentes y ejecución funcional simulada con viewport lógico. Conviene confirmar visualmente en el Android real después de publicar.

