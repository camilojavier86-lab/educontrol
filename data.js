/* EduControl v1.1 - datos, persistencia y migraciones.
   La clave educontrol_v1 es deliberadamente estable para futuras actualizaciones. */
(function () {
  "use strict";

  const STORAGE_KEY = "educontrol_v1";
  const SESSION_KEY = "educontrol_session_v1";
  const APP_VERSION = "1.1.0";
  const SCHEMA_VERSION = 2;
  const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const COLORS = ["#2b73c2", "#0f9b8e", "#9a5fb4", "#d97936", "#5468b1", "#2f8b63", "#ba4b62", "#557986", "#8c6b34", "#45829d", "#7a5ab5", "#aa5d29", "#287e72"];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = () => new Date().toISOString();
  const dateIso = (offsetDays = 0) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  };
  const oneDecimal = (value) => Math.round((Number(value) + Number.EPSILON) * 10) / 10;
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const SUBJECT_DEFINITIONS = [
    ["Matemática", "t-andres"], ["Español", "t-carolina"], ["Ciencias", "t-daniel"],
    ["Inglés", "t-lucia"], ["Historia", "t-marcos"], ["Geografía", "t-marcos"],
    ["Educación Física", "t-emilio"], ["Arte", "t-isabel"], ["Tecnología", "t-natalia"],
    ["Orientación", "t-carolina"], ["Formación Cívica", "t-ricardo"], ["Física", "t-andres"],
    ["Química", "t-sofia"]
  ];

  function createTeachers() {
    return [
      ["t-andres", "Andrés Villalobos", "Matemática y Física", "avillalobos@horizonte.edu.pa", "6671-2048"],
      ["t-carolina", "Carolina Ríos", "Español y Orientación", "crios@horizonte.edu.pa", "6614-8920", "c-8a"],
      ["t-daniel", "Daniel Paredes", "Ciencias", "dparedes@horizonte.edu.pa", "6998-1003", "c-5b"],
      ["t-lucia", "Lucía Fernández", "Inglés", "lfernandez@horizonte.edu.pa", "6302-1145", "c-8b"],
      ["t-marcos", "Marcos Chen", "Historia y Geografía", "mchen@horizonte.edu.pa", "6508-3319", "c-11a"],
      ["t-sofia", "Sofía Batista", "Química", "sbatista@horizonte.edu.pa", "6435-7771", "c-10b"],
      ["t-emilio", "Emilio Guerra", "Educación Física", "eguerra@horizonte.edu.pa", "6201-8855"],
      ["t-natalia", "Natalia De León", "Tecnología", "ndeleon@horizonte.edu.pa", "6122-9204"],
      ["t-isabel", "Isabel Cedeño", "Arte", "icedeno@horizonte.edu.pa", "6764-2107", "c-6a"],
      ["t-ricardo", "Ricardo Ávila", "Formación Cívica", "ravila@horizonte.edu.pa", "6921-1140", "c-7c"],
      ["t-ana", "Ana Belén Ortega", "Biología", "aortega@horizonte.edu.pa", "6812-6640", "c-9a"],
      ["t-carlos", "Carlos Méndez", "Informática", "cmendez@horizonte.edu.pa", "6710-5321"]
    ].map(([id, name, specialty, email, phone, counselorClassId]) => ({
      id, name, specialty, email, phone, counselorClassId: counselorClassId || null, photo: "", active: true, createdAt: dateIso(-180)
    }));
  }

  function createClasses() {
    return [
      ["c-5b", "5.º", "B", "Primaria", "Matutino", "t-daniel"],
      ["c-6a", "6.º", "A", "Primaria", "Matutino", "t-isabel"],
      ["c-7c", "7.º", "C", "Premedia", "Matutino", "t-ricardo"],
      ["c-8a", "8.º", "A", "Premedia", "Matutino", "t-carolina"],
      ["c-8b", "8.º", "B", "Premedia", "Matutino", "t-lucia"],
      ["c-9a", "9.º", "A", "Premedia", "Matutino", "t-ana"],
      ["c-10b", "10.º", "B", "Media", "Vespertino", "t-sofia"],
      ["c-11a", "11.º", "A", "Media", "Matutino", "t-marcos"]
    ].map(([id, grade, section, level, shift, counselorId]) => ({ id, grade, section, level, shift, counselorId, room: `Aula ${grade.replace(".º", "")}${section}`, image: "", active: true }));
  }

  const guardianNames = [
    "Mariela Soto", "Jorge Castillo", "Paola Núñez", "Roberto Gómez", "Mónica Herrera", "Elisabeth Wong",
    "Ramón Martínez", "Verónica Quintero", "Luis Aguilar", "Marta González", "Edgar Batista", "Rosa Pitti",
    "Héctor Rangel", "Yadira Moreno", "Samuel Acosta", "Diana Espinosa", "Carlos Jaén", "Laura Córdoba",
    "Iván Rodríguez", "Karina Tejada", "Omar Salazar", "Patricia Barría", "José Peralta", "Norma Alvarado",
    "Víctor González", "Elena Carrizo", "Alberto Díaz", "Gabriela Solís", "Manuel Ortega", "Carmen Guerra",
    "René Santamaría", "Silvia Fábrega", "Gustavo Sáez", "Nadia Franco", "Javier Arias", "Lorena Ureña",
    "Tomás Cedeño", "Rebeca Delgado", "Raúl Mojica", "Fabiola Peña", "Miguel Arrocha", "Teresa Villarreal",
    "Orlando Barrios", "Claudia Navarro", "Federico Samaniego", "Ángela Valdés", "Mario Ríos", "Noelia Serrano"
  ];

  function createGuardians() {
    return guardianNames.map((name, index) => {
      const slug = normalize(name).slice(0, 12);
      const phone = `6${String(1000000 + ((index + 17) * 73421) % 8999999).slice(0, 7)}`;
      return {
        id: index === 0 ? "g-mariela" : `g-${slug}-${index}`,
        name,
        email: `${slug}@correo.demo`,
        phone,
        whatsapp: phone,
        relationship: index % 3 === 0 ? "Madre" : index % 3 === 1 ? "Padre" : "Acudiente",
        birthDate: `${1972 + (index % 20)}-${String((index % 12) + 1).padStart(2, "0")}-15`,
        residence: index % 2 ? "Ciudad de Panamá" : "San Miguelito",
        photo: "",
        privacy: {
          phone: { published: false, audience: "Colegio solamente" },
          whatsapp: { published: true, audience: "Profesores autorizados" },
          email: { published: false, audience: "Nadie" },
          residence: { published: false, audience: "Nadie" }
        },
        active: true
      };
    });
  }

  const firstNames = ["Gabriel", "Samara", "Diego", "Lía", "Ethan", "Ana Lucía", "Nicolás", "Elena", "Adrián", "Alondra", "Bruno", "Camila", "Sebastián", "Isabella", "Thiago", "Victoria", "Santiago", "Emma", "Lucas", "Mía", "Martín", "Antonella", "Joaquín", "Amanda", "David", "Julieta", "Ángel", "Renata", "Kevin", "Sara", "Alejandro", "Mariana"];
  const lastNamesA = ["Castillo", "Núñez", "Gómez", "Herrera", "Wong", "Martínez", "Quintero", "Aguilar", "González", "Batista", "Pitti", "Rangel", "Moreno", "Acosta", "Espinosa", "Jaén"];
  const lastNamesB = ["Ruiz", "Pérez", "Jaén", "Vega", "Díaz", "López", "Santos", "Rojas", "Cano", "Mora", "León", "Reyes", "Gil", "Cruz", "Arias", "Peña"];

  function createStudents(classes, guardians) {
    const special = [
      { id: "s-valentina", name: "Valentina Méndez Soto", gender: "F", idNumber: "8-1024-310", birthDate: "2012-04-19", classId: "c-8a", guardianId: "g-mariela" },
      { id: "s-mateo", name: "Mateo Soto Méndez", gender: "M", idNumber: "8-1098-411", birthDate: "2015-09-08", classId: "c-5b", guardianId: "g-mariela" },
      { id: "s-daniela", name: "Daniela Salas Soto", gender: "F", idNumber: "8-995-208", birthDate: "2009-02-12", classId: "c-11a", guardianId: "g-mariela" }
    ].map((item) => ({ ...item, idType: "Cédula", photo: "", active: true }));
    const students = [...special];
    let sequence = 0;
    classes.forEach((schoolClass, classIndex) => {
      const already = students.filter((student) => student.classId === schoolClass.id).length;
      for (let seat = already; seat < 12; seat += 1) {
        const first = firstNames[(sequence + classIndex * 3) % firstNames.length];
        const lastA = lastNamesA[(sequence + classIndex) % lastNamesA.length];
        const lastB = lastNamesB[(sequence * 3 + classIndex) % lastNamesB.length];
        const name = `${first} ${lastA} ${lastB}`;
        const guardianIndex = 1 + (sequence % (guardians.length - 1));
        students.push({
          id: `s-${schoolClass.id.slice(2)}-${String(seat + 1).padStart(2, "0")}`,
          name,
          gender: sequence % 2 ? "F" : "M",
          idType: sequence % 19 === 0 ? "Pasaporte" : "Cédula",
          idNumber: sequence % 19 === 0 ? `PA-${284900 + sequence}` : `8-${1000 + classIndex * 10 + seat}-${String(120 + sequence).padStart(3, "0")}`,
          birthDate: `${2015 - classIndex}-${String((seat % 12) + 1).padStart(2, "0")}-${String((seat * 2) % 27 + 1).padStart(2, "0")}`,
          classId: schoolClass.id,
          guardianId: guardians[guardianIndex].id,
          photo: "",
          active: true
        });
        sequence += 1;
      }
    });
    return students;
  }

  function createAssignments(classes) {
    const assignments = [];
    classes.forEach((schoolClass, classIndex) => {
      const subjectCount = schoolClass.level === "Primaria" ? 11 : 13;
      SUBJECT_DEFINITIONS.slice(0, subjectCount).forEach(([name, teacherId], subjectIndex) => {
        assignments.push({
          id: `as-${schoolClass.id.slice(2)}-${normalize(name).slice(0, 9)}`,
          catalogId: `cat-${normalize(name)}`,
          name,
          classId: schoolClass.id,
          teacherId,
          color: COLORS[(subjectIndex + classIndex) % COLORS.length],
          attendanceWeight: 5,
          exemptionEnabled: !["Educación Física", "Arte", "Orientación"].includes(name),
          exemptionAverage: 4.5,
          latePenalty: 0.5,
          trimester: 2,
          active: true
        });
      });
    });
    return assignments;
  }

  function createSchedule(classes, assignments) {
    const schedule = [];
    const morning = [["07:00", "07:45"], ["07:45", "08:30"], ["08:30", "09:15"], ["09:35", "10:20"], ["10:20", "11:05"], ["11:05", "11:50"], ["11:50", "12:35"]];
    const afternoon = [["12:45", "13:30"], ["13:30", "14:15"], ["14:15", "15:00"], ["15:20", "16:05"], ["16:05", "16:50"], ["16:50", "17:35"], ["17:35", "18:20"]];
    classes.forEach((schoolClass, classIndex) => {
      const classAssignments = assignments.filter((item) => item.classId === schoolClass.id);
      const periods = schoolClass.shift === "Vespertino" ? afternoon : morning;
      DAYS.forEach((day, dayIndex) => {
        periods.forEach(([start, end], periodIndex) => {
          const assignment = classAssignments[(dayIndex * 3 + periodIndex + classIndex) % classAssignments.length];
          schedule.push({
            id: `sch-${classIndex}-${dayIndex}-${periodIndex}`,
            classId: schoolClass.id,
            assignmentId: assignment.id,
            teacherId: assignment.teacherId,
            day, start, end, room: schoolClass.room, kind: "CLASS", active: true
          });
          if (periodIndex === 2) {
            schedule.push({
              id: `sch-break-${classIndex}-${dayIndex}`,
              classId: schoolClass.id,
              assignmentId: null,
              teacherId: null,
              day,
              start: schoolClass.shift === "Vespertino" ? "15:00" : "09:15",
              end: schoolClass.shift === "Vespertino" ? "15:20" : "09:35",
              room: "Área común", kind: "BREAK", active: true
            });
          }
        });
      });
    });
    return schedule;
  }

  function gradeFor(studentIndex, activityIndex) {
    const raw = 3.2 + ((studentIndex * 7 + activityIndex * 11) % 18) / 10;
    return Math.min(5, oneDecimal(raw));
  }

  function createActivities(classes, assignments, students) {
    const activities = [];
    assignments.forEach((assignment, assignmentIndex) => {
      const classStudents = students.filter((student) => student.classId === assignment.classId);
      const templates = [
        { suffix: "Práctica aplicada", type: "Ejercicio", weight: 10, offset: -18, published: true, group: false },
        { suffix: "Proyecto del trimestre", type: "Proyecto", weight: 15, offset: -4, published: assignmentIndex % 3 !== 1, group: assignmentIndex % 4 === 0 },
        { suffix: "Examen final", type: "Examen final", weight: 25, offset: 28, published: false, group: false }
      ];
      templates.forEach((template, activityIndex) => {
        const activityId = `act-${assignment.id.slice(3)}-${activityIndex + 1}`;
        const grades = classStudents.map((student, studentIndex) => {
          const grade = gradeFor(studentIndex, assignmentIndex + activityIndex);
          const lateDays = activityIndex === 1 && studentIndex % 9 === 0 ? 1 : 0;
          const penalty = lateDays * assignment.latePenalty;
          return {
            studentId: student.id,
            delivery: activityIndex === 2 ? "PENDING" : studentIndex % 13 === 0 && activityIndex === 1 ? "NOT_DELIVERED" : "RECEIVED",
            originalGrade: activityIndex === 2 ? null : grade,
            lateDays,
            penalty,
            finalGrade: activityIndex === 2 ? null : Math.max(1, oneDecimal(grade - penalty)),
            receivedAt: activityIndex === 2 ? null : `${dateIso(template.offset - 1)}T15:10:00.000Z`
          };
        });
        activities.push({
          id: activityId,
          assignmentId: assignment.id,
          classId: assignment.classId,
          name: `${template.suffix} · ${assignment.name}`,
          type: template.type,
          description: activityIndex === 2 ? "Evaluación final obligatoria del trimestre." : "Actividad de aplicación y seguimiento académico.",
          weight: template.weight,
          dueDate: dateIso(template.offset),
          maxDate: dateIso(template.offset + 5),
          isGroup: template.group,
          latePolicy: "Penalización por cada día de clase de atraso.",
          latePenalty: assignment.latePenalty,
          maxExtensionDays: 3,
          status: template.published ? "PUBLISHED" : "DRAFT",
          createdAt: `${dateIso(template.offset - 12)}T14:00:00.000Z`,
          publishedAt: template.published ? `${dateIso(template.offset + 2)}T18:00:00.000Z` : null,
          grades
        });
      });
    });
    return activities;
  }

  function createAttendance(classes, assignments, students) {
    const attendance = [];
    [-4, -3, -2, -1, 0].forEach((offset, dateIndex) => {
      classes.forEach((schoolClass, classIndex) => {
        const assignment = assignments.filter((item) => item.classId === schoolClass.id)[(dateIndex + classIndex) % 5];
        students.filter((student) => student.classId === schoolClass.id).forEach((student, studentIndex) => {
          let status = "PRESENT";
          if ((studentIndex + dateIndex + classIndex) % 17 === 0) status = "LATE";
          if ((studentIndex * 3 + dateIndex + classIndex) % 29 === 0) status = "ABSENT";
          if (student.id === "s-valentina" && offset === -2) status = "ABSENT";
          attendance.push({
            id: `att-${assignment.id}-${offset}-${student.id}`,
            date: dateIso(offset), classId: schoolClass.id, assignmentId: assignment.id, studentId: student.id,
            status, time: status === "LATE" ? "07:18" : null, justificationPending: false,
            justificationId: null, validatedBy: null, validatedAt: null,
            updatedAt: `${dateIso(offset)}T17:05:00.000Z`, history: []
          });
        });
      });
    });
    const pendingStudent = students.find((student) => student.classId === "c-5b" && student.id !== "s-mateo");
    const target = attendance.find((item) => pendingStudent && item.studentId === pendingStudent.id && item.date === dateIso(-3));
    if (target) { target.status = "ABSENT"; target.justificationPending = true; target.justificationId = "just-demo-1"; }
    return attendance;
  }

  function createCitations(students) {
    const chosen = ["s-valentina", "s-mateo", "s-daniela", ...students.filter((student) => !student.id.startsWith("s-valentina")).slice(6, 11).map((student) => student.id)];
    return chosen.map((studentId, index) => ({
      id: `cit-${index + 1}`, studentId,
      teacherId: index % 2 ? "t-carolina" : "t-andres",
      title: index % 2 ? "Seguimiento académico" : "Reunión de avance trimestral",
      reason: index % 2 ? "Conversar sobre hábitos de estudio y acuerdos de seguimiento." : "Revisar resultados y próximos compromisos académicos.",
      date: dateIso(5 + index), time: index % 2 ? "14:30" : "10:00",
      status: index === 0 ? "PENDING" : index % 3 === 0 ? "PENDING" : "RESPONDED",
      response: index === 0 || index % 3 === 0 ? null : index % 2 ? "YES" : "NO",
      responseAt: index === 0 || index % 3 === 0 ? null : `${dateIso(-1)}T20:10:00.000Z`,
      createdAt: `${dateIso(-3)}T14:25:00.000Z`
    }));
  }

  function createSeedData() {
    const teachers = createTeachers();
    const classes = createClasses();
    const guardians = createGuardians();
    const students = createStudents(classes, guardians);
    const assignments = createAssignments(classes);
    const schedule = createSchedule(classes, assignments);
    const activities = createActivities(classes, assignments, students);
    const attendance = createAttendance(classes, assignments, students);
    const citations = createCitations(students);
    const pendingStudent = students.find((student) => student.classId === "c-5b" && student.id !== "s-mateo");
    const pendingAttendance = attendance.find((item) => pendingStudent && item.studentId === pendingStudent.id && item.justificationPending);

    const observations = students.slice(0, 22).map((student, index) => ({
      id: `obs-${index + 1}`, studentId: student.id,
      teacherId: index % 4 === 0 ? "t-andres" : index % 4 === 1 ? "t-carolina" : index % 4 === 2 ? "t-lucia" : "t-marcos",
      kind: index % 7 === 0 ? "URGENT" : index % 5 === 0 ? "IMPORTANT" : index % 3 === 0 ? "POSITIVE" : "NORMAL",
      text: index % 3 === 0 ? "Demostró constancia, colaboración y una mejora notable durante la clase." : "Se registró seguimiento académico para reforzar organización y cumplimiento.",
      date: dateIso(-(index % 8)), createdAt: nowIso()
    }));

    const authorizations = [
      { id: "aut-1", studentId: "s-valentina", title: "Gira académica al Biomuseo", detail: "Salida pedagógica con el grupo de Ciencias.", dueDate: dateIso(9), response: null, responseAt: null },
      { id: "aut-2", studentId: "s-mateo", title: "Participación en feria científica", detail: "Presentación del proyecto del salón.", dueDate: dateIso(12), response: "AUTHORIZED", responseAt: `${dateIso(-1)}T20:30:00.000Z` },
      { id: "aut-3", studentId: "s-daniela", title: "Ensayo de acto cívico", detail: "Permanencia extendida el día indicado.", dueDate: dateIso(6), response: null, responseAt: null }
    ];

    const groupActivities = activities.filter((activity) => activity.isGroup).slice(0, 8);
    const groups = [];
    groupActivities.forEach((activity, activityIndex) => {
      const classStudents = students.filter((student) => student.classId === activity.classId);
      for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
        groups.push({
          id: `grp-${activityIndex}-${groupIndex}`, activityId: activity.id, classId: activity.classId,
          code: `GRUPO ${groupIndex + 1} — ${classLabel({ classes }, activity.classId)}`,
          memberIds: classStudents.filter((_, index) => index % 3 === groupIndex).map((student) => student.id),
          received: groupIndex < 2, excluded: []
        });
      }
    });

    const extensions = activities.slice(0, 5).map((activity, index) => ({
      id: `ext-${index + 1}`, activityId: activity.id,
      studentId: students.find((student) => student.classId === activity.classId && index % 2 === 0)?.id || students[0].id,
      teacherId: assignments.find((item) => item.id === activity.assignmentId).teacherId,
      originalDate: activity.dueDate, grantedDate: dateIso(-1), classDays: 2 + (index % 2),
      maxDate: dateIso(3 + index), reason: "Situación familiar informada y registrada.",
      normalPenalty: activity.latePenalty, extensionPenalty: 0.2, createdAt: nowIso()
    }));

    const justifications = pendingAttendance ? [{
      id: "just-demo-1", attendanceId: pendingAttendance.id, studentId: pendingAttendance.studentId,
      guardianId: students.find((student) => student.id === pendingAttendance.studentId).guardianId,
      date: pendingAttendance.date, reason: "Cita médica; entregaré el certificado físico en secretaría.",
      status: "PENDING", requestedAt: `${dateIso(-2)}T19:40:00.000Z`, validatedBy: null, validatedAt: null
    }] : [];

    const notifications = [
      { id: "not-1", audienceRole: "GUARDIAN", targetId: "g-mariela", studentId: "s-valentina", type: "DAILY", title: "Resumen diario disponible", message: "Consulta la asistencia, actividades y notas publicadas de Valentina.", createdAt: nowIso(), read: false },
      { id: "not-2", audienceRole: "TEACHER", targetId: "t-carolina", studentId: pendingAttendance?.studentId || "s-mateo", type: "JUSTIFICATION", title: "Justificación pendiente de recibir", message: "El acudiente informó que entregará un documento físico.", createdAt: nowIso(), read: false },
      { id: "not-3", audienceRole: "ADMIN", targetId: "admin", studentId: null, type: "SYSTEM", title: "Datos de demostración listos", message: "El entorno contiene salones, horarios, actividades y registros conectados.", createdAt: nowIso(), read: false }
    ];

    const invitations = students.slice(0, 18).map((student, index) => ({
      id: `inv-${index + 1}`,
      guardianId: student.guardianId,
      classId: student.classId,
      studentIds: students.filter((item) => item.guardianId === student.guardianId).map((item) => item.id),
      code: `EDU-${String(2401 + index).padStart(4, "0")}`,
      status: index % 4 === 0 ? "ACTIVATED" : index % 3 === 0 ? "SENT" : "PENDING",
      channel: index % 2 ? "WHATSAPP" : "EMAIL",
      preparedAt: `${dateIso(-8 + (index % 5))}T14:00:00.000Z`,
      sentAt: index % 3 === 1 ? null : `${dateIso(-5 + (index % 4))}T15:30:00.000Z`,
      acceptedAt: index % 4 === 0 ? `${dateIso(-2)}T19:00:00.000Z` : null,
      createdBy: classes.find((item) => item.id === student.classId)?.counselorId || "admin"
    })).filter((item, index, list) => list.findIndex((entry) => entry.guardianId === item.guardianId && entry.classId === item.classId) === index);

    const audit = [
      { id: "aud-1", at: `${dateIso(-1)}T19:20:00.000Z`, actorId: "t-andres", actor: "Andrés Villalobos", action: "PUBLICÓ NOTAS", detail: "Práctica aplicada · Matemática — 8.º A", severity: "IMPORTANT" },
      { id: "aud-2", at: `${dateIso(-2)}T16:05:00.000Z`, actorId: "t-carolina", actor: "Carolina Ríos", action: "CORRIGIÓ ASISTENCIA", detail: "Actualizó una tardanza con hora de llegada.", severity: "IMPORTANT" },
      { id: "aud-3", at: `${dateIso(-3)}T14:12:00.000Z`, actorId: "admin", actor: "Administrador", action: "MODIFICÓ HORARIO", detail: "Aula de Ciencias actualizada sin borrar el historial.", severity: "INFO" },
      { id: "aud-4", at: `${dateIso(-4)}T20:18:00.000Z`, actorId: "g-mariela", actor: "Mariela Soto", action: "RESPONDIÓ AUTORIZACIÓN", detail: "Autorizó participación de Mateo en la feria científica.", severity: "IMPORTANT" }
    ];

    return {
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      createdAt: nowIso(), updatedAt: nowIso(),
      institution: {
        name: "Colegio Horizonte de Panamá", motto: "Aprender, convivir y avanzar juntos", logo: "",
        primary: "#0b3155", secondary: "#0f9b8e", activeYear: 2026, currentTrimester: 2,
        dailySummaryDelayMinutes: 60
      },
      years: [{ year: 2025, status: "CLOSED", closedAt: "2025-12-12T18:00:00.000Z" }, { year: 2026, status: "ACTIVE", closedAt: null }],
      admins: [{ id: "admin", name: "Administración EduControl", email: "admin@horizonte.edu.pa", active: true }],
      teachers, guardians, classes, students,
      subjectCatalog: SUBJECT_DEFINITIONS.map(([name]) => ({ id: `cat-${normalize(name)}`, name, active: true })),
      assignments, schedule, activities, attendance, citations, authorizations, observations,
      extensions, groups, justifications, notifications, audit, invitations,
      linkRequests: [], archives: [], trash: []
    };
  }

  function migrateData(raw) {
    if (!raw || typeof raw !== "object") return createSeedData();
    let data = clone(raw);
    const version = Number(data.schemaVersion || data.version || 0);
    if (version < 1) {
      const seed = createSeedData();
      data = { ...seed, ...data, schemaVersion: 1, appVersion: APP_VERSION };
    }
    if (version < 2) {
      if (!Array.isArray(data.invitations)) data.invitations = [];
      if (!Array.isArray(data.trash)) data.trash = [];
      (data.teachers || []).forEach((item) => { if (typeof item.photo !== "string") item.photo = ""; });
      (data.guardians || []).forEach((item) => { if (typeof item.photo !== "string") item.photo = ""; });
      (data.students || []).forEach((item) => { if (typeof item.photo !== "string") item.photo = ""; });
      (data.classes || []).forEach((item) => { if (typeof item.image !== "string") item.image = ""; });
      ["assignments", "schedule", "activities", "citations", "observations", "extensions", "groups"].forEach((key) => {
        (data[key] || []).forEach((item) => { if (typeof item.active !== "boolean") item.active = true; });
      });
    }
    data.schemaVersion = SCHEMA_VERSION;
    data.appVersion = APP_VERSION;
    data.updatedAt = data.updatedAt || nowIso();
    ["admins", "teachers", "guardians", "classes", "students", "subjectCatalog", "assignments", "schedule", "activities", "attendance", "citations", "authorizations", "observations", "extensions", "groups", "justifications", "notifications", "audit", "invitations", "linkRequests", "archives", "trash"].forEach((key) => {
      if (!Array.isArray(data[key])) data[key] = [];
    });
    return data;
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const seed = createSeedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const migrated = migrateData(JSON.parse(saved));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch (error) {
      console.error("EduControl: no se pudo leer el almacenamiento", error);
      return createSeedData();
    }
  }

  function saveData(data) {
    data.updatedAt = nowIso();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function classLabel(data, classId) {
    const item = data.classes.find((schoolClass) => schoolClass.id === classId);
    return item ? `${item.grade} ${item.section}` : "Sin salón";
  }
  function personName(data, id) {
    const person = [...data.admins, ...data.teachers, ...data.guardians, ...data.students].find((item) => item.id === id);
    return person ? person.name : "Usuario";
  }
  function assignmentLabel(data, assignmentId) {
    const assignment = data.assignments.find((item) => item.id === assignmentId);
    return assignment ? `${assignment.name} · ${classLabel(data, assignment.classId)}` : "Materia";
  }
  function addAudit(data, actorId, action, detail, severity = "INFO") {
    data.audit.unshift({ id: uid("aud"), at: nowIso(), actorId, actor: personName(data, actorId), action, detail, severity });
    data.audit = data.audit.slice(0, 1000);
  }
  function addNotification(data, audienceRole, targetId, type, title, message, studentId = null) {
    data.notifications.unshift({ id: uid("not"), audienceRole, targetId, studentId, type, title, message, createdAt: nowIso(), read: false });
  }

  window.EduData = {
    STORAGE_KEY, SESSION_KEY, APP_VERSION, SCHEMA_VERSION, DAYS,
    clone, uid, nowIso, dateIso, oneDecimal, normalize,
    createSeedData, migrateData, loadData, saveData,
    classLabel, personName, assignmentLabel, addAudit, addNotification
  };
})();
