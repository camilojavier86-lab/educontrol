(function () {
  "use strict";

  const D = window.EduData;
  const app = document.getElementById("app");
  const modalRoot = document.getElementById("modal-root");
  const toastRoot = document.getElementById("toast-root");
  let data = D.loadData();
  let deferredInstallPrompt = null;
  let modalSubmitHandler = null;
  let state = {
    session: loadSession(),
    view: "dashboard",
    adminUserType: "teachers",
    selectedAssignmentId: null,
    attendanceDate: D.dateIso(0),
    selectedStudentId: null,
    selectedSubjectId: null,
    filters: {}
  };

  function loadSession() {
    try {
      const value = JSON.parse(sessionStorage.getItem(D.SESSION_KEY) || "null");
      return value && value.role ? value : null;
    } catch (_) { return null; }
  }
  function saveSession() {
    if (state.session) sessionStorage.setItem(D.SESSION_KEY, JSON.stringify(state.session));
    else sessionStorage.removeItem(D.SESSION_KEY);
  }
  function persist(message, tone = "success") {
    D.saveData(data);
    if (message) toast(message, tone);
  }
  function toast(message, tone = "") {
    const item = document.createElement("div");
    item.className = `toast ${tone}`;
    item.textContent = message;
    toastRoot.appendChild(item);
    window.setTimeout(() => item.remove(), 3400);
  }
  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }
  function attr(value) { return esc(value); }
  function initials(name) { return String(name || "EC").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase(); }
  function formatDate(value, includeTime = false) {
    if (!value) return "—";
    const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return new Intl.DateTimeFormat("es-PA", includeTime ? { dateStyle: "medium", timeStyle: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(date);
  }
  function formatTime(value) { return value || "—"; }
  function option(value, label, selected) { return `<option value="${attr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`; }
  function classById(id) { return data.classes.find((item) => item.id === id); }
  function studentById(id) { return data.students.find((item) => item.id === id); }
  function guardianById(id) { return data.guardians.find((item) => item.id === id); }
  function teacherById(id) { return data.teachers.find((item) => item.id === id); }
  function assignmentById(id) { return data.assignments.find((item) => item.id === id); }
  function activityById(id) { return data.activities.find((item) => item.id === id); }
  function actorName() { return state.session ? D.personName(data, state.session.actorId) : "Usuario"; }
  function roleLabel(role) { return ({ ADMIN: "Administrador", TEACHER: "Profesor", COUNSELOR: "Profesor consejero", GUARDIAN: "Acudiente" })[role] || role; }
  function avatarMarkup(person, size = "") {
    if (person?.photo) return `<img class="avatar avatar-photo ${size}" src="${attr(person.photo)}" alt="Foto de ${attr(person.name)}">`;
    return `<span class="avatar ${size}">${initials(person?.name)}</span>`;
  }
  function photoPicker(current, label = "Fotografía del perfil") {
    return `<label class="field wide photo-picker"><span>${esc(label)}</span><span class="photo-picker-box">${current ? `<img src="${attr(current)}" alt="Fotografía actual">` : `<span class="photo-placeholder">${icon("camera")}<strong>Agregar fotografía</strong><small>Se optimizará para no llenar el almacenamiento.</small></span>`}<input class="input" type="file" name="photo" accept="image/*" capture="user"></span></label>`;
  }
  function formSteps(labels, active = labels.length) {
    return `<div class="form-steps" aria-label="Progreso del formulario">${labels.map((label, index) => `<span class="${index < active ? "done" : ""}"><b>${index + 1}</b>${esc(label)}</span>`).join("")}</div>`;
  }
  function saveCompressedPhoto(file, callback) {
    if (!file || !file.size) return callback(null);
    const reader = new FileReader();
    reader.onerror = () => callback(null);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => callback(reader.result);
      image.onload = () => {
        const max = 420; const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", .78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function statusPill(status) {
    const labels = {
      UNMARKED: ["No marcado", "danger"], PRESENT: ["Presente", "success"], LATE: ["Tardanza", "warning"],
      EARLY: ["Retiro anticipado", "warning"], ABSENT: ["Ausente", "danger"], JUSTIFIED: ["Ausencia justificada", "success"],
      PENDING: ["Pendiente", "warning"], PUBLISHED: ["Publicado", "success"], DRAFT: ["Borrador", "info"],
      RESPONDED: ["Respondida", "success"], VALIDATED: ["Validada", "success"], AUTHORIZED: ["Autorizado", "success"],
      DENIED: ["No autorizado", "danger"], RECEIVED: ["Recibido", "success"], NOT_DELIVERED: ["No entregado", "danger"],
      FINAL_ZERO: ["0.0 definitivo", "danger"], ACTIVE: ["Activo", "success"], CLOSED: ["Cerrado", "info"],
      SENT: ["Invitación enviada", "success"], ACTIVATED: ["Cuenta activada", "success"], ANNULLED: ["Anulado", "danger"]
    };
    const pair = labels[status] || [String(status || "—"), "info"];
    return `<span class="pill ${pair[1]}">${esc(pair[0])}</span>`;
  }

  function icon(name) {
    const paths = {
      school: '<path d="m3 10 9-6 9 6v9H3z"/><path d="M8 19v-6h8v6M2 22h20"/>',
      dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      student: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5v13"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      alert: '<path d="M10.3 3.7 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
      report: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
      audit: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
      arrow: '<path d="m15 18-6-6 6-6"/>',
      logout: '<path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      close: '<path d="M18 6 6 18M6 6l12 12"/>',
      download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>',
      refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 9M20 4v5h-5"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
      clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6"/>',
      home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z"/>',
      award: '<circle cx="12" cy="8" r="6"/><path d="m8 13-2 8 6-3 6 3-2-8"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
      camera: '<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="4"/>',
      send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
  }

  function brandMark() {
    return data.institution.logo ? `<div class="brand-mark"><img src="${attr(data.institution.logo)}" alt="Logo de ${attr(data.institution.name)}"></div>` : `<div class="brand-mark">${icon("school")}</div>`;
  }

  function pageHead(eyebrow, title, description = "", actions = "") {
    return `<div class="page-head"><div><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ""}</div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
  }
  function metric(label, value, note, iconName, tone = "", destination = "") {
    const tag = destination ? "button" : "div";
    const action = destination.startsWith("#") ? `data-action="scroll-to" data-target="${attr(destination.slice(1))}"` : `data-action="set-view" data-view="${attr(destination)}"`;
    return `<${tag} class="metric" ${destination ? action : ""}><span class="metric-icon ${tone}">${icon(iconName)}</span><span class="metric-copy"><small>${esc(label)}</small><strong>${esc(value)}</strong><em>${esc(note)}</em></span>${destination ? `<span class="metric-arrow">→</span>` : ""}</${tag}>`;
  }
  function empty(title, text) { return `<div class="empty">${icon("file")}<strong>${esc(title)}</strong><span>${esc(text)}</span></div>`; }

  function showModal(title, body, submitText = "Guardar", handler = null, wide = false) {
    modalSubmitHandler = handler;
    modalRoot.innerHTML = `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${attr(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">×</button></div><form id="modal-form"><div class="modal-body">${body}<div id="modal-error" class="form-error"></div></div><div class="modal-foot"><button class="button ghost" type="button" data-action="close-modal">Cancelar</button>${handler ? `<button class="button" type="submit">${esc(submitText)}</button>` : ""}</div></form></div></div>`;
    const focusable = modalRoot.querySelector("input,select,textarea,button");
    if (focusable) setTimeout(() => focusable.focus(), 0);
  }
  function closeModal() { modalRoot.innerHTML = ""; modalSubmitHandler = null; }
  function showFormError(message) { const el = document.getElementById("modal-error"); if (el) { el.textContent = message; el.classList.add("show"); } }
  function confirmModal(title, text, confirmText, callback, danger = false) {
    showModal(title, `<div class="notice ${danger ? "danger" : "warning"}">${esc(text)}</div>`, confirmText, () => { closeModal(); callback(); }, false);
  }

  function renderLogin() {
    const roles = [
      ["ADMIN", "Administrador", "Control institucional, configuración, reportes y modo de prueba.", "shield"],
      ["TEACHER", "Profesor", "Asistencia, actividades, notas, prórrogas, observaciones y citaciones.", "book"],
      ["COUNSELOR", "Profesor consejero", "Funciones de profesor más gestión del salón y justificaciones.", "users"],
      ["GUARDIAN", "Acudiente", "Seguimiento completo e independiente de cada estudiante vinculado.", "student"]
    ];
    app.innerHTML = `<main class="login-screen"><div class="login-wrap"><header class="login-head">${brandMark()}<h1>EduControl</h1><p>${esc(data.institution.name)} · ${esc(data.institution.motto)}</p></header><section class="role-grid" aria-label="Perfiles de acceso">${roles.map(([role, title, text, iconName]) => `<button class="role-card" data-action="choose-role" data-role="${role}"><span class="role-icon">${icon(iconName)}</span><h2>${title}</h2><p>${text}</p></button>`).join("")}</section><p class="login-foot">Prototipo funcional v${D.APP_VERSION} · Los datos se guardan en este navegador.</p></div></main>`;
  }

  function chooseRole(role) {
    if (role === "ADMIN") { enterRole("ADMIN", "admin", false); return; }
    let people = [];
    if (role === "TEACHER") people = data.teachers.filter((item) => item.active);
    if (role === "COUNSELOR") people = data.teachers.filter((item) => item.active && item.counselorClassId);
    if (role === "GUARDIAN") people = data.guardians.filter((item) => item.active);
    showModal(`Entrar como ${roleLabel(role).toLowerCase()}`, `<div class="notice">Este acceso de demostración permite probar los datos compartidos sin contraseñas reales.</div><div class="list" style="margin-top:14px">${people.map((person) => {
      const note = role === "GUARDIAN" ? `${data.students.filter((student) => student.guardianId === person.id).length} estudiante(s)` : role === "COUNSELOR" ? `Consejero de ${D.classLabel(data, person.counselorClassId)}` : person.specialty;
      return `<button type="button" class="list-row interactive-row" data-action="enter-role" data-role="${role}" data-id="${person.id}"><span class="list-row-main">${avatarMarkup(person)}<span><strong>${esc(person.name)}</strong><small>${esc(note)}</small></span></span><span class="pill info">Entrar →</span></button>`;
    }).join("")}</div>`, "", null, false);
  }

  function enterRole(role, actorId, adminOrigin) {
    const adminId = adminOrigin ? (state.session?.adminId || "admin") : null;
    state.session = { role, actorId, adminOrigin: Boolean(adminOrigin), adminId };
    state.view = "dashboard";
    state.selectedAssignmentId = null;
    state.selectedStudentId = role === "GUARDIAN" ? data.students.find((item) => item.guardianId === actorId)?.id || null : null;
    state.selectedSubjectId = null;
    saveSession(); closeModal(); render();
  }

  function navForRole(role) {
    if (role === "ADMIN") return [
      ["dashboard", "Dashboard", "dashboard"], ["users", "Usuarios", "users"], ["students", "Estudiantes", "student"],
      ["classes", "Salones", "school"], ["subjects", "Materias", "book"], ["schedule", "Horarios", "calendar"],
      ["year", "Año lectivo", "clock"], ["notifications", "Notificaciones", "bell"], ["reports", "Reportes", "report"],
      ["audit", "Auditoría", "audit"], ["settings", "Configuración", "settings"]
    ];
    if (role === "COUNSELOR") return [
      ["dashboard", "Dashboard", "dashboard"], ["classroom", "Mi salón", "school"], ["justifications", "Justificaciones", "shield"],
      ["attendance", "Asistencia", "check"], ["activities", "Actividades y notas", "clipboard"], ["schedule", "Horario", "calendar"],
      ["groups", "Grupos y prórrogas", "users"], ["observations", "Observaciones", "message"], ["citations", "Citaciones", "calendar"],
      ["invitations", "Invitaciones", "send"], ["notifications", "Notificaciones", "bell"], ["reports", "Reportes", "report"]
    ];
    if (role === "TEACHER") return [
      ["dashboard", "Dashboard", "dashboard"], ["subjects", "Mis materias", "book"], ["attendance", "Asistencia", "check"],
      ["activities", "Actividades y notas", "clipboard"], ["schedule", "Horario", "calendar"], ["groups", "Grupos y prórrogas", "users"],
      ["observations", "Observaciones", "message"], ["citations", "Citaciones", "calendar"], ["notifications", "Notificaciones", "bell"], ["reports", "Reportes", "report"]
    ];
    return [];
  }

  function renderShell(content, nav) {
    const session = state.session;
    const hasOrigin = session.adminOrigin;
    const current = nav.find((item) => item[0] === state.view) || nav[0];
    const actor = teacherById(session.actorId) || guardianById(session.actorId) || data.admins.find((item) => item.id === session.actorId);
    app.innerHTML = `<div class="app-shell ${hasOrigin ? "has-admin-return" : ""}">${hasOrigin ? `<div class="admin-return"><button data-action="back-admin">${icon("arrow")} Volver al Administrador</button><span>Probando como ${esc(roleLabel(session.role))}: ${esc(actorName())}</span></div>` : ""}<div class="mobile-overlay" data-action="close-menu"></div><aside class="sidebar"><div class="brand">${brandMark()}<div><strong>EduControl <span class="version-tag">v${D.APP_VERSION}</span></strong><span>${esc(data.institution.name)}</span></div></div><nav class="nav-group"><span class="nav-label">${esc(roleLabel(session.role))}</span>${nav.map(([view, label, iconName]) => `<button class="nav-item ${state.view === view ? "active" : ""}" data-action="set-view" data-view="${view}">${icon(iconName)}<span>${esc(label)}</span></button>`).join("")}</nav><div class="sidebar-foot"><div class="actor-card">${avatarMarkup(actor)}<span><strong>${esc(actorName())}</strong><small>${esc(roleLabel(session.role))}</small></span></div><button class="logout-button" data-action="logout">Cerrar sesión de prueba</button></div></aside><main class="main"><header class="topbar"><div class="row"><button class="button ghost icon-only menu-button" data-action="toggle-menu" aria-label="Abrir menú">${icon("menu")}</button><div><h1>${esc(current[1])}</h1><p>Año lectivo ${data.institution.activeYear} · Trimestre ${data.institution.currentTrimester}</p></div></div><div class="top-actions"><button class="button ghost icon-only" data-action="set-view" data-view="notifications" aria-label="Notificaciones">${icon("bell")}</button><button class="button ghost hide-mobile" data-action="install-app" ${deferredInstallPrompt ? "" : "disabled"}>Instalar app</button></div></header><div class="content">${content}</div></main></div>`;
  }

  function enhanceResponsiveTables() {
    app.querySelectorAll?.("table")?.forEach((table) => {
      const labels = [...table.querySelectorAll("thead th")].map((item) => item.textContent.trim());
      table.classList.add("responsive-table");
      table.querySelectorAll("tbody tr").forEach((row) => [...row.children].forEach((cell, index) => cell.dataset.label = labels[index] || "Dato"));
    });
  }

  function render() {
    document.documentElement?.style?.setProperty("--navy", data.institution.primary || "#0b3155");
    document.documentElement?.style?.setProperty("--teal", data.institution.secondary || "#0f9b8e");
    if (!state.session) renderLogin();
    else if (state.session.role === "ADMIN") renderShell(renderAdmin(), navForRole("ADMIN"));
    else if (state.session.role === "GUARDIAN") renderGuardian();
    else renderShell(renderTeacher(), navForRole(state.session.role));
    setTimeout(enhanceResponsiveTables, 0);
  }

  function renderAdmin() {
    const views = {
      dashboard: renderAdminDashboard,
      users: renderAdminUsers,
      students: renderAdminStudents,
      classes: renderAdminClasses,
      subjects: renderAdminSubjects,
      schedule: renderAdminSchedule,
      year: renderAcademicYear,
      notifications: renderNotifications,
      reports: renderAdminReports,
      audit: renderAudit,
      settings: renderSettings
    };
    return (views[state.view] || views.dashboard)();
  }

  function scheduleConflicts() {
    const result = [];
    const slots = data.schedule.filter((item) => item.active && item.kind === "CLASS");
    slots.forEach((a, index) => slots.slice(index + 1).forEach((b) => {
      const overlaps = a.day === b.day && a.start < b.end && b.start < a.end;
      const sameTeacher = a.teacherId === b.teacherId && a.classId !== b.classId;
      const sameClass = a.classId === b.classId && a.assignmentId !== b.assignmentId;
      if (overlaps && (sameTeacher || sameClass)) result.push({ a, b, type: sameTeacher ? "TEACHER" : "CLASS" });
    }));
    return result;
  }

  function clockMinutes(value) {
    const [hour, minute] = String(value || "00:00").split(":").map(Number);
    return hour * 60 + minute;
  }
  function currentDayName(date = new Date()) {
    return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][date.getDay()];
  }
  function scheduleMoment(slots, date = new Date()) {
    const day = currentDayName(date); const now = date.getHours() * 60 + date.getMinutes();
    const today = slots.filter((item) => item.active && item.kind === "CLASS" && item.day === day).sort((a, b) => a.start.localeCompare(b.start));
    const current = today.find((item) => clockMinutes(item.start) <= now && now < clockMinutes(item.end));
    const next = today.find((item) => clockMinutes(item.start) > now) || null;
    return { day, now, today, current, next };
  }
  function liveClassCard(slots, audience = "teacher") {
    const moment = scheduleMoment(slots); const current = moment.current; const next = moment.next;
    if (current) {
      const assignment = assignmentById(current.assignmentId); const remaining = Math.max(0, clockMinutes(current.end) - moment.now);
      return `<section class="live-class active"><span class="live-pulse"></span><div><small>CLASE EN CURSO · FALTAN ${remaining} MIN</small><h3>${esc(assignment?.name)} · ${esc(D.classLabel(data, current.classId))}</h3><p>${current.start}–${current.end} · ${esc(current.room)} · ${esc(teacherById(current.teacherId)?.name || "")}</p></div>${audience === "teacher" ? `<button class="button secondary" data-action="open-attendance" data-assignment="${current.assignmentId}">${icon("check")} Tomar asistencia</button>` : `<button class="button secondary" data-action="schedule-slot" data-id="${current.id}">${icon("book")} Abrir materia</button>`}</section>`;
    }
    if (next) {
      const assignment = assignmentById(next.assignmentId); const waiting = Math.max(0, clockMinutes(next.start) - moment.now);
      return `<section class="live-class"><span class="live-pulse next"></span><div><small>PRÓXIMA CLASE · EN ${waiting} MIN</small><h3>${esc(assignment?.name)} · ${esc(D.classLabel(data, next.classId))}</h3><p>${next.start}–${next.end} · ${esc(next.room)} · ${esc(teacherById(next.teacherId)?.name || "")}</p></div>${audience === "teacher" ? `<button class="button ghost" data-action="open-attendance" data-assignment="${next.assignmentId}">Preparar asistencia</button>` : `<button class="button ghost" data-action="schedule-slot" data-id="${next.id}">Ver materia</button>`}</section>`;
    }
    return `<section class="live-class done"><span class="live-pulse"></span><div><small>${esc(moment.day.toUpperCase())}</small><h3>${moment.today.length ? "Jornada académica finalizada" : "Sin clases programadas hoy"}</h3><p>${moment.today.length ? `${moment.today.length} horas académicas registradas para este día.` : "El horario semanal permanece disponible abajo."}</p></div></section>`;
  }

  function renderAdminDashboard() {
    const conflicts = scheduleConflicts();
    const pendingJustifications = data.justifications.filter((item) => item.status === "PENDING").length;
    return `${pageHead("Resumen institucional", "Centro de control", "Administra la institución y prueba cada perfil sobre los mismos datos.", `<button class="button secondary" data-action="admin-view-as">${icon("student")} Ver como</button>`)}<section class="metrics">${metric("Estudiantes", data.students.filter((item) => item.active).length, `${data.classes.length} salones activos`, "student", "", "students")}${metric("Profesores", data.teachers.filter((item) => item.active).length, `${data.teachers.filter((item) => item.counselorClassId).length} consejeros`, "users", "teal", "users")}${metric("Actividades", data.activities.length, `${data.activities.filter((item) => item.status === "DRAFT").length} en borrador`, "clipboard", "violet", "subjects")}${metric("Alertas", conflicts.length + pendingJustifications, `${conflicts.length} conflictos · ${pendingJustifications} justificaciones`, "alert", "amber", "schedule")}</section><div class="grid-2"><section class="card"><div class="card-head"><div><h3>Centro de pruebas</h3><p>Cambie de perfil sin cerrar la sesión administrativa.</p></div></div><div class="card-body"><div class="grid-3"><button class="role-card" data-action="admin-view-role" data-role="TEACHER"><span class="role-icon">${icon("book")}</span><h2>Ver como profesor</h2><p>Crear actividad, calificar, publicar y registrar asistencia.</p></button><button class="role-card" data-action="admin-view-role" data-role="COUNSELOR"><span class="role-icon">${icon("shield")}</span><h2>Ver como consejero</h2><p>Gestionar salón y validar documentos de justificación.</p></button><button class="role-card" data-action="admin-view-role" data-role="GUARDIAN"><span class="role-icon">${icon("student")}</span><h2>Ver como acudiente</h2><p>Consultar estudiantes, responder y solicitar justificación.</p></button></div></div></section><section class="card"><div class="card-head"><div><h3>Atención requerida</h3><p>Datos reales del entorno de prueba.</p></div></div><div class="card-body"><div class="list">${conflicts.slice(0, 3).map(({ a, b }) => `<div class="conflict">${icon("alert")}<div><strong>Conflicto de ${esc(teacherById(a.teacherId)?.name)}</strong><div class="small-text">${esc(a.day)} ${esc(a.start)} · ${esc(D.classLabel(data, a.classId))} y ${esc(D.classLabel(data, b.classId))}</div></div></div>`).join("")}${pendingJustifications ? `<div class="list-row"><span class="list-row-main"><span class="dot amber"></span><span><strong>${pendingJustifications} justificación(es) pendiente(s)</strong><small>La validación corresponde al profesor consejero.</small></span></span></div>` : ""}${!conflicts.length && !pendingJustifications ? empty("Sin alertas", "No hay conflictos ni pendientes.") : ""}</div></div></section></div><section class="card" style="margin-top:18px"><div class="card-head"><div><h3>Actividad reciente</h3><p>Eventos importantes, sin acciones triviales.</p></div><button class="button ghost small" data-action="set-view" data-view="audit">Ver auditoría</button></div><div class="card-body">${auditTimeline(data.audit.slice(0, 6))}</div></section>`;
  }

  function renderAdminUsers() {
    const type = state.adminUserType;
    const list = (type === "teachers" ? data.teachers : data.guardians).filter((item) => item.active);
    return `${pageHead("Administración", "Usuarios", "Cuentas persistentes: no se eliminan al cambiar de año.", `<button class="button" data-action="new-user" data-type="${type}">${icon("plus")} Crear ${type === "teachers" ? "profesor" : "acudiente"}</button>`)}<div class="toolbar"><button class="button ${type === "teachers" ? "" : "ghost"}" data-action="user-type" data-type="teachers">Profesores</button><button class="button ${type === "guardians" ? "" : "ghost"}" data-action="user-type" data-type="guardians">Acudientes</button><label class="field"><span>Buscar</span><input class="input" data-filter="userSearch" value="${attr(state.filters.userSearch || "")}" placeholder="Nombre, correo o teléfono"></label></div><section class="card"><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Contacto</th><th>${type === "teachers" ? "Función" : "Estudiantes"}</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${list.filter((item) => D.normalize(`${item.name} ${item.email} ${item.phone}` ).includes(D.normalize(state.filters.userSearch || ""))).map((item) => `<tr><td><div class="row">${avatarMarkup(item)}<div><strong>${esc(item.name)}</strong><div class="muted small-text">${esc(item.email)}</div></div></div></td><td>${esc(item.phone || "—")}</td><td>${type === "teachers" ? `${esc(item.specialty)}${item.counselorClassId ? `<br><span class="pill violet">Consejero ${esc(D.classLabel(data, item.counselorClassId))}</span>` : ""}` : `${data.students.filter((student) => student.guardianId === item.id).length} vinculado(s)`}</td><td>${statusPill(item.active ? "ACTIVE" : "CLOSED")}</td><td><div class="list-actions"><button class="button ghost small" data-action="edit-user" data-type="${type}" data-id="${item.id}">${icon("edit")} Editar</button><button class="button ghost small danger-text" data-action="delete-user" data-type="${type}" data-id="${item.id}">${icon("trash")} Eliminar</button></div></td></tr>`).join("")}</tbody></table></div></div></section>`;
  }

  function renderAdminStudents() {
    const query = D.normalize(state.filters.studentSearch || "");
    const classFilter = state.filters.studentClass || "all";
    const students = data.students.filter((student) => student.active && (classFilter === "all" || student.classId === classFilter) && D.normalize(`${student.name} ${D.classLabel(data, student.classId)} ${guardianById(student.guardianId)?.name}`).includes(query));
    return `${pageHead("Administración", "Estudiantes", "Un estudiante tiene un solo acudiente principal; la cédula permanece privada.", `<button class="button" data-action="new-student">${icon("plus")} Crear estudiante</button>`)}<div class="toolbar"><label class="field"><span>Buscar</span><input class="input" data-filter="studentSearch" value="${attr(state.filters.studentSearch || "")}" placeholder="Nombre o acudiente"></label><label class="field"><span>Salón</span><select class="select" data-filter="studentClass">${option("all", "Todos", classFilter)}${data.classes.map((item) => option(item.id, D.classLabel(data, item.id), classFilter)).join("")}</select></label><span class="pill info">${students.length} resultados</span></div><section class="card"><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Salón</th><th>Acudiente</th><th>Datos internos</th><th>Acciones</th></tr></thead><tbody>${students.map((student) => `<tr><td><div class="row">${avatarMarkup(student)}<div><strong>${esc(student.name)}</strong><div class="muted small-text">${student.gender === "F" ? "Femenino" : "Masculino"}</div></div></div></td><td>${esc(D.classLabel(data, student.classId))}</td><td>${esc(guardianById(student.guardianId)?.name || "Sin acudiente")}</td><td><span class="pill info">${esc(student.idType)}</span> <span class="muted">Protegido</span></td><td><div class="list-actions"><button class="button ghost small" data-action="edit-student" data-id="${student.id}">${icon("edit")} Editar</button><button class="button ghost small" data-action="delete-student" data-id="${student.id}">${icon("trash")}</button></div></td></tr>`).join("")}</tbody></table></div></div></section>`;
  }

  function renderAdminClasses() {
    return `${pageHead("Estructura académica", "Salones", "Cada salón reúne estudiantes, consejero, materias y horario.", `<button class="button" data-action="new-class">${icon("plus")} Crear salón</button>`)}<div class="grid-3">${data.classes.filter((item) => item.active).map((schoolClass) => { const teacher = teacherById(schoolClass.counselorId); return `<section class="card"><div class="card-body"><div class="row between"><span class="metric-icon teal">${icon("school")}</span><span class="pill info">${esc(schoolClass.shift)}</span></div><h3>${esc(D.classLabel(data, schoolClass.id))}</h3><p class="muted small-text">${esc(schoolClass.level)} · ${esc(schoolClass.room)}</p><div class="list" style="margin-top:14px"><div class="list-row"><span><strong>${data.students.filter((item) => item.classId === schoolClass.id && item.active).length}</strong><small>Estudiantes</small></span><span><strong>${data.assignments.filter((item) => item.classId === schoolClass.id && item.active).length}</strong><small>Materias</small></span></div><div class="list-row"><span class="list-row-main"><span class="avatar">${initials(teacher?.name)}</span><span><strong>${esc(teacher?.name || "Sin asignar")}</strong><small>Profesor consejero</small></span></span></div></div><div class="list-actions" style="margin-top:14px"><button class="button ghost small" data-action="edit-class" data-id="${schoolClass.id}">${icon("edit")} Editar</button><button class="button ghost small" data-action="delete-class" data-id="${schoolClass.id}">${icon("trash")}</button></div></div></section>`; }).join("")}</div>`;
  }

  function renderAdminSubjects() {
    const classFilter = state.filters.subjectClass || data.classes[0]?.id;
    const assignments = data.assignments.filter((item) => item.classId === classFilter && item.active);
    return `${pageHead("Estructura académica", "Materias y asignaciones", "Cambiar profesor conserva actividades, notas, grupos y asistencia.", `<button class="button" data-action="new-assignment">${icon("plus")} Asignar materia</button>`)}<div class="toolbar"><label class="field"><span>Salón</span><select class="select" data-filter="subjectClass">${data.classes.map((item) => option(item.id, D.classLabel(data, item.id), classFilter)).join("")}</select></label><span class="pill info">${assignments.length} materias</span></div><section class="card"><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Materia</th><th>Profesor</th><th>Evaluación</th><th>Exoneración</th><th>Acciones</th></tr></thead><tbody>${assignments.map((assignment) => `<tr><td><div class="row"><span class="dot" style="background:${attr(assignment.color)}"></span><strong>${esc(assignment.name)}</strong></div></td><td>${esc(teacherById(assignment.teacherId)?.name || "Sin asignar")}</td><td>Asistencia 5% fija<br><span class="muted small-text">Penalización ${assignment.latePenalty.toFixed(1)} por día de clase</span></td><td>${assignment.exemptionEnabled ? `<span class="pill success">Desde ${assignment.exemptionAverage.toFixed(1)}</span>` : `<span class="pill info">Desactivada</span>`}</td><td><button class="button ghost small" data-action="edit-assignment" data-id="${assignment.id}">${icon("edit")} Editar / reemplazar</button><button class="button ghost small danger-text" data-action="delete-assignment" data-id="${assignment.id}">${icon("trash")} Eliminar</button></td></tr>`).join("")}</tbody></table></div></div></section>`;
  }

  function renderAdminSchedule() {
    const classFilter = state.filters.scheduleClass || data.classes[0]?.id;
    const conflicts = scheduleConflicts();
    return `${pageHead("Organización", "Horarios", "Los conflictos se alertan pero no bloquean el guardado.", `<button class="button" data-action="new-schedule">${icon("plus")} Agregar clase</button>`)}<div class="toolbar"><label class="field"><span>Salón</span><select class="select" data-filter="scheduleClass">${data.classes.map((item) => option(item.id, D.classLabel(data, item.id), classFilter)).join("")}</select></label><span class="pill info">${data.schedule.filter((item) => item.classId === classFilter && item.kind === "CLASS").length} horas académicas semanales</span><span class="pill ${conflicts.length ? "warning" : "success"}">${conflicts.length} conflictos detectados</span></div>${conflicts.length ? `<div class="notice warning" style="margin-bottom:16px">Hay ${conflicts.length} cruces de profesor. Se guardaron para que el Administrador pueda resolverlos sin perder información.</div>` : ""}<section class="card"><div class="card-body">${scheduleBoard(data.schedule.filter((item) => item.classId === classFilter), true)}</div></section>`;
  }

  function renderAcademicYear() {
    const active = data.years.find((item) => item.status === "ACTIVE");
    return `${pageHead("Configuración académica", "Año lectivo", "Cerrar el año conserva una copia histórica y crea una estructura operativa nueva.", "")}<div class="grid-2"><section class="card"><div class="card-head"><div><h3>Año activo</h3><p>Los usuarios conservan sus cuentas.</p></div>${statusPill(active?.status)}</div><div class="card-body"><div class="metric" style="box-shadow:none"><span class="metric-icon teal">${icon("calendar")}</span><span class="metric-copy"><small>Año lectivo</small><strong>${esc(data.institution.activeYear)}</strong><em>Trimestre ${esc(data.institution.currentTrimester)}</em></span></div><div class="notice warning" style="margin:14px 0">Esta acción archivará horarios, asistencias, actividades y notas. No elimina profesores, acudientes ni estudiantes.</div><button class="button danger" data-action="close-year">Cerrar año ${esc(data.institution.activeYear)}</button></div></section><section class="card"><div class="card-head"><div><h3>Historial</h3><p>Años disponibles para consulta.</p></div></div><div class="card-body"><div class="list">${data.years.map((year) => `<div class="list-row"><span><strong>Año lectivo ${year.year}</strong><small>${year.closedAt ? `Cerrado ${formatDate(year.closedAt)}` : "En operación"}</small></span>${statusPill(year.status)}</div>`).join("")}${data.archives.length ? `<div class="notice">${data.archives.length} archivo(s) académico(s) completos guardados localmente.</div>` : ""}</div></div></section></div>`;
  }

  function renderNotifications() {
    const session = state.session;
    let notifications = data.notifications;
    if (session.role === "ADMIN") notifications = notifications.filter((item) => item.audienceRole === "ADMIN" || item.targetId === "admin");
    else notifications = notifications.filter((item) => item.targetId === session.actorId || item.audienceRole === session.role && !item.targetId);
    return `${pageHead("Centro de avisos", "Notificaciones", "Se priorizan resúmenes, citaciones, correcciones, urgencias y vencimientos.", `<button class="button ghost" data-action="mark-all-read">${icon("check")} Marcar leídas</button>`)}<section class="card"><div class="card-body"><div class="list">${notifications.length ? notifications.map((item) => `<div class="list-row"><span class="list-row-main"><span class="dot ${item.read ? "gray" : item.type === "URGENT" ? "red" : "teal"}"></span><span><strong>${esc(item.title)}</strong><small>${esc(item.message)} · ${formatDate(item.createdAt, true)}</small></span></span><div class="list-actions">${item.read ? `<span class="pill info">Leída</span>` : `<button class="button ghost small" data-action="read-notification" data-id="${item.id}">Marcar leída</button>`}<button class="button ghost small danger-text" data-action="delete-notification" data-id="${item.id}">${icon("trash")}</button></div></div>`).join("") : empty("Sin notificaciones", "No hay avisos para este perfil.")}</div></div></section>`;
  }

  function renderAdminReports() {
    const attendance = data.attendance;
    const absences = attendance.filter((item) => item.status === "ABSENT").length;
    const justified = attendance.filter((item) => item.status === "JUSTIFIED").length;
    const published = data.activities.filter((item) => item.status === "PUBLISHED").length;
    return `${pageHead("Análisis institucional", "Reportes", "Indicadores calculados desde los registros actuales del prototipo.", `<button class="button ghost" data-action="print">${icon("file")} Imprimir</button><button class="button" data-action="export-data">${icon("download")} Respaldar JSON</button>`)}<section class="metrics">${metric("Asistencias", attendance.length, "Registros por clase", "check", "", "reports")}${metric("Ausencias", absences, `${justified} justificadas`, "alert", "red", "reports")}${metric("Notas publicadas", published, `${data.activities.length - published} en borrador`, "award", "teal", "subjects")}${metric("Citaciones", data.citations.length, `${data.citations.filter((item) => item.status === "PENDING").length} pendientes`, "calendar", "amber", "notifications")}</section><div class="grid-2"><section class="card"><div class="card-head"><div><h3>Asistencia por salón</h3><p>Porcentaje de registros presentes o justificados.</p></div></div><div class="card-body"><div class="list">${data.classes.map((schoolClass) => { const records = attendance.filter((item) => item.classId === schoolClass.id); const good = records.filter((item) => ["PRESENT", "JUSTIFIED"].includes(item.status)).length; const percentage = records.length ? Math.round(good / records.length * 100) : 0; return `<div><div class="row between small-text"><strong>${esc(D.classLabel(data, schoolClass.id))}</strong><span>${percentage}%</span></div><div class="progress"><span style="width:${percentage}%"></span></div></div>`; }).join("")}</div></div></section><section class="card"><div class="card-head"><div><h3>Estado académico</h3><p>Distribución de actividades.</p></div></div><div class="card-body"><div class="list"><div class="list-row"><span>Publicadas a acudientes</span><strong>${published}</strong></div><div class="list-row"><span>Borradores de calificación</span><strong>${data.activities.filter((item) => item.status === "DRAFT").length}</strong></div><div class="list-row"><span>Prórrogas vigentes</span><strong>${data.extensions.length}</strong></div><div class="list-row"><span>Trabajos grupales</span><strong>${data.groups.length}</strong></div></div></div></section></div>`;
  }

  function auditTimeline(items) {
    return `<div class="timeline">${items.map((item) => `<div class="timeline-row"><span class="timeline-time">${formatDate(item.at, true)}</span><span class="timeline-dot"></span><span class="timeline-copy"><strong>${esc(item.action)} · ${esc(item.actor)}</strong><span>${esc(item.detail)}</span></span></div>`).join("")}</div>`;
  }
  function renderAudit() {
    const query = D.normalize(state.filters.auditSearch || "");
    const items = data.audit.filter((item) => D.normalize(`${item.actor} ${item.action} ${item.detail}`).includes(query));
    return `${pageHead("Trazabilidad", "Auditoría", "Solo acciones relevantes para mantener un historial manejable.", "")}<div class="toolbar"><label class="field"><span>Buscar evento</span><input class="input" data-filter="auditSearch" value="${attr(state.filters.auditSearch || "")}" placeholder="Usuario, acción o registro"></label><span class="pill info">${items.length} eventos</span></div><section class="card"><div class="card-body">${items.length ? auditTimeline(items.slice(0, 200)) : empty("Sin resultados", "Cambie el criterio de búsqueda.")}</div></section>`;
  }

  function renderSettings() {
    const i = data.institution;
    return `${pageHead("Identidad", "Configuración", "Personaliza la institución sin alterar los registros académicos.", "")}<div class="grid-2"><section class="card"><div class="card-head"><div><h3>Identidad institucional</h3><p>Visible en todos los perfiles.</p></div></div><div class="card-body"><form data-inline-form="institution" class="form-grid"><label class="field wide"><span>Nombre del colegio</span><input class="input" name="name" value="${attr(i.name)}" required></label><label class="field wide"><span>Lema institucional</span><input class="input" name="motto" value="${attr(i.motto)}" required></label><label class="field"><span>Color principal</span><input class="input" type="color" name="primary" value="${attr(i.primary)}"></label><label class="field"><span>Color secundario</span><input class="input" type="color" name="secondary" value="${attr(i.secondary)}"></label><label class="field wide"><span>Logo (imagen)</span><input class="input" type="file" name="logo" accept="image/*"><span class="hint">Se guarda en este navegador para la demostración.</span></label><div class="wide"><button class="button" type="submit">Guardar identidad</button></div></form></div></section><section class="card"><div class="card-head"><div><h3>Datos de demostración</h3><p>Herramientas locales de respaldo y recuperación.</p></div></div><div class="card-body"><div class="stack"><button class="button ghost" data-action="export-data">${icon("download")} Descargar respaldo JSON</button><label class="button ghost" for="import-data">${icon("file")} Importar respaldo JSON</label><input id="import-data" class="sr-only" type="file" accept="application/json" data-action="import-data"><div class="notice danger">Restablecer elimina únicamente los cambios locales de esta instalación y vuelve a cargar la demostración inicial.</div><button class="button danger" data-action="reset-demo">${icon("refresh")} Restablecer datos de demostración</button></div></div></section></div>`;
  }

  function scheduleBoard(slots, editable) {
    const moment = scheduleMoment(slots);
    return `<div class="schedule-board">${D.DAYS.map((day) => `<div class="day-column ${day === moment.day ? "today" : ""}"><div class="day-title">${day}${day === moment.day ? " · Hoy" : ""}</div>${slots.filter((item) => item.day === day && item.active).sort((a, b) => a.start.localeCompare(b.start)).map((slot) => slot.kind === "BREAK" ? `<div class="schedule-slot break"><strong>Recreo</strong><small>${slot.start} – ${slot.end}</small></div>` : `<button class="schedule-slot ${moment.current?.id === slot.id ? "current" : ""}" data-action="schedule-slot" data-id="${slot.id}" ${editable ? `data-editable="true"` : ""} aria-label="${editable ? "Editar" : "Abrir"} ${attr(assignmentById(slot.assignmentId)?.name || "materia")}"><span class="pill info">${slot.start} – ${slot.end}</span><strong>${esc(assignmentById(slot.assignmentId)?.name || "Materia")}</strong><small>${esc(D.classLabel(data, slot.classId))} · ${esc(slot.room)}</small>${moment.current?.id === slot.id ? `<em>En curso ahora</em>` : ""}</button>`).join("")}</div>`).join("")}</div>`;
  }

  function teacherAssignments() {
    return data.assignments.filter((item) => item.teacherId === state.session.actorId && item.active);
  }
  function selectedTeacherAssignment() {
    const assignments = teacherAssignments();
    if (!state.selectedAssignmentId || !assignments.some((item) => item.id === state.selectedAssignmentId)) state.selectedAssignmentId = assignments[0]?.id || null;
    return assignmentById(state.selectedAssignmentId);
  }
  function assignmentToolbar(label = "Materia y salón") {
    const assignments = teacherAssignments();
    const selected = selectedTeacherAssignment();
    return `<div class="toolbar"><label class="field"><span>${esc(label)}</span><select class="select" data-state="selectedAssignmentId">${assignments.map((item) => option(item.id, `${item.name} · ${D.classLabel(data, item.classId)}`, selected?.id)).join("")}</select></label>${selected ? `<span class="pill info">${data.students.filter((item) => item.classId === selected.classId && item.active).length} estudiantes</span>` : ""}</div>`;
  }

  function renderTeacher() {
    const views = {
      dashboard: renderTeacherDashboard,
      classroom: renderClassroom,
      justifications: renderJustifications,
      subjects: renderTeacherSubjects,
      attendance: renderAttendance,
      activities: renderActivities,
      schedule: renderTeacherSchedule,
      groups: renderGroupsExtensions,
      observations: renderObservations,
      citations: renderCitations,
      invitations: renderInvitations,
      notifications: renderNotifications,
      reports: renderTeacherReports
    };
    return (views[state.view] || views.dashboard)();
  }

  function renderTeacherDashboard() {
    const assignments = teacherAssignments();
    const todayName = currentDayName();
    const displayDay = D.DAYS.includes(todayName) ? todayName : "Lunes";
    const todaySlots = data.schedule.filter((item) => item.teacherId === state.session.actorId && item.day === displayDay && item.kind === "CLASS" && item.active).sort((a, b) => a.start.localeCompare(b.start));
    const allSlots = data.schedule.filter((item) => item.teacherId === state.session.actorId && item.kind === "CLASS" && item.active);
    const drafts = data.activities.filter((item) => item.active !== false && assignments.some((assignment) => assignment.id === item.assignmentId) && item.status === "DRAFT");
    const pendingGrades = drafts.reduce((count, activity) => count + activity.grades.filter((grade) => grade.finalGrade == null).length, 0);
    return `${pageHead("Panel docente", `Hola, ${actorName().split(" ")[0]}`, "Tu próxima clase y las acciones importantes, sin buscar entre pantallas.", `<button class="button" data-action="new-activity">${icon("plus")} Crear actividad</button>`)}${!teacherById(state.session.actorId)?.photo ? `<button class="profile-nudge" data-action="edit-teacher-profile">${icon("camera")}<span><strong>Agrega tu fotografía</strong><small>Completa tu perfil para que estudiantes, acudientes y colegas te identifiquen fácilmente.</small></span><em>Completar →</em></button>` : ""}${liveClassCard(allSlots)}<section class="metrics">${metric("Materias", assignments.length, "Asignaciones activas", "book", "", "subjects")}${metric("Clases de hoy", todaySlots.length, displayDay, "calendar", "teal", "schedule")}${metric("Por publicar", drafts.length, `${pendingGrades} calificaciones pendientes`, "clipboard", "violet", "activities")}${metric("Citaciones pendientes", data.citations.filter((item) => item.teacherId === state.session.actorId && item.status === "PENDING").length, "Esperando respuesta", "bell", "amber", "citations")}</section><div class="grid-2"><section class="card"><div class="card-head"><div><h3>Ruta de ${displayDay.toLowerCase()}</h3><p>El horario usa la hora real del dispositivo.</p></div><button class="button ghost small" data-action="set-view" data-view="schedule">Editar horario</button></div><div class="card-body"><div class="list">${todaySlots.length ? todaySlots.map((slot) => `<div class="list-row interactive-row"><span class="list-row-main"><span class="metric-icon teal">${icon("clock")}</span><span><strong>${esc(assignmentById(slot.assignmentId)?.name)}</strong><small>${esc(D.classLabel(data, slot.classId))} · ${slot.start}–${slot.end} · ${esc(slot.room)}</small></span></span><button class="button small" data-action="open-attendance" data-assignment="${slot.assignmentId}">Asistencia</button></div>`).join("") : empty("Sin clases", "No hay clases programadas para este día.")}</div></div></section><section class="card"><div class="card-head"><div><h3>Actividad reciente</h3><p>Actualizaciones para este profesor.</p></div></div><div class="card-body">${auditTimeline(data.audit.filter((item) => item.actorId === state.session.actorId || item.detail.includes(actorName())).slice(0, 7))}</div></section></div>`;
  }

  function renderTeacherSubjects() {
    return `${pageHead("Docencia", "Mis materias", "La misma materia puede impartirse en varios salones sin duplicar estudiantes.", "")}<div class="subject-grid">${teacherAssignments().map((assignment) => { const activities = data.activities.filter((item) => item.assignmentId === assignment.id); const slots = data.schedule.filter((item) => item.assignmentId === assignment.id && item.kind === "CLASS").length; return `<article class="subject-card"><div class="subject-accent" style="background:${assignment.color}"></div><h3>${esc(assignment.name)}</h3><p>${esc(D.classLabel(data, assignment.classId))} · ${slots} horas académicas semanales</p><div class="subject-stats"><div class="subject-stat"><small>Actividades</small><strong>${activities.length}</strong></div><div class="subject-stat"><small>Publicadas</small><strong>${activities.filter((item) => item.status === "PUBLISHED").length}</strong></div><div class="subject-stat"><small>Asistencia</small><strong>5% fijo</strong></div><div class="subject-stat"><small>Exoneración</small><strong>${assignment.exemptionEnabled ? assignment.exemptionAverage.toFixed(1) : "No"}</strong></div></div><button class="button ghost" style="width:100%;margin-top:14px" data-action="open-activities" data-assignment="${assignment.id}">Gestionar materia</button></article>`; }).join("")}</div>`;
  }

  function renderAttendance() {
    const assignment = selectedTeacherAssignment();
    if (!assignment) return empty("Sin materias", "El Administrador debe asignar una materia a este profesor.");
    const students = data.students.filter((item) => item.classId === assignment.classId && item.active);
    const records = students.map((student) => data.attendance.find((item) => item.date === state.attendanceDate && item.assignmentId === assignment.id && item.studentId === student.id) || { studentId: student.id, status: "UNMARKED", time: null });
    const unmarked = records.filter((item) => item.status === "UNMARKED").length;
    return `${pageHead("Registro por clase", "Asistencia", "Al finalizar, los estudiantes no marcados cambian automáticamente a ausente.", `<button class="button secondary" data-action="mark-all-present">${icon("check")} Marcar pendientes presentes</button><button class="button warning" data-action="finalize-attendance" ${unmarked ? "" : "disabled"}>Finalizar clase (${unmarked})</button>`)}${assignmentToolbar()}<div class="toolbar"><label class="field"><span>Fecha</span><input class="input" type="date" data-state="attendanceDate" value="${state.attendanceDate}"></label><span class="pill info">${esc(D.classLabel(data, assignment.classId))}</span><span class="pill ${unmarked ? "danger" : "success"}">${unmarked} sin marcar</span></div><section class="attendance-grid">${students.map((student) => { const record = records.find((item) => item.studentId === student.id); const css = String(record.status).toLowerCase(); return `<article class="attendance-card ${css}"><div class="attendance-person">${avatarMarkup(student)}<div class="attendance-name">${esc(student.name)}</div></div><div class="attendance-status">${statusPill(record.status)}${record.time ? ` <span class="pill info">${record.time}</span>` : ""}</div><div class="attendance-actions"><button class="button small secondary" data-action="mark-attendance" data-student="${student.id}" data-status="PRESENT">Presente</button><button class="button small ghost" data-action="mark-attendance" data-student="${student.id}" data-status="LATE">Tardanza</button><button class="button small ghost" data-action="mark-attendance" data-student="${student.id}" data-status="EARLY">Retiro</button>${record.status !== "UNMARKED" ? `<button class="button small ghost" data-action="mark-attendance" data-student="${student.id}" data-status="UNMARKED">${icon("trash")} Borrar marca</button>` : ""}</div></article>`; }).join("")}</section>`;
  }

  function renderActivities() {
    const assignment = selectedTeacherAssignment();
    if (!assignment) return empty("Sin materias", "No hay asignaciones activas.");
    const activities = data.activities.filter((item) => item.assignmentId === assignment.id && item.active !== false).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const academicWeight = activities.reduce((sum, item) => sum + Number(item.weight), 0);
    const rulesOkay = activities.every((item) => item.type === "Examen final" ? Number(item.weight) === 25 : Number(item.weight) <= 25);
    return `${pageHead("Evaluación", "Actividades y notas", "Las notas permanecen en borrador hasta que el profesor publica la evaluación.", `<button class="button" data-action="new-activity">${icon("plus")} Crear actividad</button>`)}${assignmentToolbar()}<div class="notice ${academicWeight > 95 || !rulesOkay ? "danger" : "success"}" style="margin-bottom:16px">Esquema actual: asistencia 5% fija + actividades ${academicWeight}%. ${academicWeight === 95 && rulesOkay ? "Total validado: 100%." : `Pendiente por asignar: ${Math.max(0, 95 - academicWeight)}%.`}</div><section class="card"><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Actividad</th><th>Fecha</th><th>Peso</th><th>Entregas / notas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${activities.map((activity) => { const graded = activity.grades.filter((item) => item.finalGrade != null).length; const received = activity.grades.filter((item) => item.delivery === "RECEIVED").length; return `<tr><td><strong>${esc(activity.name)}</strong><div class="muted small-text">${esc(activity.type)} · ${activity.isGroup ? "Grupal" : "Individual"}</div></td><td>${formatDate(activity.dueDate)}<div class="muted small-text">Máxima ${formatDate(activity.maxDate)}</div></td><td>${activity.weight}%</td><td>${received} recibidos · ${graded} calificados</td><td>${statusPill(activity.status)}</td><td><div class="list-actions"><button class="button ghost small" data-action="grade-activity" data-id="${activity.id}">Calificar</button>${activity.status === "DRAFT" ? `<button class="button secondary small" data-action="publish-activity" data-id="${activity.id}">Publicar notas</button>` : ""}<button class="button ghost small" data-action="edit-activity" data-id="${activity.id}">${icon("edit")}</button><button class="button ghost small" data-action="delete-activity" data-id="${activity.id}">${icon("trash")}</button></div></td></tr>`; }).join("")}</tbody></table></div></div></section>`;
  }

  function renderTeacherSchedule() {
    const slots = data.schedule.filter((item) => item.teacherId === state.session.actorId && item.kind === "CLASS" && item.active);
    const missing = teacherAssignments().filter((assignment) => !slots.some((slot) => slot.assignmentId === assignment.id));
    const conflicts = scheduleConflicts().filter((item) => item.a.teacherId === state.session.actorId || item.b.teacherId === state.session.actorId);
    return `${pageHead("Organización docente", "Mi horario", "Agrega cada hora de tu materia en cada salón. Toca un bloque para editarlo, duplicarlo o borrarlo.", `<button class="button" data-action="new-schedule">${icon("plus")} Agregar hora de clase</button>`)}${liveClassCard(slots)}<div class="toolbar"><span class="pill info">${slots.length} horas académicas semanales</span><span class="pill ${conflicts.length ? "warning" : "success"}">${conflicts.length} conflictos</span><span class="pill ${missing.length ? "warning" : "success"}">${missing.length ? `${missing.length} materias sin horas` : "Cobertura completa"}</span></div>${missing.length ? `<div class="notice warning" style="margin-bottom:16px">Aún faltan horas para: ${missing.map((item) => `${item.name} · ${D.classLabel(data, item.classId)}`).join(", ")}.</div>` : ""}<section class="card"><div class="card-body">${scheduleBoard(slots, true)}</div></section>`;
  }

  function renderGroupsExtensions() {
    const assignments = teacherAssignments();
    const assignmentIds = assignments.map((item) => item.id);
    const activities = data.activities.filter((item) => item.active !== false && assignmentIds.includes(item.assignmentId));
    const activityIds = activities.map((item) => item.id);
    const groups = data.groups.filter((item) => activityIds.includes(item.activityId));
    const extensions = data.extensions.filter((item) => item.teacherId === state.session.actorId);
    return `${pageHead("Seguimiento", "Grupos y prórrogas", "Los grupos tienen código obligatorio y las prórrogas cuentan solo días de clase.", `<button class="button" data-action="new-group">${icon("plus")} Crear grupo</button><button class="button secondary" data-action="new-extension">${icon("clock")} Otorgar prórroga</button>`)}<div class="grid-2"><section class="card"><div class="card-head"><div><h3>Trabajos grupales</h3><p>Marcar recibido actualiza a todos sus integrantes.</p></div></div><div class="card-body"><div class="list">${groups.length ? groups.map((group) => `<div class="list-row"><span><strong>${esc(group.code)}</strong><small>${esc(activityById(group.activityId)?.name)} · ${group.memberIds.length} integrantes</small></span><div class="list-actions">${group.received ? statusPill("RECEIVED") : `<button class="button secondary small" data-action="receive-group" data-id="${group.id}">Marcar recibido</button>`}<button class="button ghost small" data-action="view-group" data-id="${group.id}">Gestionar</button><button class="button ghost small danger-text" data-action="delete-group" data-id="${group.id}">${icon("trash")}</button></div></div>`).join("") : empty("Sin grupos", "Cree una actividad grupal y registre sus integrantes.")}</div></div></section><section class="card"><div class="card-head"><div><h3>Prórrogas</h3><p>Con trazabilidad de motivo y fechas.</p></div></div><div class="card-body"><div class="list">${extensions.length ? extensions.map((extension) => `<div class="list-row"><span><strong>${esc(studentById(extension.studentId)?.name)}</strong><small>${esc(activityById(extension.activityId)?.name)} · hasta ${formatDate(extension.maxDate)} · ${extension.classDays} días de clase</small></span><div class="list-actions"><span class="pill warning">${extension.extensionPenalty.toFixed(1)} / día</span><button class="button ghost small danger-text" data-action="delete-extension" data-id="${extension.id}">${icon("trash")}</button></div></div>`).join("") : empty("Sin prórrogas", "No se han otorgado prórrogas en estas materias.")}</div></div></section></div>`;
  }

  function renderObservations() {
    const assignments = teacherAssignments();
    const classIds = [...new Set(assignments.map((item) => item.classId))];
    const observations = data.observations.filter((item) => item.teacherId === state.session.actorId).sort((a, b) => b.date.localeCompare(a.date));
    return `${pageHead("Seguimiento académico", "Observaciones", "Solo las importantes y urgentes se muestran como requiere atención.", `<button class="button" data-action="new-observation">${icon("plus")} Registrar observación</button>`)}<section class="card"><div class="card-body"><div class="list">${observations.length ? observations.map((item) => `<div class="list-row"><span class="list-row-main"><span class="dot ${item.kind === "URGENT" ? "red" : item.kind === "IMPORTANT" ? "amber" : item.kind === "POSITIVE" ? "teal" : "gray"}"></span><span><strong>${esc(studentById(item.studentId)?.name || "Estudiante")}</strong><small>${esc(item.text)} · ${formatDate(item.date)}</small></span></span><span class="pill ${item.kind === "URGENT" ? "danger" : item.kind === "IMPORTANT" ? "warning" : item.kind === "POSITIVE" ? "success" : "info"}">${esc(({ NORMAL: "Normal", IMPORTANT: "Importante", URGENT: "Urgente", POSITIVE: "Reconocimiento" })[item.kind])}</span><button class="button ghost small danger-text" data-action="delete-observation" data-id="${item.id}">${icon("trash")}</button></div>`).join("") : empty("Sin observaciones", `Puede registrar observaciones para ${classIds.length} salones.`)}</div></div></section>`;
  }

  function renderCitations() {
    const citations = data.citations.filter((item) => item.teacherId === state.session.actorId && item.status !== "ANNULLED").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return `${pageHead("Relación con acudientes", "Citaciones", "El acudiente responde únicamente si asistirá o no podrá asistir.", `<button class="button" data-action="new-citation">${icon("plus")} Crear citación</button>`)}<section class="card"><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Motivo</th><th>Fecha y hora</th><th>Respuesta</th><th>Contacto</th></tr></thead><tbody>${citations.map((citation) => { const student = studentById(citation.studentId); const guardian = guardianById(student?.guardianId); const wa = `https://wa.me/507${String(guardian?.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(`EduControl · ${student?.name} · ${student?.idNumber} · ${D.classLabel(data, student?.classId)}. Citación: ${citation.title}`)}`; return `<tr><td><strong>${esc(student?.name)}</strong><div class="muted small-text">${esc(D.classLabel(data, student?.classId))}</div></td><td>${esc(citation.title)}<div class="muted small-text">${esc(citation.reason)}</div></td><td>${formatDate(citation.date)} · ${citation.time}</td><td>${citation.status === "PENDING" ? statusPill("PENDING") : `<span class="pill ${citation.response === "YES" ? "success" : "danger"}">${citation.response === "YES" ? "Sí asistirá" : "No podrá asistir"}</span><div class="muted small-text">${formatDate(citation.responseAt, true)}</div>`}</td><td><div class="list-actions"><a class="button ghost small" href="${attr(wa)}" target="_blank" rel="noopener">${icon("phone")} WhatsApp</a><button class="button ghost small danger-text" data-action="delete-citation" data-id="${citation.id}">${icon("trash")}</button></div></td></tr>`; }).join("")}</tbody></table></div></div></section>`;
  }

  function renderClassroom() {
    const teacher = teacherById(state.session.actorId);
    const schoolClass = classById(teacher?.counselorClassId);
    if (!schoolClass) return `${pageHead("Profesor consejero", "Crea tu salón", "Configura el aula desde cero y luego registra estudiantes y acudientes.", "")}<section class="empty-state-action">${icon("school")}<h3>Tu salón todavía no está configurado</h3><p>El asistente te pedirá grado, sección, turno, aula y una fotografía opcional.</p><button class="button" data-action="counselor-create-class">${icon("plus")} Crear mi salón desde cero</button></section>`;
    const students = data.students.filter((item) => item.classId === schoolClass.id && item.active);
    return `${pageHead("Profesor consejero", "Mi salón", `${D.classLabel(data, schoolClass.id)} · ${schoolClass.level} · ${students.length} estudiantes`, `<button class="button secondary" data-action="set-view" data-view="invitations">${icon("send")} Invitar acudientes</button><button class="button" data-action="new-student" data-class="${schoolClass.id}">${icon("plus")} Agregar estudiante</button>`)}${schoolClass.image ? `<section class="classroom-cover" style="background-image:linear-gradient(90deg,rgba(8,39,65,.86),rgba(8,39,65,.32)),url('${attr(schoolClass.image)}')"><div><span>MI SALÓN</span><h3>${esc(D.classLabel(data, schoolClass.id))}</h3><p>${esc(schoolClass.room)} · ${esc(schoolClass.shift)}</p></div><button class="button ghost" data-action="edit-class" data-id="${schoolClass.id}">${icon("camera")} Cambiar datos o foto</button></section>` : ""}<section class="metrics">${metric("Estudiantes", students.length, "Matrícula activa", "student", "", "#student-list")}${metric("Materias", data.assignments.filter((item) => item.classId === schoolClass.id && item.active).length, "Plan académico", "book", "teal", "activities")}${metric("Ausencias", data.attendance.filter((item) => item.classId === schoolClass.id && item.status === "ABSENT").length, "Por revisar", "alert", "red", "attendance")}${metric("Justificaciones", data.justifications.filter((item) => students.some((student) => student.id === item.studentId) && item.status === "PENDING").length, "Pendientes de recibir", "shield", "amber", "justifications")}</section><section class="card" id="student-list"><div class="card-head"><div><h3>Estudiantes y acudientes</h3><p>Cada fila permite editar, invitar o remover conservando el historial.</p></div></div><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Acudiente</th><th>Invitación</th><th>Asistencia reciente</th><th>Acciones</th></tr></thead><tbody>${students.map((student) => { const recent = data.attendance.filter((item) => item.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date))[0]; const guardian = guardianById(student.guardianId); const invitation = data.invitations.find((item) => item.guardianId === student.guardianId && item.classId === schoolClass.id); return `<tr><td><div class="row">${avatarMarkup(student)}<div><strong>${esc(student.name)}</strong><div class="muted small-text">${student.gender === "F" ? "Femenino" : "Masculino"}</div></div></div></td><td>${guardian ? `<div class="row">${avatarMarkup(guardian)}<div><strong>${esc(guardian.name)}</strong><div class="muted small-text">${esc(guardian.email)}</div></div></div>` : "Sin acudiente"}</td><td>${invitation ? statusPill(invitation.status) : `<span class="pill warning">No preparada</span>`}</td><td>${recent ? `${statusPill(recent.status)} <span class="muted small-text">${formatDate(recent.date)}</span>` : "—"}</td><td><div class="list-actions"><button class="button secondary small" data-action="prepare-invitation" data-guardian="${student.guardianId}" data-class="${schoolClass.id}">${icon("send")} Invitar</button><button class="button ghost small" data-action="edit-student" data-id="${student.id}">${icon("edit")} Editar</button><button class="button ghost small" data-action="delete-student" data-id="${student.id}">${icon("trash")}</button></div></td></tr>`; }).join("")}</tbody></table></div></div></section>`;
  }

  function renderInvitations() {
    const teacher = teacherById(state.session.actorId); const schoolClass = classById(teacher?.counselorClassId);
    if (!schoolClass) return `${pageHead("Profesor consejero", "Invitaciones", "Primero crea tu salón.", `<button class="button" data-action="counselor-create-class">Crear salón</button>`)}${empty("Sin salón", "No hay acudientes a quienes invitar todavía.")}`;
    const students = data.students.filter((item) => item.classId === schoolClass.id && item.active);
    const guardianIds = [...new Set(students.map((item) => item.guardianId).filter(Boolean))];
    const invitations = data.invitations.filter((item) => item.classId === schoolClass.id);
    return `${pageHead("Acceso de las familias", "Invitaciones", "Prepara enlaces por WhatsApp o correo y controla quién ya activó su acceso.", `<button class="button" data-action="invite-all" data-class="${schoolClass.id}">${icon("send")} Preparar pendientes</button>`)}<section class="metrics">${metric("Acudientes", guardianIds.length, "Contactos del salón", "users", "", "#invitation-list")}${metric("Sin invitar", guardianIds.filter((id) => !invitations.some((item) => item.guardianId === id)).length, "Por preparar", "alert", "amber", "#invitation-list")}${metric("Enviadas", invitations.filter((item) => item.status === "SENT").length, "Esperando activación", "send", "violet", "#invitation-list")}${metric("Activadas", invitations.filter((item) => item.status === "ACTIVATED").length, "Acceso confirmado", "check", "teal", "#invitation-list")}</section><div class="notice warning" style="margin-bottom:16px"><strong>Importante:</strong> esta versión local prepara el mensaje y abre WhatsApp o correo. La sincronización real entre dispositivos requerirá el futuro servidor compartido; EduControl no simula un envío que no ocurrió.</div><section class="card" id="invitation-list"><div class="card-body"><div class="invitation-grid">${guardianIds.map((guardianId) => { const guardian = guardianById(guardianId); const invitation = invitations.find((item) => item.guardianId === guardianId); const linked = students.filter((item) => item.guardianId === guardianId); return `<article class="invitation-card"><div class="row">${avatarMarkup(guardian, "large")}<div><h3>${esc(guardian?.name)}</h3><p>${linked.map((item) => item.name).join(", ")}</p></div></div><div class="invitation-status">${invitation ? statusPill(invitation.status) : `<span class="pill warning">No preparada</span>`}${invitation?.sentAt ? `<small>${formatDate(invitation.sentAt, true)}</small>` : ""}</div><div class="list-actions"><button class="button secondary small" data-action="prepare-invitation" data-guardian="${guardianId}" data-class="${schoolClass.id}">${icon("send")} ${invitation ? "Abrir" : "Preparar"}</button>${invitation ? `<button class="button ghost small" data-action="delete-invitation" data-id="${invitation.id}">${icon("trash")} Borrar</button>` : ""}</div></article>`; }).join("")}</div></div></section>`;
  }

  function renderJustifications() {
    const teacher = teacherById(state.session.actorId);
    const students = data.students.filter((item) => item.classId === teacher?.counselorClassId);
    const justifications = data.justifications.filter((item) => students.some((student) => student.id === item.studentId)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return `${pageHead("Profesor consejero", "Justificaciones", "La aplicación registra el aviso; el documento físico debe recibirse y validarse.", "")}<section class="card"><div class="card-body"><div class="list">${justifications.length ? justifications.map((item) => { const student = studentById(item.studentId); return `<div class="list-row"><span class="list-row-main"><span class="metric-icon ${item.status === "PENDING" ? "amber" : "teal"}">${icon("shield")}</span><span><strong>${esc(student?.name)}</strong><small>${formatDate(item.date)} · ${esc(item.reason)}<br>Acudiente: ${esc(guardianById(item.guardianId)?.name)}</small></span></span><div class="list-actions">${statusPill(item.status)}${item.status === "PENDING" ? `<button class="button secondary small" data-action="validate-justification" data-id="${item.id}">Validar documento</button>` : `<span class="muted small-text">${formatDate(item.validatedAt, true)}</span>`}</div></div>`; }).join("") : empty("Sin justificaciones", "No hay documentos pendientes para este salón.")}</div></div></section>`;
  }

  function renderTeacherReports() {
    const assignments = teacherAssignments();
    const assignmentIds = assignments.map((item) => item.id);
    const attendance = data.attendance.filter((item) => assignmentIds.includes(item.assignmentId));
    const activities = data.activities.filter((item) => item.active !== false && assignmentIds.includes(item.assignmentId));
    return `${pageHead("Análisis docente", "Reportes", "Resumen calculado de las materias asignadas.", `<button class="button ghost" data-action="print">${icon("file")} Imprimir</button>`)}<section class="metrics">${metric("Materias", assignments.length, "Asignaciones activas", "book", "", "subjects")}${metric("Asistencias", attendance.length, `${attendance.filter((item) => item.status === "ABSENT").length} ausencias`, "check", "teal", "attendance")}${metric("Actividades", activities.length, `${activities.filter((item) => item.status === "DRAFT").length} borradores`, "clipboard", "violet", "activities")}${metric("Prórrogas", data.extensions.filter((item) => item.teacherId === state.session.actorId).length, "Casos individuales", "clock", "amber", "groups")}</section><section class="card"><div class="card-head"><div><h3>Materias y avance</h3><p>Peso académico evaluado y publicado.</p></div></div><div class="card-body"><div class="list">${assignments.map((assignment) => { const items = activities.filter((item) => item.assignmentId === assignment.id); const evaluated = items.filter((item) => item.status === "PUBLISHED").reduce((sum, item) => sum + item.weight, 0); return `<div><div class="row between small-text"><strong>${esc(assignment.name)} · ${esc(D.classLabel(data, assignment.classId))}</strong><span>${evaluated}% evaluado</span></div><div class="progress"><span style="width:${Math.min(100, evaluated)}%"></span></div></div>`; }).join("")}</div></div></section>`;
  }

  function guardianStudents() { return data.students.filter((item) => item.guardianId === state.session.actorId && item.active); }
  function selectedGuardianStudent() {
    const students = guardianStudents();
    if (!state.selectedStudentId || !students.some((item) => item.id === state.selectedStudentId)) state.selectedStudentId = students[0]?.id || null;
    return studentById(state.selectedStudentId);
  }

  function renderGuardian() {
    const student = selectedGuardianStudent();
    const guardian = guardianById(state.session.actorId);
    const hasOrigin = state.session.adminOrigin;
    const nav = [["dashboard", "Inicio"], ["subjects", "Materias"], ["schedule", "Horario"], ["attendance", "Asistencia"], ["notifications", "Notificaciones"], ["profile", "Perfil"]];
    const content = student ? renderGuardianView(student) : `<section class="card"><div class="card-body">${empty("Sin estudiantes vinculados", "Use Agregar estudiante en el perfil para iniciar una solicitud de vinculación.")}</div></section>`;
    app.innerHTML = `<div class="app-shell ${hasOrigin ? "has-admin-return" : ""}">${hasOrigin ? `<div class="admin-return"><button data-action="back-admin">${icon("arrow")} Volver al Administrador</button><span>Probando como acudiente: ${esc(guardian?.name)}</span></div>` : ""}<div class="mobile-overlay" data-action="close-menu"></div><aside class="sidebar"><div class="brand">${brandMark()}<div><strong>EduControl <span class="version-tag">v${D.APP_VERSION}</span></strong><span>${esc(data.institution.name)}</span></div></div><nav class="nav-group"><span class="nav-label">Acudiente</span>${nav.map(([view, label]) => `<button class="nav-item ${state.view === view ? "active" : ""}" data-action="set-view" data-view="${view}">${icon(({ dashboard: "home", subjects: "book", schedule: "calendar", attendance: "check", notifications: "bell", profile: "student" })[view])}<span>${label}</span></button>`).join("")}</nav><div class="sidebar-foot"><div class="actor-card">${avatarMarkup(guardian)}<span><strong>${esc(guardian?.name)}</strong><small>Acudiente</small></span></div><button class="logout-button" data-action="logout">Cerrar sesión de prueba</button></div></aside><main class="main"><header class="topbar"><div class="row"><button class="button ghost icon-only menu-button" data-action="toggle-menu">${icon("menu")}</button><div><h1>${esc(nav.find((item) => item[0] === state.view)?.[1] || "Inicio")}</h1><p>Año lectivo ${data.institution.activeYear} · Información del estudiante seleccionado</p></div></div><div class="top-actions"><button class="button ghost hide-mobile" data-action="install-app" ${deferredInstallPrompt ? "" : "disabled"}>Instalar app</button></div></header><div class="content">${student ? `<section class="guardian-hero"><div class="student-identity">${avatarMarkup(student, "hero-avatar")}<div><h2>${esc(student.name)}</h2><p>${esc(D.classLabel(data, student.classId))} · ${esc(classById(student.classId)?.level)}</p></div></div><select class="select" data-state="selectedStudentId" aria-label="Cambiar estudiante">${guardianStudents().map((item) => option(item.id, `${item.name} — ${D.classLabel(data, item.classId)}`, student.id)).join("")}</select></section>` : ""}<nav class="guardian-nav" aria-label="Navegación del acudiente">${nav.map(([view, label]) => `<button class="${state.view === view ? "active" : ""}" data-action="set-view" data-view="${view}">${label}</button>`).join("")}</nav>${content}</div></main></div>`;
  }

  function guardianSubjectStats(student, assignment) {
    const activities = data.activities.filter((item) => item.assignmentId === assignment.id && item.active !== false);
    const published = activities.filter((item) => item.status === "PUBLISHED" && item.grades.some((grade) => grade.studentId === student.id && grade.finalGrade != null));
    const performed = published.reduce((sum, item) => sum + Number(item.weight), 0);
    const achieved = published.reduce((sum, item) => {
      const grade = item.grades.find((record) => record.studentId === student.id);
      return sum + (Number(grade?.finalGrade || 0) / 5) * Number(item.weight);
    }, 0);
    const weightedGrade = performed ? published.reduce((sum, item) => {
      const grade = item.grades.find((record) => record.studentId === student.id);
      return sum + Number(grade?.finalGrade || 0) * Number(item.weight);
    }, 0) / performed : 0;
    const attendance = data.attendance.filter((item) => item.studentId === student.id && item.assignmentId === assignment.id);
    const perfect = attendance.every((item) => ["PRESENT", "JUSTIFIED"].includes(item.status));
    const eligible = assignment.exemptionEnabled && weightedGrade >= assignment.exemptionAverage && perfect && performed >= 70;
    return { activities, published, performed, achieved, average: weightedGrade, pending: Math.max(0, 95 - performed), perfect, eligible };
  }

  function renderGuardianView(student) {
    const views = {
      dashboard: renderGuardianDashboard,
      subjects: renderGuardianSubjects,
      schedule: renderGuardianSchedule,
      attendance: renderGuardianAttendance,
      notifications: renderGuardianNotifications,
      profile: renderGuardianProfile
    };
    return (views[state.view] || views.dashboard)(student);
  }

  function renderGuardianDashboard(student) {
    const recentAttendance = data.attendance.filter((item) => item.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));
    const newestStatus = recentAttendance[0]?.status || "UNMARKED";
    const assignments = data.assignments.filter((item) => item.classId === student.classId && item.active);
    const publishedActivities = data.activities.filter((item) => item.active !== false && assignments.some((assignment) => assignment.id === item.assignmentId) && item.status === "PUBLISHED" && item.grades.some((grade) => grade.studentId === student.id));
    const pendingTasks = data.activities.filter((item) => item.active !== false && assignments.some((assignment) => assignment.id === item.assignmentId) && item.grades.some((grade) => grade.studentId === student.id && ["PENDING", "NOT_DELIVERED"].includes(grade.delivery)) && item.dueDate >= D.dateIso(0));
    const overdue = data.activities.filter((item) => item.active !== false && assignments.some((assignment) => assignment.id === item.assignmentId) && item.grades.some((grade) => grade.studentId === student.id && grade.delivery === "NOT_DELIVERED") && item.dueDate < D.dateIso(0));
    const citations = data.citations.filter((item) => item.studentId === student.id && item.status === "PENDING");
    const auths = data.authorizations.filter((item) => item.studentId === student.id && !item.response);
    const upcoming = data.activities.filter((item) => item.active !== false && assignments.some((assignment) => assignment.id === item.assignmentId) && item.dueDate >= D.dateIso(0)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
    const attention = data.observations.filter((item) => item.studentId === student.id && ["IMPORTANT", "URGENT"].includes(item.kind));
    const todaySlots = data.schedule.filter((item) => item.classId === student.classId && item.day === currentDayName() && item.kind === "CLASS" && item.active);
    const lastEnd = todaySlots.sort((a, b) => b.end.localeCompare(a.end))[0]?.end;
    const readyAt = lastEnd ? clockMinutes(lastEnd) + Number(data.institution.dailySummaryDelayMinutes || 60) : null;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const summaryNotice = readyAt && nowMinutes < readyAt ? `<div class="summary-ready">${icon("clock")}<span><strong>Resumen en preparación</strong><small>Estará listo a las ${String(Math.floor(readyAt / 60)).padStart(2, "0")}:${String(readyAt % 60).padStart(2, "0")}, una hora después de la última clase.</small></span></div>` : `<div class="summary-ready ready">${icon("check")}<span><strong>Resumen actualizado</strong><small>Reúne lo importante sin enviar un aviso por cada materia.</small></span></div>`;
    return `${pageHead("Resumen del día", `Hola, ${guardianById(state.session.actorId)?.name.split(" ")[0]}`, "Toca cualquier cápsula para abrir su información.", "")}${!guardianById(state.session.actorId)?.photo ? `<button class="profile-nudge" data-action="edit-profile">${icon("camera")}<span><strong>Agrega tu fotografía</strong><small>Ayuda al colegio a identificarte en citaciones y actividades.</small></span><em>Completar →</em></button>` : ""}${summaryNotice}<section class="daily-summary"><button class="summary-capsule" data-action="set-view" data-view="attendance">${icon("check")}<strong>${statusPill(newestStatus)}</strong><span>Asistencia reciente</span><em>Ver detalle →</em></button><button class="summary-capsule" data-action="set-view" data-view="subjects">${icon("award")}<strong>${publishedActivities.length}</strong><span>Calificaciones publicadas</span><em>Abrir materias →</em></button><button class="summary-capsule" data-action="set-view" data-view="subjects">${icon("clipboard")}<strong>${pendingTasks.length}</strong><span>Tareas pendientes</span><em>Revisar ahora →</em></button><button class="summary-capsule" data-action="set-view" data-view="notifications">${icon("alert")}<strong>${citations.length + auths.length}</strong><span>Acciones pendientes</span><em>Responder →</em></button><button class="summary-capsule" data-action="set-view" data-view="schedule">${icon("calendar")}<strong>${upcoming.length}</strong><span>Próximas actividades</span><em>Ver agenda →</em></button></section><div class="grid-2"><section class="card"><div class="card-head"><div><h3>Próximas actividades</h3><p>Fechas del estudiante seleccionado.</p></div></div><div class="card-body"><div class="list">${upcoming.length ? upcoming.map((activity) => `<button class="list-row interactive-row" data-action="open-guardian-subject" data-id="${activity.assignmentId}"><span class="list-row-main"><span class="dot teal"></span><span><strong>${esc(activity.name)}</strong><small>${esc(assignmentById(activity.assignmentId)?.name)} · vence ${formatDate(activity.dueDate)}</small></span></span><span class="pill info">${activity.weight}% →</span></button>`).join("") : empty("Sin actividades próximas", "No hay fechas pendientes registradas.")}</div></div></section><section class="card"><div class="card-head"><div><h3>Requiere atención</h3><p>Urgencias, atrasos y acciones del acudiente.</p></div></div><div class="card-body"><div class="list">${overdue.map((activity) => `<button class="list-row interactive-row" data-action="open-guardian-subject" data-id="${activity.assignmentId}"><span class="list-row-main"><span class="dot red"></span><span><strong>Actividad no entregada</strong><small>${esc(activity.name)}</small></span></span><span>→</span></button>`).join("")}${attention.map((item) => `<button class="list-row interactive-row" data-action="set-view" data-view="notifications"><span class="list-row-main"><span class="dot ${item.kind === "URGENT" ? "red" : "amber"}"></span><span><strong>${item.kind === "URGENT" ? "Observación urgente" : "Observación importante"}</strong><small>${esc(item.text)}</small></span></span><span>→</span></button>`).join("")}${citations.length || auths.length ? `<button class="notice warning interactive-notice" data-action="set-view" data-view="notifications">Tiene ${citations.length + auths.length} respuesta(s) pendiente(s). Responder ahora →</button>` : ""}${!overdue.length && !attention.length && !citations.length && !auths.length ? empty("Todo al día", "No hay acciones que requieran atención.") : ""}</div></div></section></div>`;
  }

  function renderGuardianSubjects(student) {
    const assignments = data.assignments.filter((item) => item.classId === student.classId && item.active);
    if (state.selectedSubjectId && assignments.some((item) => item.id === state.selectedSubjectId)) {
      const assignment = assignmentById(state.selectedSubjectId);
      const stats = guardianSubjectStats(student, assignment);
      const message = !assignment.exemptionEnabled ? "Esta materia no utiliza exoneración." : stats.eligible ? "Cumple los requisitos para la exoneración del examen final." : stats.average >= assignment.exemptionAverage ? "Cumple el promedio requerido. El sistema verificará también su asistencia perfecta y el avance evaluado." : `Va bien, pero todavía no puede considerarse exonerado. Falta evaluar el ${D.oneDecimal(stats.pending)}% de la materia.`;
      return `${pageHead("Detalle por materia", assignment.name, `${D.classLabel(data, assignment.classId)} · Profesor: ${teacherById(assignment.teacherId)?.name}`, `<button class="button ghost" data-action="clear-subject">${icon("arrow")} Todas las materias</button>`)}<section class="metrics">${metric("Promedio actual", stats.performed ? D.oneDecimal(stats.average).toFixed(1) : "—", "Actividades evaluadas", "award", "", "#subject-activities")}${metric("Evaluación realizada", `${D.oneDecimal(stats.performed)}%`, "Esquema ya publicado", "clipboard", "teal", "#subject-activities")}${metric("Porcentaje conseguido", `${D.oneDecimal(stats.achieved)}%`, "Contribución acumulada", "report", "violet", "#subject-activities")}${metric("Evaluación pendiente", `${D.oneDecimal(stats.pending)}%`, "Sin proyección futura", "clock", "amber", "#subject-activities")}</section><div class="notice ${stats.eligible ? "success" : "warning"}" style="margin-bottom:16px"><strong>Exoneración:</strong> ${esc(message)} ${assignment.exemptionEnabled ? `Requisito: ${assignment.exemptionAverage.toFixed(1)} y asistencia perfecta.` : ""}</div><section class="card" id="subject-activities"><div class="card-head"><div><h3>Actividades</h3><p>Las notas solo aparecen después de que el profesor publica la evaluación.</p></div></div><div class="card-body flush"><div class="table-wrap"><table><thead><tr><th>Actividad</th><th>Peso</th><th>Nota</th><th>Contribución</th><th>Estado</th></tr></thead><tbody>${stats.activities.map((activity) => { const grade = activity.grades.find((item) => item.studentId === student.id); const visibleGrade = activity.status === "PUBLISHED" && grade?.finalGrade != null; const contribution = visibleGrade ? D.oneDecimal(grade.finalGrade / 5 * activity.weight) : null; const deliveryLabel = grade?.delivery === "RECEIVED" ? "Entregado" : grade?.delivery === "NOT_DELIVERED" ? "No entregado" : grade?.delivery === "FINAL_ZERO" ? "0.0 definitivo" : "Pendiente"; return `<tr><td><strong>${esc(activity.name)}</strong><div class="muted small-text">${formatDate(activity.dueDate)}${activity.isGroup ? " · Trabajo grupal" : ""}</div></td><td>${activity.weight}%</td><td>${visibleGrade ? D.oneDecimal(grade.finalGrade).toFixed(1) : "—"}</td><td>${contribution == null ? "—" : `${contribution.toFixed(1)}%`}</td><td><span class="pill ${grade?.delivery === "RECEIVED" ? "success" : grade?.delivery === "NOT_DELIVERED" ? "danger" : "warning"}">${deliveryLabel}</span>${activity.status !== "PUBLISHED" ? ` <span class="pill info">Nota no publicada</span>` : ""}</td></tr>`; }).join("")}</tbody></table></div></div></section>`;
    }
    return `${pageHead("Seguimiento académico", "Materias", "Resultados comprensibles, sin proyecciones de notas futuras.", "")}<div class="subject-grid">${assignments.map((assignment) => { const stats = guardianSubjectStats(student, assignment); return `<button class="subject-card" data-action="open-guardian-subject" data-id="${assignment.id}" style="text-align:left"><div class="subject-accent" style="background:${assignment.color}"></div><h3>${esc(assignment.name)}</h3><p>${esc(teacherById(assignment.teacherId)?.name)}</p><div class="subject-stats"><div class="subject-stat"><small>Promedio actual</small><strong>${stats.performed ? D.oneDecimal(stats.average).toFixed(1) : "—"}</strong></div><div class="subject-stat"><small>Evaluado</small><strong>${D.oneDecimal(stats.performed)}%</strong></div><div class="subject-stat"><small>Conseguido</small><strong>${D.oneDecimal(stats.achieved)}%</strong></div><div class="subject-stat"><small>Exoneración</small><strong>${stats.eligible ? "Elegible" : assignment.exemptionEnabled ? "En proceso" : "No aplica"}</strong></div></div></button>`; }).join("")}</div>`;
  }

  function renderGuardianSchedule(student) {
    const assignments = data.assignments.filter((item) => item.classId === student.classId && item.active);
    const slots = data.schedule.filter((item) => item.classId === student.classId && item.active);
    const scheduled = new Set(slots.filter((item) => item.kind === "CLASS").map((item) => item.assignmentId));
    const missing = assignments.filter((item) => !scheduled.has(item.id));
    return `${pageHead("Semana académica", "Horario consolidado", "Se forma automáticamente con las horas que cada profesor registra para este salón.", "")}${liveClassCard(slots, "guardian")}${missing.length ? `<div class="notice warning" style="margin-bottom:16px">Horario incompleto: faltan horas para ${missing.map((item) => item.name).join(", ")}.</div>` : `<div class="notice success" style="margin-bottom:16px">Horario completo: ${scheduled.size} materias con ${slots.filter((item) => item.kind === "CLASS").length} horas académicas semanales.</div>`}<section class="card"><div class="card-head"><div><h3>Semana de ${esc(student.name)}</h3><p>Toca cualquier materia para abrir sus actividades y calificaciones.</p></div></div><div class="card-body">${scheduleBoard(slots, false)}</div></section>`;
  }

  function renderGuardianAttendance(student) {
    const records = data.attendance.filter((item) => item.studentId === student.id).sort((a, b) => `${b.date}${b.updatedAt}`.localeCompare(`${a.date}${a.updatedAt}`));
    return `${pageHead("Seguimiento", "Asistencia", "Las justificaciones se informan aquí y el documento físico lo valida el consejero.", "")}<section class="metrics">${metric("Registros", records.length, "Clases registradas", "check", "", "#attendance-list")}${metric("Presente", records.filter((item) => item.status === "PRESENT").length, "Marcaciones normales", "student", "teal", "#attendance-list")}${metric("Tardanzas / retiros", records.filter((item) => ["LATE", "EARLY"].includes(item.status)).length, "Pueden afectar asistencia perfecta", "clock", "amber", "#attendance-list")}${metric("Ausencias", records.filter((item) => item.status === "ABSENT").length, `${records.filter((item) => item.status === "JUSTIFIED").length} justificadas`, "alert", "red", "#attendance-list")}</section><section class="card" id="attendance-list"><div class="card-body"><div class="list">${records.map((record) => { const assignment = assignmentById(record.assignmentId); const canJustify = record.status === "ABSENT" && !record.justificationPending; return `<div class="list-row"><span class="list-row-main"><span class="dot ${record.status === "ABSENT" ? "red" : record.status === "PRESENT" || record.status === "JUSTIFIED" ? "teal" : "amber"}"></span><span><strong>${formatDate(record.date)} · ${esc(assignment?.name)}</strong><small>${esc(teacherById(assignment?.teacherId)?.name || "Profesor")}${record.time ? ` · hora ${record.time}` : ""}</small></span></span><div class="list-actions">${statusPill(record.status)}${record.justificationPending ? `<span class="pill warning">Documento pendiente de recibir</span>` : ""}${canJustify ? `<button class="button ghost small" data-action="request-justification" data-id="${record.id}">Tengo justificación formal</button>` : ""}</div></div>`; }).join("")}</div></div></section>`;
  }

  function renderGuardianNotifications(student) {
    const guardian = guardianById(state.session.actorId);
    const citations = data.citations.filter((item) => item.studentId === student.id && item.status !== "ANNULLED").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const authorizations = data.authorizations.filter((item) => item.studentId === student.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    const notifications = data.notifications.filter((item) => item.targetId === guardian.id && (!item.studentId || item.studentId === student.id));
    return `${pageHead("Acciones y avisos", "Notificaciones", "Citaciones y autorizaciones guardan la respuesta con fecha y hora.", "")}<div class="grid-2"><section class="card"><div class="card-head"><div><h3>Citaciones</h3><p>No se solicita explicación ni reprogramación.</p></div></div><div class="card-body"><div class="list">${citations.length ? citations.map((item) => `<div class="list-row"><span><strong>${esc(item.title)}</strong><small>${esc(item.reason)} · ${formatDate(item.date)} a las ${item.time}<br>${esc(teacherById(item.teacherId)?.name)}</small></span><div class="list-actions">${item.status === "PENDING" ? `<button class="button secondary small" data-action="citation-response" data-id="${item.id}" data-response="YES">Sí, asistiré</button><button class="button ghost small" data-action="citation-response" data-id="${item.id}" data-response="NO">No podré asistir</button>` : `<span class="pill ${item.response === "YES" ? "success" : "danger"}">${item.response === "YES" ? "Sí, asistiré" : "No podré asistir"}</span>`}</div></div>`).join("") : empty("Sin citaciones", "No hay reuniones registradas.")}</div></div></section><section class="card"><div class="card-head"><div><h3>Autorizaciones</h3><p>La respuesta digital no sustituye requisitos físicos o legales.</p></div></div><div class="card-body"><div class="list">${authorizations.length ? authorizations.map((item) => `<div class="list-row"><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)} · vence ${formatDate(item.dueDate)}</small></span><div class="list-actions">${!item.response ? `<button class="button secondary small" data-action="authorization-response" data-id="${item.id}" data-response="AUTHORIZED">Autorizo</button><button class="button ghost small" data-action="authorization-response" data-id="${item.id}" data-response="DENIED">No autorizo</button>` : statusPill(item.response)}</div></div>`).join("") : empty("Sin autorizaciones", "No hay solicitudes activas.")}</div></div></section></div><section class="card" style="margin-top:18px"><div class="card-head"><div><h3>Avisos</h3><p>Resumen y eventos importantes.</p></div></div><div class="card-body"><div class="list">${notifications.length ? notifications.map((item) => `<div class="list-row"><span class="list-row-main"><span class="dot ${item.read ? "gray" : "teal"}"></span><span><strong>${esc(item.title)}</strong><small>${esc(item.message)} · ${formatDate(item.createdAt, true)}</small></span></span><div class="list-actions">${item.read ? "" : `<button class="button ghost small" data-action="read-notification" data-id="${item.id}">Leída</button>`}<button class="button ghost small danger-text" data-action="delete-notification" data-id="${item.id}">${icon("trash")}</button></div></div>`).join("") : empty("Sin avisos", "No hay novedades para este estudiante.")}</div></div></section>`;
  }

  function renderGuardianProfile(student) {
    const guardian = guardianById(state.session.actorId);
    const children = guardianStudents();
    return `${pageHead("Cuenta del acudiente", "Perfil y privacidad", "Cada campo adicional tiene una configuración independiente y reversible.", `<button class="button" data-action="edit-profile">${icon("edit")} Editar perfil</button><button class="button secondary" data-action="link-student">${icon("plus")} Agregar estudiante</button>`)}<div class="grid-2"><section class="card"><div class="card-head"><div><h3>Datos del acudiente</h3><p>Información visible para el colegio.</p></div></div><div class="card-body"><div class="row">${guardian.photo ? `<img class="profile-photo" src="${attr(guardian.photo)}" alt="Foto de ${attr(guardian.name)}">` : `<span class="avatar" style="width:62px;height:62px;font-size:1rem">${initials(guardian.name)}</span>`}<div><h3 style="margin:0">${esc(guardian.name)}</h3><p class="muted small-text">${esc(guardian.relationship)} · ${esc(guardian.residence || "Residencia no indicada")}</p></div></div><div class="list" style="margin-top:16px"><div class="list-row"><span>Teléfono</span><strong>${esc(guardian.phone)}</strong></div><div class="list-row"><span>WhatsApp</span><strong>${esc(guardian.whatsapp)}</strong></div><div class="list-row"><span>Correo</span><strong>${esc(guardian.email)}</strong></div></div><h3>Mis estudiantes</h3><div class="list">${children.map((item) => `<button class="list-row" data-action="select-child" data-id="${item.id}"><span class="list-row-main"><span class="avatar">${initials(item.name)}</span><span><strong>${esc(item.name)}</strong><small>${esc(D.classLabel(data, item.classId))}</small></span></span><span class="pill ${item.id === student.id ? "success" : "info"}">${item.id === student.id ? "Seleccionado" : "Ver"}</span></button>`).join("")}</div></div></section><section class="card"><div class="card-head"><div><h3>Controles de privacidad</h3><p>La cédula del estudiante nunca se muestra a otros acudientes.</p></div></div><div class="card-body">${Object.entries(guardian.privacy).map(([field, config]) => `<div class="privacy-row"><div><strong>${esc(({ phone: "Teléfono", whatsapp: "WhatsApp", email: "Correo", residence: "Residencia" })[field])}</strong><div class="muted small-text">Publicar: ${config.published ? "Sí" : "No"}</div></div><button class="switch ${config.published ? "on" : ""}" data-action="privacy-toggle" data-field="${field}" aria-label="Cambiar publicación"></button><select class="select" data-privacy-audience="${field}">${["Otros acudientes del mismo grupo", "Profesores autorizados", "Colegio solamente", "Nadie"].map((item) => option(item, item, config.audience)).join("")}</select></div>`).join("")}</div></section></div>`;
  }

  function openViewAs(role = null) {
    const selectedRole = role || "TEACHER";
    const people = selectedRole === "TEACHER" ? data.teachers.filter((item) => item.active) : selectedRole === "COUNSELOR" ? data.teachers.filter((item) => item.active && item.counselorClassId) : data.guardians.filter((item) => item.active);
    showModal("Ver como", `<div class="toolbar"><button type="button" class="button ${selectedRole === "TEACHER" ? "" : "ghost"}" data-action="admin-view-role" data-role="TEACHER">Profesor</button><button type="button" class="button ${selectedRole === "COUNSELOR" ? "" : "ghost"}" data-action="admin-view-role" data-role="COUNSELOR">Consejero</button><button type="button" class="button ${selectedRole === "GUARDIAN" ? "" : "ghost"}" data-action="admin-view-role" data-role="GUARDIAN">Acudiente</button></div><div class="list">${people.map((person) => `<button type="button" class="list-row" data-action="impersonate" data-role="${selectedRole}" data-id="${person.id}"><span class="list-row-main"><span class="avatar">${initials(person.name)}</span><span><strong>${esc(person.name)}</strong><small>${selectedRole === "GUARDIAN" ? `${data.students.filter((item) => item.guardianId === person.id).length} estudiante(s)` : selectedRole === "COUNSELOR" ? `Consejero ${D.classLabel(data, person.counselorClassId)}` : person.specialty}</small></span></span><span class="pill info">Entrar</span></button>`).join("")}</div>`, "", null);
  }

  function openClassroomWizard() {
    const teacher = teacherById(state.session.actorId);
    showModal("Crear mi salón desde cero", `${formSteps(["Aula", "Imagen", "Estudiantes", "Invitaciones"], 2)}<div class="form-grid"><label class="field"><span>Grado</span><input class="input" name="grade" placeholder="Ej. 8.º" required></label><label class="field"><span>Sección</span><input class="input" name="section" placeholder="A" maxlength="3" required></label><label class="field"><span>Nivel</span><select class="select" name="level">${["Primaria", "Premedia", "Media"].map((value) => option(value, value, "Premedia")).join("")}</select></label><label class="field"><span>Turno</span><select class="select" name="shift">${["Matutino", "Vespertino"].map((value) => option(value, value, "Matutino")).join("")}</select></label><label class="field wide"><span>Nombre o número del aula</span><input class="input" name="room" placeholder="Ej. Aula 8A" required></label>${photoPicker("", "Fotografía del salón (opcional)")}<div class="notice success wide">Después de guardar podrás agregar estudiantes uno por uno y preparar invitaciones para sus acudientes.</div></div>`, "Crear salón", (form) => {
      const grade = form.get("grade").trim(); const section = form.get("section").trim().toUpperCase();
      if (data.classes.some((item) => item.active && D.normalize(item.grade) === D.normalize(grade) && D.normalize(item.section) === D.normalize(section))) return showFormError("Ya existe un salón con ese grado y sección."), false;
      const schoolClass = { id: D.uid("c"), grade, section, level: form.get("level"), shift: form.get("shift"), room: form.get("room").trim(), counselorId: teacher.id, image: "", active: true };
      data.classes.push(schoolClass); teacher.counselorClassId = schoolClass.id;
      const photo = form.get("photo");
      const finish = (value) => { if (value) schoolClass.image = value; D.addAudit(data, teacher.id, "CREÓ SU SALÓN", `${grade} ${section} · ${schoolClass.room}`, "IMPORTANT"); persist("Salón creado. Ahora puedes agregar estudiantes e invitar acudientes."); render(); };
      if (photo && photo.size) saveCompressedPhoto(photo, finish); else finish(null);
      return true;
    });
  }

  function ensureInvitation(guardianId, classId) {
    let invitation = data.invitations.find((item) => item.guardianId === guardianId && item.classId === classId);
    if (!invitation) {
      invitation = { id: D.uid("inv"), guardianId, classId, studentIds: data.students.filter((item) => item.guardianId === guardianId && item.classId === classId).map((item) => item.id), code: `EDU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: "PENDING", channel: null, preparedAt: D.nowIso(), sentAt: null, acceptedAt: null, createdBy: state.session.actorId };
      data.invitations.unshift(invitation);
    }
    return invitation;
  }

  function invitationDetails(invitation) {
    const guardian = guardianById(invitation.guardianId); const schoolClass = classById(invitation.classId);
    const base = typeof location !== "undefined" && location.href ? location.href.split("#")[0] : "https://usuario.github.io/educontrol/";
    const link = `${base}#invitacion=${encodeURIComponent(invitation.code)}`;
    const message = `Hola ${guardian?.name}. ${data.institution.name} te invita a usar EduControl para consultar la información de tus estudiantes de ${D.classLabel(data, schoolClass?.id)}. Abre ${link} y usa el código ${invitation.code}.`;
    return { guardian, schoolClass, link, message };
  }

  function openInvitation(guardianId, classId) {
    const invitation = ensureInvitation(guardianId, classId); const detail = invitationDetails(invitation);
    persist();
    const whatsapp = `https://wa.me/507${String(detail.guardian?.whatsapp || detail.guardian?.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(detail.message)}`;
    const email = `mailto:${encodeURIComponent(detail.guardian?.email || "")}?subject=${encodeURIComponent(`Invitación a EduControl · ${data.institution.name}`)}&body=${encodeURIComponent(detail.message)}`;
    showModal("Invitar acudiente", `${formSteps(["Preparar", "Enviar", "Activar"], invitation.status === "ACTIVATED" ? 3 : invitation.status === "SENT" ? 2 : 1)}<div class="invitation-preview"><div class="row">${avatarMarkup(detail.guardian, "large")}<div><h3>${esc(detail.guardian?.name)}</h3><p>${esc(detail.guardian?.email)} · ${esc(detail.guardian?.whatsapp)}</p></div></div><div class="invite-code"><small>CÓDIGO PERSONAL</small><strong>${esc(invitation.code)}</strong></div><p>${esc(detail.message)}</p></div><div class="invite-actions"><a class="button secondary" href="${attr(whatsapp)}" target="_blank" rel="noopener" data-action="send-invitation" data-id="${invitation.id}" data-channel="WHATSAPP">${icon("phone")} Abrir WhatsApp</a><a class="button" href="${attr(email)}" data-action="send-invitation" data-id="${invitation.id}" data-channel="EMAIL">${icon("send")} Abrir correo</a><button type="button" class="button ghost" data-action="copy-invitation" data-id="${invitation.id}">${icon("copy")} Copiar invitación</button></div><div class="notice warning" style="margin-top:16px">En GitHub Pages el mensaje se prepara, pero el envío ocurre en WhatsApp o en tu correo. El estado «activada» se podrá sincronizar automáticamente cuando EduControl tenga una base de datos compartida.</div>${state.session.adminOrigin || state.session.role === "ADMIN" ? `<button type="button" class="button ghost small" style="margin-top:12px" data-action="activate-invitation" data-id="${invitation.id}">Simular activación para probar</button>` : ""}`, "", null);
  }

  function openUserForm(type, id = null) {
    const collection = type === "teachers" ? data.teachers : data.guardians;
    const item = collection.find((entry) => entry.id === id) || {};
    const isTeacher = type === "teachers";
    showModal(`${id ? "Editar" : "Crear"} ${isTeacher ? "profesor" : "acudiente"}`, `${formSteps(["Fotografía", "Datos", "Función"], 3)}<div class="form-grid">${photoPicker(item.photo || "")}<label class="field wide"><span>Nombre completo</span><input class="input" name="name" value="${attr(item.name || "")}" required></label><label class="field"><span>Correo</span><input class="input" type="email" name="email" value="${attr(item.email || "")}" required></label><label class="field"><span>Teléfono</span><input class="input" name="phone" value="${attr(item.phone || "")}" required></label>${isTeacher ? `<label class="field wide"><span>Especialidad</span><input class="input" name="specialty" value="${attr(item.specialty || "")}" required></label><label class="field wide"><span>Salón de consejería (opcional)</span><select class="select" name="counselorClassId">${option("", "No es consejero", item.counselorClassId || "")}${data.classes.filter((schoolClass) => schoolClass.active).map((schoolClass) => option(schoolClass.id, D.classLabel(data, schoolClass.id), item.counselorClassId)).join("")}</select></label>` : `<label class="field"><span>WhatsApp</span><input class="input" name="whatsapp" value="${attr(item.whatsapp || item.phone || "")}" required></label><label class="field"><span>Parentesco</span><select class="select" name="relationship">${["Madre", "Padre", "Acudiente", "Tutor legal"].map((value) => option(value, value, item.relationship)).join("")}</select></label><label class="field wide"><span>Residencia (opcional)</span><input class="input" name="residence" value="${attr(item.residence || "")}"></label>`}</div>`, "Guardar perfil", (form) => {
      const name = form.get("name").trim();
      if (!name) return showFormError("Escriba el nombre completo."), false;
      const values = isTeacher ? { name, email: form.get("email"), phone: form.get("phone"), specialty: form.get("specialty"), counselorClassId: form.get("counselorClassId") || null, active: true } : { name, email: form.get("email"), phone: form.get("phone"), whatsapp: form.get("whatsapp"), relationship: form.get("relationship"), residence: form.get("residence"), active: true };
      let record = item;
      if (id) Object.assign(record, values);
      else if (isTeacher) { record = { id: D.uid("t"), ...values, photo: "", createdAt: D.dateIso(0) }; data.teachers.push(record); }
      else { record = { id: D.uid("g"), ...values, photo: "", privacy: { phone: { published: false, audience: "Colegio solamente" }, whatsapp: { published: true, audience: "Profesores autorizados" }, email: { published: false, audience: "Nadie" }, residence: { published: false, audience: "Nadie" } } }; data.guardians.push(record); }
      const photo = form.get("photo");
      const finish = (value) => { if (value) record.photo = value; D.addAudit(data, state.session.actorId, id ? "MODIFICÓ USUARIO" : "CREÓ USUARIO", name, "IMPORTANT"); persist("Perfil guardado con éxito."); render(); };
      if (photo && photo.size) saveCompressedPhoto(photo, finish); else finish(null);
      return true;
    });
  }

  function openTeacherProfile() {
    const teacher = teacherById(state.session.actorId);
    showModal("Completar mi perfil", `${formSteps(["Fotografía", "Contacto", "Especialidad"], 3)}<div class="form-grid">${photoPicker(teacher.photo || "")}<label class="field wide"><span>Nombre completo</span><input class="input" name="name" value="${attr(teacher.name)}" required></label><label class="field"><span>Correo</span><input class="input" type="email" name="email" value="${attr(teacher.email)}" required></label><label class="field"><span>Teléfono</span><input class="input" name="phone" value="${attr(teacher.phone)}" required></label><label class="field wide"><span>Especialidad</span><input class="input" name="specialty" value="${attr(teacher.specialty)}" required></label><div class="notice wide">Las asignaciones y el salón de consejería solo pueden modificarse desde la administración.</div></div>`, "Guardar perfil", (form) => {
      Object.assign(teacher, { name: form.get("name").trim(), email: form.get("email"), phone: form.get("phone"), specialty: form.get("specialty") }); const photo = form.get("photo");
      const finish = (value) => { if (value) teacher.photo = value; D.addAudit(data, teacher.id, "ACTUALIZÓ SU PERFIL", teacher.name, "INFO"); persist("Perfil docente actualizado."); render(); };
      if (photo && photo.size) saveCompressedPhoto(photo, finish); else finish(null);
      return true;
    });
  }

  function openStudentForm(id = null, forcedClassId = null) {
    const item = data.students.find((student) => student.id === id) || {};
    showModal(`${id ? "Editar" : "Crear"} estudiante`, `${formSteps(["Foto", "Identidad", "Salón", "Acudiente"], 4)}<div class="form-grid">${photoPicker(item.photo || "", "Fotografía del estudiante (opcional)")}<label class="field wide"><span>Nombre completo</span><input class="input" name="name" value="${attr(item.name || "")}" required></label><label class="field"><span>Género</span><select class="select" name="gender">${option("F", "Femenino", item.gender)}${option("M", "Masculino", item.gender)}</select></label><label class="field"><span>Fecha de nacimiento</span><input class="input" type="date" name="birthDate" value="${attr(item.birthDate || "")}" required></label><label class="field"><span>Tipo de identificación</span><select class="select" name="idType">${option("Cédula", "Cédula", item.idType)}${option("Pasaporte", "Pasaporte", item.idType)}</select></label><label class="field"><span>Cédula o pasaporte</span><input class="input" name="idNumber" value="${attr(item.idNumber || "")}" required></label><label class="field"><span>Salón</span><select class="select" name="classId" required>${data.classes.filter((entry) => entry.active).map((entry) => option(entry.id, D.classLabel(data, entry.id), item.classId || forcedClassId)).join("")}</select></label><label class="field"><span>Acudiente principal</span><select class="select" name="guardianId" required>${data.guardians.filter((entry) => entry.active).map((entry) => option(entry.id, entry.name, item.guardianId)).join("")}</select></label><div class="notice wide">La identificación es privada y se utiliza como comprobación definitiva de vinculación.</div></div>`, "Guardar estudiante", (form) => {
      const name = form.get("name").trim(); const idNumber = form.get("idNumber").trim();
      if (data.students.some((student) => student.id !== id && D.normalize(student.idNumber) === D.normalize(idNumber))) return showFormError("Ya existe un estudiante con esta identificación."), false;
      const values = { name, gender: form.get("gender"), birthDate: form.get("birthDate"), idType: form.get("idType"), idNumber, classId: form.get("classId"), guardianId: form.get("guardianId"), active: true };
      let record = item;
      if (id) Object.assign(record, values); else { record = { id: D.uid("s"), ...values, photo: "" }; data.students.push(record); }
      const photo = form.get("photo");
      const finish = (value) => { if (value) record.photo = value; D.addAudit(data, state.session.actorId, id ? "MODIFICÓ ESTUDIANTE" : "CREÓ ESTUDIANTE", `${name} · ${D.classLabel(data, values.classId)}`, "IMPORTANT"); persist("Estudiante guardado."); render(); };
      if (photo && photo.size) saveCompressedPhoto(photo, finish); else finish(null);
      return true;
    });
  }

  function openClassForm(id = null) {
    const item = data.classes.find((entry) => entry.id === id) || {};
    const counselorLocked = state.session.role === "COUNSELOR";
    showModal(`${id ? "Editar" : "Crear"} salón`, `${formSteps(["Aula", "Imagen", "Consejero"], 3)}<div class="form-grid">${photoPicker(item.image || "", "Fotografía del salón (opcional)")}<label class="field"><span>Grado</span><input class="input" name="grade" value="${attr(item.grade || "")}" placeholder="Ej. 8.º" required></label><label class="field"><span>Sección</span><input class="input" name="section" value="${attr(item.section || "")}" maxlength="3" required></label><label class="field"><span>Nivel</span><select class="select" name="level">${["Primaria", "Premedia", "Media"].map((value) => option(value, value, item.level)).join("")}</select></label><label class="field"><span>Turno</span><select class="select" name="shift">${["Matutino", "Vespertino"].map((value) => option(value, value, item.shift)).join("")}</select></label><label class="field"><span>Aula</span><input class="input" name="room" value="${attr(item.room || "")}" required></label><label class="field"><span>Profesor consejero</span><select class="select" name="counselorId" ${counselorLocked ? "disabled" : ""}>${data.teachers.filter((entry) => entry.active).map((entry) => option(entry.id, entry.name, counselorLocked ? state.session.actorId : item.counselorId)).join("")}</select></label></div>`, "Guardar salón", (form) => {
      const values = { grade: form.get("grade"), section: form.get("section").toUpperCase(), level: form.get("level"), shift: form.get("shift"), room: form.get("room"), counselorId: counselorLocked ? state.session.actorId : form.get("counselorId") };
      if (id) Object.assign(item, values); else { values.id = D.uid("c"); values.image = ""; values.active = true; data.classes.push(values); }
      const counselor = teacherById(values.counselorId); if (counselor) counselor.counselorClassId = id || values.id;
      const record = id ? item : values; const photo = form.get("photo");
      const finish = (value) => { if (value) record.image = value; D.addAudit(data, state.session.actorId, id ? "MODIFICÓ SALÓN" : "CREÓ SALÓN", `${values.grade} ${values.section}`, "IMPORTANT"); persist("Salón guardado."); render(); };
      if (photo && photo.size) saveCompressedPhoto(photo, finish); else finish(null);
      return true;
    });
  }

  function openAssignmentForm(id = null) {
    const item = data.assignments.find((entry) => entry.id === id) || {};
    showModal(`${id ? "Editar asignación" : "Asignar materia"}`, `<div class="form-grid"><label class="field"><span>Materia</span><select class="select" name="catalogId">${data.subjectCatalog.filter((entry) => entry.active).map((entry) => option(entry.id, entry.name, item.catalogId)).join("")}</select></label><label class="field"><span>Salón</span><select class="select" name="classId">${data.classes.filter((entry) => entry.active).map((entry) => option(entry.id, D.classLabel(data, entry.id), item.classId || state.filters.subjectClass)).join("")}</select></label><label class="field wide"><span>Profesor</span><select class="select" name="teacherId">${data.teachers.filter((entry) => entry.active).map((entry) => option(entry.id, `${entry.name} · ${entry.specialty}`, item.teacherId)).join("")}</select></label><label class="field"><span>Penalización por día de clase</span><input class="input" type="number" min="0" max="2" step="0.1" name="latePenalty" value="${item.latePenalty ?? 0.5}"></label><label class="field"><span>Promedio de exoneración</span><input class="input" type="number" min="1" max="5" step="0.1" name="exemptionAverage" value="${item.exemptionAverage ?? 4.5}"></label><label class="checkbox-row wide"><input type="checkbox" name="exemptionEnabled" ${item.exemptionEnabled !== false ? "checked" : ""}> Permitir exoneración con asistencia perfecta</label><div class="notice wide">Asistencia = 5% fijo. Un reemplazo de profesor no borra el historial de esta asignación.</div></div>`, "Guardar asignación", (form) => {
      const catalog = data.subjectCatalog.find((entry) => entry.id === form.get("catalogId"));
      const values = { catalogId: form.get("catalogId"), name: catalog.name, classId: form.get("classId"), teacherId: form.get("teacherId"), latePenalty: Number(form.get("latePenalty")), exemptionAverage: Number(form.get("exemptionAverage")), exemptionEnabled: form.get("exemptionEnabled") === "on", attendanceWeight: 5, active: true };
      if (!id && data.assignments.some((entry) => entry.classId === values.classId && entry.catalogId === values.catalogId && entry.active)) return showFormError("Esta materia ya está asignada al salón."), false;
      if (id) {
        const oldTeacher = item.teacherId; Object.assign(item, values);
        if (oldTeacher !== values.teacherId) D.addAudit(data, state.session.actorId, "CAMBIÓ PROFESOR", `${values.name} · ${D.classLabel(data, values.classId)}: ${teacherById(oldTeacher)?.name} → ${teacherById(values.teacherId)?.name}. Historial heredado.`, "IMPORTANT");
        else D.addAudit(data, state.session.actorId, "MODIFICÓ CONFIGURACIÓN DE MATERIA", `${values.name} · ${D.classLabel(data, values.classId)}`, "IMPORTANT");
      } else data.assignments.push({ id: D.uid("as"), color: "#2b73c2", trimester: data.institution.currentTrimester, ...values });
      persist("Asignación guardada; el historial permanece intacto."); return true;
    });
  }

  function openScheduleForm(id = null, copyFrom = null) {
    const source = copyFrom ? data.schedule.find((entry) => entry.id === copyFrom) : null;
    const item = data.schedule.find((entry) => entry.id === id) || (source ? { ...source, id: null } : {});
    const allowedAssignments = state.session.role === "ADMIN" ? data.assignments.filter((entry) => entry.active) : teacherAssignments();
    showModal(`${id ? "Editar" : "Agregar"} clase al horario`, `${formSteps(["Materia", "Día", "Hora", "Aula"], 4)}<div class="form-grid"><label class="field wide"><span>Mi materia y salón</span><select class="select" name="assignmentId">${allowedAssignments.map((entry) => option(entry.id, `${entry.name} · ${D.classLabel(data, entry.classId)}`, item.assignmentId || state.selectedAssignmentId)).join("")}</select></label><label class="field"><span>Día</span><select class="select" name="day">${D.DAYS.map((day) => option(day, day, item.day)).join("")}</select></label><label class="field"><span>Aula</span><input class="input" name="room" value="${attr(item.room || classById(assignmentById(item.assignmentId)?.classId)?.room || "")}" required></label><label class="field"><span>Inicio</span><input class="input" type="time" name="start" value="${attr(item.start || "07:00")}" required></label><label class="field"><span>Fin</span><input class="input" type="time" name="end" value="${attr(item.end || "07:45")}" required></label><div class="notice warning wide">Si existe un cruce de profesor o de salón, EduControl avisará a los involucrados pero permitirá guardar.</div>${id ? `<div class="wide list-actions left"><button type="button" class="button ghost" data-action="duplicate-schedule" data-id="${item.id}">${icon("copy")} Duplicar hora</button><button type="button" class="button ghost danger-text" data-action="delete-schedule" data-id="${item.id}">${icon("trash")} Eliminar hora</button></div>` : ""}</div>`, "Guardar horario", (form) => {
      const assignment = assignmentById(form.get("assignmentId"));
      if (!assignment) return showFormError("Seleccione una materia."), false;
      if (form.get("start") >= form.get("end")) return showFormError("La hora final debe ser posterior a la inicial."), false;
      const values = { assignmentId: assignment.id, classId: assignment.classId, teacherId: assignment.teacherId, day: form.get("day"), start: form.get("start"), end: form.get("end"), room: form.get("room"), kind: "CLASS", active: true };
      const conflicts = data.schedule.filter((slot) => slot.id !== id && slot.active && slot.kind === "CLASS" && slot.day === values.day && slot.start < values.end && values.start < slot.end && (slot.teacherId === values.teacherId || slot.classId === values.classId));
      if (id) Object.assign(item, values); else data.schedule.push({ id: D.uid("sch"), ...values });
      D.addAudit(data, state.session.actorId, id ? "MODIFICÓ HORARIO" : "AGREGÓ HORARIO", `${assignment.name} · ${D.classLabel(data, assignment.classId)} · ${values.day} ${values.start}`, "IMPORTANT");
      if (conflicts.length) {
        const teacherIds = [...new Set([assignment.teacherId, ...conflicts.map((slot) => slot.teacherId)].filter(Boolean))];
        teacherIds.forEach((teacherId) => D.addNotification(data, "TEACHER", teacherId, "SCHEDULE", "Conflicto de horario", `${values.day} ${values.start}–${values.end}: ${assignment.name} · ${D.classLabel(data, values.classId)} tiene ${conflicts.length} cruce(s).`));
        D.addNotification(data, "ADMIN", "admin", "SCHEDULE", "Conflicto de horario por revisar", `${values.day} ${values.start}: ${assignment.name} · ${D.classLabel(data, values.classId)}.`);
        persist("Horario guardado con alerta para los profesores y la administración.", "error");
      } else persist("Horario guardado.");
      return true;
    });
  }

  function openActivityForm(id = null) {
    const assignment = id ? assignmentById(activityById(id)?.assignmentId) : selectedTeacherAssignment();
    const item = activityById(id) || {};
    if (!assignment) return toast("Seleccione una materia.", "error");
    showModal(`${id ? "Editar" : "Crear"} actividad`, `<div class="form-grid"><label class="field wide"><span>Materia y salón</span><input class="input" value="${attr(`${assignment.name} · ${D.classLabel(data, assignment.classId)}`)}" disabled></label><label class="field wide"><span>Nombre</span><input class="input" name="name" value="${attr(item.name || "")}" required></label><label class="field"><span>Tipo</span><select class="select" name="type">${["Tarea", "Ejercicio", "Examen", "Examen final", "Proyecto", "Presentación", "Laboratorio", "Participación", "Trabajo grupal", "Otra"].map((value) => option(value, value, item.type)).join("")}</select></label><label class="field"><span>Peso (%)</span><input class="input" type="number" min="1" max="25" step="1" name="weight" value="${item.weight || 10}" required></label><label class="field"><span>Fecha de entrega</span><input class="input" type="date" name="dueDate" value="${attr(item.dueDate || D.dateIso(7))}" required></label><label class="field"><span>Fecha máxima</span><input class="input" type="date" name="maxDate" value="${attr(item.maxDate || D.dateIso(12))}" required></label><label class="field"><span>Penalización por día de clase</span><input class="input" type="number" min="0" max="2" step="0.1" name="latePenalty" value="${item.latePenalty ?? assignment.latePenalty}"></label><label class="field"><span>Días máximos de prórroga</span><input class="input" type="number" min="0" max="20" name="maxExtensionDays" value="${item.maxExtensionDays ?? 3}"></label><label class="field wide"><span>Descripción e indicaciones</span><textarea class="textarea" name="description" required>${esc(item.description || "")}</textarea></label><label class="checkbox-row wide"><input type="checkbox" name="isGroup" ${item.isGroup ? "checked" : ""}> Actividad grupal</label><div class="notice wide">El examen final debe pesar 25%. Ninguna otra actividad individual puede superar 25%.</div></div>`, "Guardar actividad", (form) => {
      const type = form.get("type"); const weight = Number(form.get("weight"));
      if (type === "Examen final" && weight !== 25) return showFormError("El examen final debe pesar exactamente 25%."), false;
      if (type !== "Examen final" && weight > 25) return showFormError("Una actividad individual no puede superar 25%."), false;
      const totalOther = data.activities.filter((entry) => entry.active !== false && entry.assignmentId === assignment.id && entry.id !== id).reduce((sum, entry) => sum + Number(entry.weight), 0);
      if (totalOther + weight > 95) return showFormError(`El esquema superaría 100% incluyendo la asistencia fija de 5%. Disponible: ${Math.max(0, 95 - totalOther)}%.`), false;
      if (form.get("maxDate") < form.get("dueDate")) return showFormError("La fecha máxima no puede ser anterior a la entrega."), false;
      const values = { assignmentId: assignment.id, classId: assignment.classId, name: form.get("name").trim(), type, description: form.get("description").trim(), weight, dueDate: form.get("dueDate"), maxDate: form.get("maxDate"), isGroup: form.get("isGroup") === "on", latePolicy: "Penalización por cada día de clase de atraso.", latePenalty: Number(form.get("latePenalty")), maxExtensionDays: Number(form.get("maxExtensionDays")) };
      if (id) Object.assign(item, values);
      else {
        values.id = D.uid("act"); values.status = "DRAFT"; values.active = true; values.createdAt = D.nowIso(); values.publishedAt = null;
        values.grades = data.students.filter((student) => student.classId === assignment.classId && student.active).map((student) => ({ studentId: student.id, delivery: "PENDING", originalGrade: null, lateDays: 0, penalty: 0, finalGrade: null, receivedAt: null }));
        data.activities.push(values);
        data.students.filter((student) => student.classId === assignment.classId).forEach((student) => D.addNotification(data, "GUARDIAN", student.guardianId, "ACTIVITY", "Nueva actividad", `${values.name} · ${assignment.name} · entrega ${formatDate(values.dueDate)}.`, student.id));
      }
      D.addAudit(data, state.session.actorId, id ? "MODIFICÓ ACTIVIDAD" : "CREÓ ACTIVIDAD", `${values.name} · ${assignment.name} · ${D.classLabel(data, assignment.classId)}`, "IMPORTANT");
      persist("Actividad guardada y visible para los acudientes."); return true;
    }, false);
  }

  function openGradeForm(activityId) {
    const activity = activityById(activityId); const assignment = assignmentById(activity.assignmentId);
    const students = data.students.filter((item) => item.classId === activity.classId && item.active);
    showModal(`Calificar: ${activity.name}`, `<div class="notice">${activity.status === "PUBLISHED" ? "Esta evaluación ya fue publicada. Toda corrección notificará al acudiente y quedará auditada." : "Guarda borradores primero. Los acudientes verán las notas únicamente al usar “Publicar notas”."}</div><div class="row between wrap" style="margin:14px 0"><span class="pill info">Escala 1.0 a 5.0</span><span class="hint">Registra cada caso individualmente para conservar la equidad.</span></div><div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Entrega interna</th><th>Nota original</th><th>Días atraso</th><th>Nota final</th></tr></thead><tbody>${students.map((student) => { const grade = activity.grades.find((item) => item.studentId === student.id) || { delivery: "PENDING", originalGrade: null, lateDays: 0, finalGrade: null }; return `<tr><td><strong>${esc(student.name)}</strong></td><td><select class="select" name="delivery__${student.id}">${["PENDING", "RECEIVED", "NOT_DELIVERED", "FINAL_ZERO"].map((value) => option(value, ({ PENDING: "Pendiente", RECEIVED: "Recibido", NOT_DELIVERED: "No entregado", FINAL_ZERO: "0.0 definitivo" })[value], grade.delivery)).join("")}</select></td><td><input class="input grade-input" type="number" min="1" max="5" step="0.1" name="grade__${student.id}" value="${grade.originalGrade ?? ""}" placeholder="—"></td><td><input class="input" type="number" min="0" max="30" name="late__${student.id}" value="${grade.lateDays || 0}"></td><td><strong>${grade.finalGrade == null ? "—" : D.oneDecimal(grade.finalGrade).toFixed(1)}</strong></td></tr>`; }).join("")}</tbody></table></div><div class="notice warning" style="margin-top:14px">Penalización uniforme: −${activity.latePenalty.toFixed(1)} puntos por día de clase. Una entrega calificada no baja de 1.0 solo por penalización. Un 0.0 definitivo corresponde a fecha máxima vencida.</div>`, activity.status === "PUBLISHED" ? "Guardar correcciones" : "Guardar borradores", (form) => {
      const corrections = [];
      students.forEach((student) => {
        let grade = activity.grades.find((item) => item.studentId === student.id);
        if (!grade) { grade = { studentId: student.id }; activity.grades.push(grade); }
        const previousFinal = grade.finalGrade;
        const delivery = form.get(`delivery__${student.id}`);
        const originalRaw = form.get(`grade__${student.id}`); const lateDays = Number(form.get(`late__${student.id}`) || 0);
        const originalGrade = originalRaw === "" ? null : Number(originalRaw);
        grade.delivery = delivery; grade.originalGrade = originalGrade; grade.lateDays = lateDays;
        grade.penalty = lateDays * Number(activity.latePenalty);
        grade.finalGrade = delivery === "FINAL_ZERO" ? 0 : originalGrade == null ? null : Math.max(1, D.oneDecimal(originalGrade - grade.penalty));
        if (delivery === "RECEIVED" && !grade.receivedAt) grade.receivedAt = D.nowIso();
        if (activity.status === "PUBLISHED" && previousFinal !== grade.finalGrade) corrections.push({ student, previousFinal, finalGrade: grade.finalGrade });
      });
      if (corrections.length) corrections.forEach(({ student, previousFinal, finalGrade }) => { D.addNotification(data, "GUARDIAN", student.guardianId, "CORRECTION", "Calificación corregida", `${activity.name}: ${previousFinal == null ? "sin nota" : D.oneDecimal(previousFinal).toFixed(1)} → ${finalGrade == null ? "sin nota" : D.oneDecimal(finalGrade).toFixed(1)}.`, student.id); D.addAudit(data, state.session.actorId, "CORRIGIÓ NOTA PUBLICADA", `${student.name} · ${activity.name}: ${previousFinal} → ${finalGrade}`, "IMPORTANT"); });
      else D.addAudit(data, state.session.actorId, "GUARDÓ BORRADORES DE NOTA", `${activity.name} · ${D.classLabel(data, activity.classId)}`, "INFO");
      persist(corrections.length ? `${corrections.length} corrección(es) guardadas y notificadas.` : "Borradores guardados; aún no se publicaron."); return true;
    }, true);
  }

  function openGroupForm() {
    const groupActivities = data.activities.filter((item) => item.active !== false && item.isGroup && teacherAssignments().some((assignment) => assignment.id === item.assignmentId));
    if (!groupActivities.length) return toast("Primero cree una actividad grupal.", "error");
    const first = groupActivities[0];
    showModal("Crear grupo", `<div class="form-grid"><label class="field wide"><span>Actividad</span><select class="select" name="activityId" data-modal-activity>${groupActivities.map((item) => option(item.id, `${item.name} · ${D.classLabel(data, item.classId)}`, first.id)).join("")}</select></label><label class="field wide"><span>Código obligatorio</span><input class="input" name="code" value="GRUPO ${data.groups.filter((item) => item.activityId === first.id).length + 1} — ${attr(D.classLabel(data, first.classId))}" required></label><div class="field wide"><span>Integrantes</span><div class="grid-3">${data.students.filter((student) => student.classId === first.classId).map((student) => `<label class="checkbox-row"><input type="checkbox" name="memberIds" value="${student.id}"> ${esc(student.name)}</label>`).join("")}</div></div></div>`, "Crear grupo", (form) => {
      const activity = activityById(form.get("activityId")); const memberIds = form.getAll("memberIds");
      if (!memberIds.length) return showFormError("Seleccione por lo menos un integrante."), false;
      data.groups.push({ id: D.uid("grp"), activityId: activity.id, classId: activity.classId, code: form.get("code").trim(), memberIds, received: false, excluded: [] });
      D.addAudit(data, state.session.actorId, "CREÓ GRUPO", `${form.get("code")} · ${activity.name}`, "IMPORTANT"); persist("Grupo creado."); return true;
    });
  }

  function openGroupManage(groupId) {
    const group = data.groups.find((item) => item.id === groupId); const activity = activityById(group.activityId);
    showModal(group.code, `<div class="notice">Al excluir un estudiante debe registrar el motivo. La actividad individual equivalente puede recibir prórroga y penalización adicional de −0.1 por día de clase.</div><div class="list" style="margin-top:14px">${group.memberIds.map((studentId) => { const excluded = group.excluded.find((item) => item.studentId === studentId); return `<div class="list-row"><span><strong>${esc(studentById(studentId)?.name)}</strong><small>${excluded ? `Excluido: ${esc(excluded.reason)}` : group.received ? "Entregado con el grupo" : "Integrante activo"}</small></span>${excluded ? `<span class="pill danger">Excluido</span>` : `<button type="button" class="button ghost small" data-action="exclude-group-member" data-group="${group.id}" data-student="${studentId}">Excluir</button>`}</div>`; }).join("")}</div><div class="notice warning" style="margin-top:14px">Actividad: ${esc(activity.name)}</div>`, "", null);
  }

  function openExtensionForm() {
    const activities = data.activities.filter((activity) => activity.active !== false && teacherAssignments().some((assignment) => assignment.id === activity.assignmentId));
    showModal("Otorgar prórroga", `<div class="form-grid"><label class="field wide"><span>Actividad</span><select class="select" name="activityId">${activities.map((item) => option(item.id, `${item.name} · ${D.classLabel(data, item.classId)}`, "")).join("")}</select></label><label class="field wide"><span>Estudiante</span><select class="select" name="studentId">${data.students.filter((student) => teacherAssignments().some((assignment) => assignment.classId === student.classId)).map((student) => option(student.id, `${student.name} · ${D.classLabel(data, student.classId)}`, "")).join("")}</select></label><label class="field"><span>Cantidad de días de clase</span><input class="input" type="number" min="1" max="20" name="classDays" value="3" required></label><label class="field"><span>Fecha máxima calculada/confirmada</span><input class="input" type="date" name="maxDate" value="${D.dateIso(7)}" required></label><label class="field"><span>Penalización durante prórroga</span><input class="input" type="number" min="0" max="2" step="0.1" name="extensionPenalty" value="0.2" required></label><label class="field wide"><span>Motivo obligatorio</span><textarea class="textarea" name="reason" required></textarea></label><div class="notice warning wide">La prórroga no elimina la penalización normal. Los días se contabilizan únicamente cuando la materia tiene clase.</div></div>`, "Otorgar prórroga", (form) => {
      const activity = activityById(form.get("activityId")); const student = studentById(form.get("studentId"));
      if (!activity || !student || activity.classId !== student.classId) return showFormError("El estudiante debe pertenecer al salón de la actividad."), false;
      data.extensions.push({ id: D.uid("ext"), activityId: activity.id, studentId: student.id, teacherId: state.session.actorId, originalDate: activity.dueDate, grantedDate: D.dateIso(0), classDays: Number(form.get("classDays")), maxDate: form.get("maxDate"), reason: form.get("reason").trim(), normalPenalty: activity.latePenalty, extensionPenalty: Number(form.get("extensionPenalty")), createdAt: D.nowIso() });
      D.addNotification(data, "GUARDIAN", student.guardianId, "EXTENSION", "Prórroga concedida", `${activity.name}: nueva fecha máxima ${formatDate(form.get("maxDate"))}.`, student.id);
      D.addAudit(data, state.session.actorId, "OTORGÓ PRÓRROGA", `${student.name} · ${activity.name} · ${form.get("classDays")} días de clase`, "IMPORTANT"); persist("Prórroga guardada y notificada."); return true;
    });
  }

  function openObservationForm() {
    const allowedClassIds = [...new Set(teacherAssignments().map((item) => item.classId))];
    showModal("Registrar observación", `<div class="form-grid"><label class="field wide"><span>Estudiante</span><select class="select" name="studentId">${data.students.filter((item) => allowedClassIds.includes(item.classId)).map((item) => option(item.id, `${item.name} · ${D.classLabel(data, item.classId)}`, "")).join("")}</select></label><label class="field"><span>Tipo</span><select class="select" name="kind">${["NORMAL", "IMPORTANT", "URGENT", "POSITIVE"].map((value) => option(value, ({ NORMAL: "Normal", IMPORTANT: "Importante", URGENT: "Urgente", POSITIVE: "Reconocimiento positivo" })[value], "")).join("")}</select></label><label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="${D.dateIso(0)}" required></label><label class="field wide"><span>Observación</span><textarea class="textarea" name="text" required></textarea></label></div>`, "Guardar observación", (form) => {
      const student = studentById(form.get("studentId")); const kind = form.get("kind");
      data.observations.unshift({ id: D.uid("obs"), studentId: student.id, teacherId: state.session.actorId, kind, text: form.get("text").trim(), date: form.get("date"), createdAt: D.nowIso() });
      D.addNotification(data, "GUARDIAN", student.guardianId, "OBSERVATION", kind === "POSITIVE" ? "Reconocimiento positivo" : kind === "URGENT" ? "Observación urgente" : "Nueva observación", form.get("text").trim(), student.id);
      D.addAudit(data, state.session.actorId, "REGISTRÓ OBSERVACIÓN", `${student.name} · ${kind}`, kind === "URGENT" ? "IMPORTANT" : "INFO"); persist("Observación guardada."); return true;
    });
  }

  function openCitationForm() {
    const allowedClassIds = [...new Set(teacherAssignments().map((item) => item.classId))];
    showModal("Crear citación", `<div class="form-grid"><label class="field wide"><span>Estudiante</span><select class="select" name="studentId">${data.students.filter((item) => allowedClassIds.includes(item.classId)).map((item) => option(item.id, `${item.name} · ${D.classLabel(data, item.classId)}`, "")).join("")}</select></label><label class="field wide"><span>Título</span><input class="input" name="title" required></label><label class="field"><span>Fecha</span><input class="input" type="date" name="date" value="${D.dateIso(5)}" required></label><label class="field"><span>Hora</span><input class="input" type="time" name="time" value="10:00" required></label><label class="field wide"><span>Motivo</span><textarea class="textarea" name="reason" required></textarea></label></div>`, "Enviar citación", (form) => {
      const student = studentById(form.get("studentId"));
      const citation = { id: D.uid("cit"), studentId: student.id, teacherId: state.session.actorId, title: form.get("title").trim(), reason: form.get("reason").trim(), date: form.get("date"), time: form.get("time"), status: "PENDING", response: null, responseAt: null, createdAt: D.nowIso() };
      data.citations.unshift(citation); D.addNotification(data, "GUARDIAN", student.guardianId, "CITATION", "Nueva citación", `${citation.title} · ${formatDate(citation.date)} ${citation.time}.`, student.id);
      D.addAudit(data, state.session.actorId, "CREÓ CITACIÓN", `${student.name} · ${citation.title}`, "IMPORTANT"); persist("Citación enviada al acudiente."); return true;
    });
  }

  function openJustificationForm(attendanceId) {
    const attendance = data.attendance.find((item) => item.id === attendanceId); const student = studentById(attendance.studentId);
    showModal("Informar justificación formal", `<div class="notice warning">No suba fotos ni documentos. El colegio recibirá el documento físico y el profesor consejero lo validará.</div><div class="form-grid" style="margin-top:14px"><label class="field wide"><span>Estudiante</span><input class="input" value="${attr(student.name)}" disabled></label><label class="field wide"><span>Motivo o referencia</span><textarea class="textarea" name="reason" placeholder="Ej. Certificado médico que entregaré en secretaría" required></textarea></label></div>`, "Registrar justificación pendiente", (form) => {
      const justification = { id: D.uid("just"), attendanceId: attendance.id, studentId: student.id, guardianId: state.session.actorId, date: attendance.date, reason: form.get("reason").trim(), status: "PENDING", requestedAt: D.nowIso(), validatedBy: null, validatedAt: null };
      data.justifications.unshift(justification); attendance.justificationPending = true; attendance.justificationId = justification.id;
      const counselorId = classById(student.classId)?.counselorId;
      D.addNotification(data, "COUNSELOR", counselorId, "JUSTIFICATION", "Justificación pendiente de recibir", `${student.name} · ausencia ${formatDate(attendance.date)}.`, student.id);
      D.addAudit(data, state.session.actorId, "INFORMÓ JUSTIFICACIÓN FORMAL", `${student.name} · ${formatDate(attendance.date)}`, "IMPORTANT"); persist("Justificación registrada como pendiente de recibir."); return true;
    });
  }

  function openProfileForm() {
    const guardian = guardianById(state.session.actorId);
    showModal("Editar perfil", `${formSteps(["Fotografía", "Contacto", "Privacidad"], 2)}<div class="form-grid">${photoPicker(guardian.photo || "")}<label class="field wide"><span>Nombre completo</span><input class="input" name="name" value="${attr(guardian.name)}" required></label><label class="field"><span>Teléfono</span><input class="input" name="phone" value="${attr(guardian.phone)}" required></label><label class="field"><span>WhatsApp</span><input class="input" name="whatsapp" value="${attr(guardian.whatsapp)}" required></label><label class="field"><span>Correo</span><input class="input" type="email" name="email" value="${attr(guardian.email)}" required></label><label class="field"><span>Parentesco</span><input class="input" name="relationship" value="${attr(guardian.relationship)}" required></label><label class="field wide"><span>Residencia (opcional)</span><input class="input" name="residence" value="${attr(guardian.residence || "")}"></label></div>`, "Guardar perfil", (form) => {
      const photo = form.get("photo");
      Object.assign(guardian, { name: form.get("name"), phone: form.get("phone"), whatsapp: form.get("whatsapp"), email: form.get("email"), relationship: form.get("relationship"), residence: form.get("residence") });
      const finish = () => { D.addAudit(data, guardian.id, "ACTUALIZÓ PERFIL", guardian.name, "INFO"); persist("Perfil actualizado."); render(); };
      if (photo && photo.size) saveCompressedPhoto(photo, (value) => { if (value) guardian.photo = value; finish(); }); else finish();
      return true;
    });
  }

  function openLinkStudentForm() {
    showModal("Agregar estudiante", `<div class="notice">El sistema normaliza mayúsculas, tildes y espacios. La cédula es el identificador definitivo.</div><div class="form-grid" style="margin-top:14px"><label class="field wide"><span>Nombre completo</span><input class="input" name="name" required></label><label class="field"><span>Grado</span><input class="input" name="grade" placeholder="Ej. 8.º" required></label><label class="field"><span>Cédula o pasaporte</span><input class="input" name="idNumber" required></label></div>`, "Buscar y vincular", (form) => {
      const idNumber = D.normalize(form.get("idNumber")); const candidate = data.students.find((item) => D.normalize(item.idNumber) === idNumber);
      if (!candidate) { data.linkRequests.push({ id: D.uid("link"), guardianId: state.session.actorId, providedName: form.get("name"), providedGrade: form.get("grade"), idNumber: form.get("idNumber"), status: "REVIEW", reason: "No se encontró la identificación", createdAt: D.nowIso() }); persist("No hubo coincidencia definitiva. La solicitud fue enviada a revisión.", "error"); return true; }
      if (candidate.guardianId && candidate.guardianId !== state.session.actorId) { data.linkRequests.push({ id: D.uid("link"), guardianId: state.session.actorId, studentId: candidate.id, status: "REVIEW", reason: "Ya vinculado a otro acudiente", createdAt: D.nowIso() }); persist("El estudiante ya tiene acudiente principal. La solicitud fue enviada a revisión.", "error"); return true; }
      const nameClose = D.normalize(candidate.name).includes(D.normalize(form.get("name"))) || D.normalize(form.get("name")).includes(D.normalize(candidate.name));
      const gradeClose = D.normalize(classById(candidate.classId)?.grade) === D.normalize(form.get("grade"));
      if (!nameClose || !gradeClose) { data.linkRequests.push({ id: D.uid("link"), guardianId: state.session.actorId, studentId: candidate.id, providedName: form.get("name"), providedGrade: form.get("grade"), status: "REVIEW", reason: "Cédula coincide, pero nombre o grado difiere", createdAt: D.nowIso() }); persist("La cédula coincide, pero otros datos difieren. Se envió a revisión.", "error"); return true; }
      candidate.guardianId = state.session.actorId; state.selectedStudentId = candidate.id; D.addAudit(data, state.session.actorId, "VINCULÓ ESTUDIANTE", candidate.name, "IMPORTANT"); persist("Estudiante vinculado correctamente."); return true;
    });
  }

  function upsertAttendance(studentId, status, time = null, silent = false) {
    const assignment = selectedTeacherAssignment();
    let record = data.attendance.find((item) => item.date === state.attendanceDate && item.assignmentId === assignment.id && item.studentId === studentId);
    const previous = record?.status || "UNMARKED";
    if (status === "UNMARKED" && record) {
      data.attendance = data.attendance.filter((item) => item.id !== record.id);
      D.addAudit(data, state.session.actorId, "BORRÓ MARCA DE ASISTENCIA", `${studentById(studentId).name} · ${assignment.name} · ${formatDate(state.attendanceDate)}`, "IMPORTANT");
      if (!silent) persist("Marca borrada; el estudiante vuelve a no marcado.");
      return;
    }
    if (!record) {
      record = { id: D.uid("att"), date: state.attendanceDate, classId: assignment.classId, assignmentId: assignment.id, studentId, status, time, justificationPending: false, justificationId: null, validatedBy: null, validatedAt: null, updatedAt: D.nowIso(), history: [] };
      data.attendance.push(record);
    } else {
      if (previous !== status) record.history = [...(record.history || []), { from: previous, to: status, by: state.session.actorId, at: D.nowIso() }];
      record.status = status; record.time = time; record.updatedAt = D.nowIso();
    }
    if (previous !== "UNMARKED" && previous !== status) D.addAudit(data, state.session.actorId, "CORRIGIÓ ASISTENCIA", `${studentById(studentId).name}: ${previous} → ${status} · ${assignment.name}`, "IMPORTANT");
    if (!silent) persist(status === "PRESENT" ? "Presencia registrada." : "Asistencia actualizada.");
  }

  function publishActivity(activityId) {
    const activity = activityById(activityId); const assignment = assignmentById(activity.assignmentId);
    const incomplete = activity.grades.filter((grade) => grade.finalGrade == null);
    if (incomplete.length) return toast(`Faltan ${incomplete.length} estudiante(s) por calificar o cerrar como 0.0 definitivo.`, "error");
    confirmModal("Publicar notas", `Se publicarán los resultados de ${activity.name} a todos los acudientes del grupo.`, "Publicar", () => {
      activity.status = "PUBLISHED"; activity.publishedAt = D.nowIso();
      activity.grades.forEach((grade) => { const student = studentById(grade.studentId); if (student) D.addNotification(data, "GUARDIAN", student.guardianId, "GRADE", "Nueva calificación publicada", `${activity.name} · ${assignment.name}: ${D.oneDecimal(grade.finalGrade).toFixed(1)}.`, student.id); });
      D.addAudit(data, state.session.actorId, "PUBLICÓ NOTAS", `${activity.name} · ${D.classLabel(data, activity.classId)}`, "IMPORTANT"); persist("Notas publicadas para todos los acudientes."); render();
    });
  }

  function validateJustification(id) {
    const justification = data.justifications.find((item) => item.id === id); const attendance = data.attendance.find((item) => item.id === justification.attendanceId); const student = studentById(justification.studentId);
    justification.status = "VALIDATED"; justification.validatedBy = state.session.actorId; justification.validatedAt = D.nowIso();
    attendance.status = "JUSTIFIED"; attendance.justificationPending = false; attendance.validatedBy = state.session.actorId; attendance.validatedAt = D.nowIso(); attendance.updatedAt = D.nowIso();
    const dayAssignments = [...new Set(data.attendance.filter((item) => item.studentId === student.id && item.date === attendance.date).map((item) => item.assignmentId))];
    dayAssignments.forEach((assignmentId) => { const assignment = assignmentById(assignmentId); if (assignment) D.addNotification(data, "TEACHER", assignment.teacherId, "JUSTIFICATION", "Ausencia justificada", `${student.name} · ${formatDate(attendance.date)}. Considere las actividades académicas de ese día.`, student.id); });
    D.addNotification(data, "GUARDIAN", student.guardianId, "JUSTIFICATION", "Justificación validada", `${student.name} · ${formatDate(attendance.date)} ahora figura como ausencia justificada.`, student.id);
    D.addAudit(data, state.session.actorId, "VALIDÓ JUSTIFICACIÓN", `${student.name} · ${formatDate(attendance.date)}`, "IMPORTANT"); persist("Documento validado; profesores y acudiente fueron notificados.");
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "modal-backdrop" && event.target === target) closeModal();
    if (action === "close-modal") closeModal();
    if (action === "choose-role") chooseRole(target.dataset.role);
    if (action === "enter-role") enterRole(target.dataset.role, target.dataset.id, false);
    if (action === "logout") { state.session = null; state.view = "dashboard"; saveSession(); render(); }
    if (action === "toggle-menu") { document.querySelector(".sidebar")?.classList.add("open"); document.querySelector(".mobile-overlay")?.classList.add("show"); }
    if (action === "close-menu") { document.querySelector(".sidebar")?.classList.remove("open"); document.querySelector(".mobile-overlay")?.classList.remove("show"); }
    if (action === "set-view") { state.view = target.dataset.view; document.querySelector(".sidebar")?.classList.remove("open"); document.querySelector(".mobile-overlay")?.classList.remove("show"); render(); }
    if (action === "back-admin") { state.session = { role: "ADMIN", actorId: state.session.adminId || "admin", adminOrigin: false, adminId: null }; state.view = "dashboard"; saveSession(); render(); }
    if (action === "admin-view-as") openViewAs();
    if (action === "admin-view-role") openViewAs(target.dataset.role);
    if (action === "impersonate") enterRole(target.dataset.role, target.dataset.id, true);
    if (action === "user-type") { state.adminUserType = target.dataset.type; render(); }
    if (action === "new-user") openUserForm(target.dataset.type);
    if (action === "edit-user") openUserForm(target.dataset.type, target.dataset.id);
    if (action === "edit-teacher-profile") openTeacherProfile();
    if (action === "delete-user") {
      const collection = target.dataset.type === "teachers" ? data.teachers : data.guardians; const person = collection.find((item) => item.id === target.dataset.id);
      confirmModal("Eliminar perfil", `${person.name} dejará de aparecer entre los usuarios activos. Sus registros históricos permanecerán vinculados y auditados.`, "Eliminar", () => { person.active = false; person.deletedAt = D.nowIso(); data.trash.unshift({ id: D.uid("del"), entity: target.dataset.type, entityId: person.id, label: person.name, deletedAt: person.deletedAt, deletedBy: state.session.actorId }); D.addAudit(data, state.session.actorId, "ELIMINÓ USUARIO", person.name, "IMPORTANT"); persist("Perfil eliminado de la operación activa."); render(); }, true);
    }
    if (action === "new-student") openStudentForm(null, target.dataset.class || null);
    if (action === "edit-student") openStudentForm(target.dataset.id);
    if (action === "delete-student") {
      const student = studentById(target.dataset.id);
      confirmModal("Remover estudiante", `Se retirará a ${student.name} de la estructura activa. El historial académico no se elimina.`, "Remover", () => { student.active = false; D.addAudit(data, state.session.actorId, "REMOVIÓ ESTUDIANTE", student.name, "IMPORTANT"); persist("Estudiante removido; historial conservado."); render(); }, true);
    }
    if (action === "new-class") openClassForm();
    if (action === "counselor-create-class") openClassroomWizard();
    if (action === "edit-class") openClassForm(target.dataset.id);
    if (action === "delete-class") {
      const schoolClass = classById(target.dataset.id); const activeStudents = data.students.filter((item) => item.classId === schoolClass.id && item.active).length;
      if (activeStudents) toast(`No se puede remover: hay ${activeStudents} estudiante(s) activos.`, "error");
      else confirmModal("Remover salón", `Se removerá ${D.classLabel(data, schoolClass.id)} de la estructura activa.`, "Remover", () => { schoolClass.active = false; D.addAudit(data, state.session.actorId, "REMOVIÓ SALÓN", D.classLabel(data, schoolClass.id), "IMPORTANT"); persist("Salón removido."); render(); }, true);
    }
    if (action === "new-assignment") openAssignmentForm();
    if (action === "edit-assignment") openAssignmentForm(target.dataset.id);
    if (action === "delete-assignment") {
      const assignment = assignmentById(target.dataset.id);
      confirmModal("Eliminar asignación", `${assignment.name} dejará de estar activa en ${D.classLabel(data, assignment.classId)}. Actividades, notas y asistencia conservarán su historial.`, "Eliminar", () => { assignment.active = false; assignment.deletedAt = D.nowIso(); data.schedule.filter((slot) => slot.assignmentId === assignment.id).forEach((slot) => { slot.active = false; }); data.trash.unshift({ id: D.uid("del"), entity: "assignment", entityId: assignment.id, label: `${assignment.name} · ${D.classLabel(data, assignment.classId)}`, deletedAt: assignment.deletedAt, deletedBy: state.session.actorId }); D.addAudit(data, state.session.actorId, "ELIMINÓ ASIGNACIÓN", `${assignment.name} · ${D.classLabel(data, assignment.classId)}`, "IMPORTANT"); persist("Asignación eliminada; historial conservado."); render(); }, true);
    }
    if (action === "new-schedule") openScheduleForm();
    if (action === "duplicate-schedule") openScheduleForm(null, target.dataset.id);
    if (action === "delete-schedule") {
      const slot = data.schedule.find((item) => item.id === target.dataset.id);
      confirmModal("Eliminar hora del horario", `${slot.day} ${slot.start}–${slot.end} dejará de aparecer. El historial de clases anterior no se modifica.`, "Eliminar", () => { slot.active = false; slot.deletedAt = D.nowIso(); D.addAudit(data, state.session.actorId, "ELIMINÓ HORA DE HORARIO", `${assignmentById(slot.assignmentId)?.name} · ${D.classLabel(data, slot.classId)} · ${slot.day} ${slot.start}`, "IMPORTANT"); persist("Hora eliminada del horario."); closeModal(); render(); }, true);
    }
    if (action === "schedule-slot") {
      const slot = data.schedule.find((item) => item.id === target.dataset.id);
      if (state.session.role === "GUARDIAN") { state.selectedSubjectId = slot.assignmentId; state.view = "subjects"; render(); }
      else if (target.dataset.editable) openScheduleForm(slot.id);
    }
    if (action === "close-year") {
      confirmModal("Cerrar año lectivo", `Esta acción archivará toda la operación de ${data.institution.activeYear} y abrirá ${data.institution.activeYear + 1} con estructura académica nueva.`, "Cerrar año", () => {
        const year = data.institution.activeYear;
        data.archives.push({ year, closedAt: D.nowIso(), classes: D.clone(data.classes), students: D.clone(data.students), assignments: D.clone(data.assignments), schedule: D.clone(data.schedule), activities: D.clone(data.activities), attendance: D.clone(data.attendance), citations: D.clone(data.citations), observations: D.clone(data.observations) });
        const active = data.years.find((item) => item.status === "ACTIVE"); if (active) { active.status = "CLOSED"; active.closedAt = D.nowIso(); }
        data.institution.activeYear += 1; data.institution.currentTrimester = 1; data.years.push({ year: data.institution.activeYear, status: "ACTIVE", closedAt: null });
        data.classes = []; data.students = []; data.assignments = []; data.schedule = []; data.activities = []; data.attendance = []; data.citations = []; data.authorizations = []; data.observations = []; data.extensions = []; data.groups = []; data.justifications = []; data.linkRequests = [];
        data.teachers.forEach((teacher) => { teacher.counselorClassId = null; });
        D.addAudit(data, state.session.actorId, "CERRÓ AÑO LECTIVO", `${year} archivado; ${data.institution.activeYear} creado`, "IMPORTANT"); persist("Año cerrado y nueva estructura creada."); render();
      }, true);
    }
    if (action === "read-notification") { const item = data.notifications.find((entry) => entry.id === target.dataset.id); if (item) item.read = true; persist(); render(); }
    if (action === "delete-notification") { data.notifications = data.notifications.filter((item) => item.id !== target.dataset.id); persist("Notificación eliminada."); render(); }
    if (action === "mark-all-read") { data.notifications.filter((item) => item.targetId === state.session.actorId || state.session.role === "ADMIN" && item.targetId === "admin").forEach((item) => item.read = true); persist("Notificaciones marcadas como leídas."); render(); }
    if (action === "print") window.print();
    if (action === "export-data") downloadJson();
    if (action === "reset-demo") confirmModal("Restablecer demostración", "Se borrarán los cambios guardados en este navegador y se recuperarán los datos ficticios iniciales.", "Restablecer", () => { data = D.createSeedData(); D.saveData(data); state.session = { role: "ADMIN", actorId: "admin", adminOrigin: false }; state.view = "dashboard"; saveSession(); toast("Datos de demostración restablecidos."); render(); }, true);
    if (action === "install-app") installApp();
    if (action === "open-attendance") { state.selectedAssignmentId = target.dataset.assignment; state.view = "attendance"; render(); }
    if (action === "open-activities") { state.selectedAssignmentId = target.dataset.assignment; state.view = "activities"; render(); }
    if (action === "new-activity") openActivityForm();
    if (action === "edit-activity") openActivityForm(target.dataset.id);
    if (action === "grade-activity") openGradeForm(target.dataset.id);
    if (action === "publish-activity") publishActivity(target.dataset.id);
    if (action === "delete-activity") {
      const activity = activityById(target.dataset.id);
      if (activity.status === "PUBLISHED") showModal("Anular actividad publicada", `<div class="notice danger">Las notas ya fueron publicadas. Se anularán con motivo y auditoría; no se borrará la evidencia histórica.</div><label class="field" style="margin-top:14px"><span>Motivo obligatorio</span><textarea class="textarea" name="reason" required></textarea></label>`, "Anular", (form) => { activity.active = false; activity.status = "ANNULLED"; activity.annulledAt = D.nowIso(); activity.annulledBy = state.session.actorId; activity.annulledReason = form.get("reason").trim(); data.students.filter((item) => item.classId === activity.classId).forEach((student) => D.addNotification(data, "GUARDIAN", student.guardianId, "CORRECTION", "Actividad anulada", `${activity.name}: ${activity.annulledReason}.`, student.id)); D.addAudit(data, state.session.actorId, "ANULÓ ACTIVIDAD PUBLICADA", `${activity.name} · ${activity.annulledReason}`, "IMPORTANT"); persist("Actividad anulada y acudientes notificados."); return true; });
      else confirmModal("Eliminar borrador", `Se eliminará ${activity.name}, sus grupos y prórrogas asociadas.`, "Eliminar", () => { data.activities = data.activities.filter((item) => item.id !== activity.id); data.groups = data.groups.filter((item) => item.activityId !== activity.id); data.extensions = data.extensions.filter((item) => item.activityId !== activity.id); D.addAudit(data, state.session.actorId, "ELIMINÓ BORRADOR DE ACTIVIDAD", activity.name, "IMPORTANT"); persist("Borrador eliminado."); render(); }, true);
    }
    if (action === "mark-attendance") {
      const status = target.dataset.status; const studentId = target.dataset.student;
      if (["LATE", "EARLY"].includes(status)) showModal(status === "LATE" ? "Registrar tardanza" : "Registrar retiro anticipado", `<label class="field"><span>${status === "LATE" ? "Hora de llegada" : "Hora de retiro"}</span><input class="input" type="time" name="time" required value="${status === "LATE" ? "07:15" : "11:30"}"></label>`, "Guardar", (form) => { upsertAttendance(studentId, status, form.get("time")); return true; });
      else { upsertAttendance(studentId, status); render(); }
    }
    if (action === "mark-all-present") {
      const assignment = selectedTeacherAssignment(); const students = data.students.filter((item) => item.classId === assignment.classId && item.active);
      students.forEach((student) => { const record = data.attendance.find((item) => item.date === state.attendanceDate && item.assignmentId === assignment.id && item.studentId === student.id); if (!record || record.status === "UNMARKED") upsertAttendance(student.id, "PRESENT", null, true); });
      D.addAudit(data, state.session.actorId, "MARCÓ PENDIENTES PRESENTES", `${assignment.name} · ${D.classLabel(data, assignment.classId)} · ${formatDate(state.attendanceDate)}`, "INFO"); persist("Pendientes marcados presentes. Puedes tocar excepciones para corregirlas."); render();
    }
    if (action === "finalize-attendance") {
      const assignment = selectedTeacherAssignment(); const unmarked = data.students.filter((student) => student.classId === assignment.classId && student.active).filter((student) => !data.attendance.some((item) => item.date === state.attendanceDate && item.assignmentId === assignment.id && item.studentId === student.id && item.status !== "UNMARKED"));
      confirmModal("Finalizar clase", `${unmarked.length} estudiante(s) sin marcar pasarán a AUSENTE automáticamente.`, "Finalizar", () => { unmarked.forEach((student) => upsertAttendance(student.id, "ABSENT")); D.addAudit(data, state.session.actorId, "FINALIZÓ ASISTENCIA", `${assignment.name} · ${D.classLabel(data, assignment.classId)} · ${formatDate(state.attendanceDate)}`, "IMPORTANT"); persist("Clase finalizada; ausencias asignadas."); render(); });
    }
    if (action === "new-group") openGroupForm();
    if (action === "view-group") openGroupManage(target.dataset.id);
    if (action === "delete-group") { const group = data.groups.find((item) => item.id === target.dataset.id); confirmModal("Eliminar grupo", `Se eliminará ${group.code}. Las notas ya publicadas no se borran.`, "Eliminar", () => { data.groups = data.groups.filter((item) => item.id !== group.id); D.addAudit(data, state.session.actorId, "ELIMINÓ GRUPO", group.code, "IMPORTANT"); persist("Grupo eliminado."); render(); }, true); }
    if (action === "receive-group") {
      const group = data.groups.find((item) => item.id === target.dataset.id); const activity = activityById(group.activityId); group.received = true;
      group.memberIds.filter((id) => !group.excluded.some((excluded) => excluded.studentId === id)).forEach((studentId) => { const grade = activity.grades.find((item) => item.studentId === studentId); if (grade) { grade.delivery = "RECEIVED"; grade.receivedAt = D.nowIso(); } });
      D.addAudit(data, state.session.actorId, "MARCÓ GRUPO RECIBIDO", group.code, "IMPORTANT"); persist("Todos los integrantes activos figuran como entregado."); render();
    }
    if (action === "exclude-group-member") {
      const groupId = target.dataset.group; const studentId = target.dataset.student;
      showModal("Excluir estudiante del grupo", `<div class="notice danger">Se aplicará siempre la penalización adicional de −0.1 por día de clase desde la prórroga.</div><label class="field" style="margin-top:14px"><span>Motivo obligatorio</span><textarea class="textarea" name="reason" required></textarea></label>`, "Excluir", (form) => { const group = data.groups.find((item) => item.id === groupId); group.excluded.push({ studentId, reason: form.get("reason").trim(), at: D.nowIso(), additionalPenaltyPerClassDay: 0.1 }); D.addAudit(data, state.session.actorId, "EXCLUYÓ INTEGRANTE DE GRUPO", `${studentById(studentId).name} · ${group.code} · ${form.get("reason")}`, "IMPORTANT"); persist("Estudiante excluido con penalización adicional registrada."); return true; });
    }
    if (action === "new-extension") openExtensionForm();
    if (action === "delete-extension") { const extension = data.extensions.find((item) => item.id === target.dataset.id); confirmModal("Eliminar prórroga", "La prórroga dejará de estar activa y la acción quedará auditada.", "Eliminar", () => { data.extensions = data.extensions.filter((item) => item.id !== extension.id); D.addAudit(data, state.session.actorId, "ELIMINÓ PRÓRROGA", `${studentById(extension.studentId)?.name} · ${activityById(extension.activityId)?.name}`, "IMPORTANT"); persist("Prórroga eliminada."); render(); }, true); }
    if (action === "new-observation") openObservationForm();
    if (action === "delete-observation") { const observation = data.observations.find((item) => item.id === target.dataset.id); confirmModal("Eliminar observación", "Se retirará de la vista activa y la eliminación quedará auditada.", "Eliminar", () => { data.observations = data.observations.filter((item) => item.id !== observation.id); D.addAudit(data, state.session.actorId, "ELIMINÓ OBSERVACIÓN", `${studentById(observation.studentId)?.name} · ${observation.text}`, "IMPORTANT"); persist("Observación eliminada."); render(); }, true); }
    if (action === "new-citation") openCitationForm();
    if (action === "delete-citation") { const citation = data.citations.find((item) => item.id === target.dataset.id); if (citation.status === "RESPONDED") showModal("Anular citación respondida", `<div class="notice danger">La respuesta ya forma parte del historial. Registra el motivo de la anulación.</div><label class="field" style="margin-top:14px"><span>Motivo</span><textarea class="textarea" name="reason" required></textarea></label>`, "Anular", (form) => { citation.status = "ANNULLED"; citation.active = false; citation.annulledReason = form.get("reason").trim(); citation.annulledAt = D.nowIso(); D.addAudit(data, state.session.actorId, "ANULÓ CITACIÓN", `${citation.title} · ${citation.annulledReason}`, "IMPORTANT"); persist("Citación anulada."); return true; }); else confirmModal("Eliminar citación", `Se eliminará ${citation.title}.`, "Eliminar", () => { data.citations = data.citations.filter((item) => item.id !== citation.id); D.addAudit(data, state.session.actorId, "ELIMINÓ CITACIÓN", citation.title, "IMPORTANT"); persist("Citación eliminada."); render(); }, true); }
    if (action === "validate-justification") { validateJustification(target.dataset.id); render(); }
    if (action === "prepare-invitation") openInvitation(target.dataset.guardian, target.dataset.class);
    if (action === "invite-all") {
      const classId = target.dataset.class; const guardianIds = [...new Set(data.students.filter((item) => item.classId === classId && item.active).map((item) => item.guardianId).filter(Boolean))];
      guardianIds.forEach((guardianId) => ensureInvitation(guardianId, classId));
      D.addAudit(data, state.session.actorId, "PREPARÓ INVITACIONES", `${guardianIds.length} acudientes · ${D.classLabel(data, classId)}`, "IMPORTANT"); persist(`${guardianIds.length} invitaciones preparadas.`); render();
    }
    if (action === "send-invitation") {
      const invitation = data.invitations.find((item) => item.id === target.dataset.id); if (invitation) { invitation.status = "SENT"; invitation.channel = target.dataset.channel; invitation.sentAt = D.nowIso(); D.addAudit(data, state.session.actorId, "ENVIÓ INVITACIÓN", `${guardianById(invitation.guardianId)?.name} · ${target.dataset.channel}`, "IMPORTANT"); persist("Invitación marcada como enviada."); }
    }
    if (action === "copy-invitation") {
      const invitation = data.invitations.find((item) => item.id === target.dataset.id); const detail = invitationDetails(invitation);
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(detail.message).then(() => toast("Invitación copiada.")).catch(() => toast("No fue posible copiar automáticamente.", "error"));
      else toast("La copia automática requiere HTTPS; use WhatsApp o correo.", "error");
    }
    if (action === "activate-invitation") { const invitation = data.invitations.find((item) => item.id === target.dataset.id); invitation.status = "ACTIVATED"; invitation.acceptedAt = D.nowIso(); D.addAudit(data, state.session.actorId, "ACTIVÓ INVITACIÓN DE PRUEBA", guardianById(invitation.guardianId)?.name || invitation.code, "IMPORTANT"); persist("Activación de prueba registrada."); closeModal(); render(); }
    if (action === "delete-invitation") { const invitation = data.invitations.find((item) => item.id === target.dataset.id); confirmModal("Borrar invitación", `Se borrará el código ${invitation.code}. Podrás preparar uno nuevo.`, "Borrar", () => { data.invitations = data.invitations.filter((item) => item.id !== invitation.id); D.addAudit(data, state.session.actorId, "BORRÓ INVITACIÓN", `${guardianById(invitation.guardianId)?.name} · ${invitation.code}`, "INFO"); persist("Invitación borrada."); render(); }, true); }
    if (action === "open-guardian-subject") { state.selectedSubjectId = target.dataset.id; state.view = "subjects"; render(); }
    if (action === "clear-subject") { state.selectedSubjectId = null; render(); }
    if (action === "scroll-to") document.getElementById(target.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (action === "request-justification") openJustificationForm(target.dataset.id);
    if (action === "citation-response") {
      const citation = data.citations.find((item) => item.id === target.dataset.id); citation.response = target.dataset.response; citation.status = "RESPONDED"; citation.responseAt = D.nowIso();
      const student = studentById(citation.studentId); D.addNotification(data, "TEACHER", citation.teacherId, "CITATION", "Citación respondida", `${student.name}: ${citation.response === "YES" ? "Sí asistirá" : "No podrá asistir"}.`, student.id); D.addAudit(data, state.session.actorId, "RESPONDIÓ CITACIÓN", `${student.name} · ${citation.response === "YES" ? "Sí asistirá" : "No podrá asistir"}`, "IMPORTANT"); persist("Respuesta enviada al profesor."); render();
    }
    if (action === "authorization-response") {
      const authorization = data.authorizations.find((item) => item.id === target.dataset.id); authorization.response = target.dataset.response; authorization.responseAt = D.nowIso(); const student = studentById(authorization.studentId); D.addAudit(data, state.session.actorId, "RESPONDIÓ AUTORIZACIÓN", `${student.name} · ${authorization.title} · ${authorization.response}`, "IMPORTANT"); persist("Autorización respondida."); render();
    }
    if (action === "edit-profile") openProfileForm();
    if (action === "link-student") openLinkStudentForm();
    if (action === "select-child") { state.selectedStudentId = target.dataset.id; state.view = "dashboard"; render(); }
    if (action === "privacy-toggle") { const guardian = guardianById(state.session.actorId); guardian.privacy[target.dataset.field].published = !guardian.privacy[target.dataset.field].published; D.addAudit(data, guardian.id, "MODIFICÓ PRIVACIDAD", `${target.dataset.field}: ${guardian.privacy[target.dataset.field].published ? "publicado" : "oculto"}`, "IMPORTANT"); persist("Privacidad actualizada."); render(); }
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "modal-form") {
      event.preventDefault(); if (!modalSubmitHandler) return;
      const result = modalSubmitHandler(new FormData(event.target));
      if (result !== false) { closeModal(); render(); }
    }
    if (event.target.dataset.inlineForm === "institution") {
      event.preventDefault(); const form = event.target; const values = new FormData(form); const logo = form.querySelector('[name="logo"]').files[0];
      data.institution.name = values.get("name").trim(); data.institution.motto = values.get("motto").trim(); data.institution.primary = values.get("primary"); data.institution.secondary = values.get("secondary");
      const finish = () => { D.addAudit(data, state.session.actorId, "MODIFICÓ CONFIGURACIÓN", "Identidad institucional actualizada", "IMPORTANT"); persist("Identidad institucional guardada."); render(); };
      if (logo) saveCompressedPhoto(logo, (value) => { if (value) data.institution.logo = value; finish(); }); else finish();
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.state === "selectedAssignmentId") { state.selectedAssignmentId = target.value; render(); }
    if (target.dataset.state === "attendanceDate") { state.attendanceDate = target.value; render(); }
    if (target.dataset.state === "selectedStudentId") { state.selectedStudentId = target.value; state.selectedSubjectId = null; render(); }
    if (target.dataset.filter) { state.filters[target.dataset.filter] = target.value; render(); }
    if (target.dataset.privacyAudience) { const guardian = guardianById(state.session.actorId); guardian.privacy[target.dataset.privacyAudience].audience = target.value; D.addAudit(data, guardian.id, "MODIFICÓ PRIVACIDAD", `${target.dataset.privacyAudience}: audiencia ${target.value}`, "IMPORTANT"); persist("Audiencia actualizada."); }
    if (target.id === "import-data" && target.files[0]) importJson(target.files[0]);
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.filter && target.tagName === "INPUT") {
      state.filters[target.dataset.filter] = target.value;
      clearTimeout(target._eduTimer);
      target._eduTimer = setTimeout(() => render(), 180);
    }
  });

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `educontrol-respaldo-${data.institution.activeYear}-${D.dateIso(0)}.json`; anchor.click(); URL.revokeObjectURL(url); toast("Respaldo JSON descargado.");
  }
  function importJson(file) {
    const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(reader.result); data = D.migrateData(parsed); D.saveData(data); toast("Respaldo importado correctamente."); render(); } catch (error) { console.error(error); toast("El archivo no contiene un respaldo válido.", "error"); } }; reader.readAsText(file);
  }
  async function installApp() {
    if (!deferredInstallPrompt) return toast("La instalación estará disponible cuando el navegador lo permita.", "error");
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; render();
  }

  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; render(); });
  window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; toast("EduControl se instaló correctamente."); });
  window.addEventListener("storage", (event) => { if (event.key === D.STORAGE_KEY && event.newValue) { data = D.migrateData(JSON.parse(event.newValue)); render(); } });
  window.setInterval?.(() => { if (state.session && ["TEACHER", "COUNSELOR", "GUARDIAN"].includes(state.session.role) && ["dashboard", "schedule"].includes(state.view) && !modalRoot.innerHTML) render(); }, 60000);
  if ("serviceWorker" in navigator && location.protocol !== "file:") window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Service worker", error)));

  render();
})();
