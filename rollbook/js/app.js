/* ===========================================================
   Rollbook — Data layer & Application logic
   Powered by PHP + MySQL backend with REST API
   =========================================================== */

const CURRENCIES = {
  GHS: { symbol: "₵", label: "Ghanaian Cedi" },
  USD: { symbol: "$", label: "US Dollar" },
  EUR: { symbol: "€", label: "Euro" },
  GBP: { symbol: "£", label: "British Pound" },
  NGN: { symbol: "₦", label: "Nigerian Naira" },
};

let currentCurrency = "GHS";

const DB = {
  students: [],
  attendance: {},
  fees: {},
};

/* ===========================================================
   API Client for MySQL operations
   =========================================================== */
const API = {
  async bootstrap() {
    try {
      const res = await fetch("api/bootstrap.php");
      const json = await res.json();
      if (json.success && json.data) {
        DB.students = json.data.students || [];
        DB.attendance = json.data.attendance || {};
        DB.fees = json.data.fees || {};
        if (json.data.currency && CURRENCIES[json.data.currency]) {
          currentCurrency = json.data.currency;
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error("API bootstrap failed:", e);
      showToast("Unable to connect to MySQL database.");
      return false;
    }
  },

  async saveStudent(studentData) {
    try {
      const res = await fetch("api/students.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save student.");
      }
      return json.data;
    } catch (e) {
      throw e;
    }
  },

  async deleteStudent(id) {
    try {
      const res = await fetch(`api/students.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to delete student.");
      }
      return true;
    } catch (e) {
      throw e;
    }
  },

  async saveAttendance(date, records) {
    try {
      const res = await fetch("api/attendance.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save attendance.");
      }
      return true;
    } catch (e) {
      throw e;
    }
  },

  async createInvoice(invoiceData) {
    try {
      const res = await fetch("api/invoices.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to create invoice.");
      }
      return json.data;
    } catch (e) {
      throw e;
    }
  },

  async deleteInvoice(id) {
    try {
      const res = await fetch(`api/invoices.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to delete invoice.");
      }
      return true;
    } catch (e) {
      throw e;
    }
  },

  async recordPayment(paymentData) {
    try {
      const res = await fetch("api/payments.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to record payment.");
      }
      return json.data;
    } catch (e) {
      throw e;
    }
  },

  async deletePayment(id) {
    try {
      const res = await fetch(`api/payments.php?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to delete payment.");
      }
      return true;
    } catch (e) {
      throw e;
    }
  },

  async saveSetting(key, value) {
    try {
      const res = await fetch("api/settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.error("Failed to save setting:", e);
      return false;
    }
  },
};

const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>`;

function getFeeRecord(studentId) {
  if (!DB.fees[studentId]) {
    DB.fees[studentId] = { invoices: [], payments: [] };
  }
  return DB.fees[studentId];
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatCurrency(n) {
  const v = round2(n);
  const curr = CURRENCIES[currentCurrency] || CURRENCIES.GHS;
  const symbol = curr.symbol;
  return symbol + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/* ===========================================================
   Toast
   =========================================================== */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2500);
}

/* ===========================================================
   Navigation
   =========================================================== */
function initNav() {
  document.querySelectorAll(".rail-link").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function switchView(name) {
  document.querySelectorAll(".rail-link").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${name}`));
  if (name === "dashboard") renderDashboard();
  if (name === "students") renderStudents();
  if (name === "attendance") renderAttendance();
  if (name === "records") renderRecords();
  if (name === "fees") renderFees();
}

/* ===========================================================
   Dashboard
   =========================================================== */
function renderDashboard() {
  const total = DB.students.length;
  const today = todayISO();
  const todayRecord = DB.attendance[today] || {};
  const marked = Object.values(todayRecord);
  const present = marked.filter((s) => s === "present" || s === "late").length;
  const absent = marked.filter((s) => s === "absent").length;
  const rate = total > 0 && marked.length > 0 ? Math.round((present / total) * 100) : null;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPresent").textContent = present;
  document.getElementById("statAbsent").textContent = absent;
  document.getElementById("statRate").textContent = rate === null ? "—" : rate + "%";

  const classes = {};
  DB.students.forEach((s) => {
    classes[s.cls] = classes[s.cls] || { total: 0, present: 0 };
    classes[s.cls].total++;
    const status = todayRecord[s.id];
    if (status === "present" || status === "late") classes[s.cls].present++;
  });

  const grid = document.getElementById("classSummary");
  const names = Object.keys(classes).sort();
  if (names.length === 0) {
    grid.innerHTML = `<p class="empty-note is-visible"><strong>No classes yet</strong>Register a student to get started.</p>`;
  } else {
    grid.innerHTML = names
      .map((cls) => {
        const c = classes[cls];
        const noted = Object.keys(todayRecord).some((id) => DB.students.find((s) => s.id === id && s.cls === cls));
        const rate = noted && c.total > 0 ? Math.round((c.present / c.total) * 100) : null;
        const rateClass = rate === null ? "" : rate >= 90 ? "is-good" : rate < 70 ? "is-low" : "";
        return `<div class="class-tile">
          <div class="class-tile-meta">
            <strong>${escapeHtml(cls)}</strong>
            <span class="mini-rate ${rateClass}">${rate === null ? "—" : rate + "%"}</span>
          </div>
          <span class="count">${c.total} student${c.total === 1 ? "" : "s"} · ${noted ? c.present + " present today" : "not yet marked"}</span>
        </div>`;
      })
      .join("");
  }

  renderTrendChart();
}

function renderTrendChart() {
  const el = document.getElementById("trendChart");
  const today = todayISO();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  if (DB.students.length === 0) {
    el.innerHTML = `<p class="empty-note is-visible"><strong>Nothing to chart yet</strong>Register students and take attendance to see a trend here.</p>`;
    return;
  }

  const bars = days.map((iso) => {
    const record = DB.attendance[iso];
    if (!record || Object.keys(record).length === 0) return { iso, rate: null };
    const values = Object.values(record);
    const present = values.filter((v) => v === "present" || v === "late").length;
    const rate = Math.round((present / DB.students.length) * 100);
    return { iso, rate };
  });

  el.innerHTML = bars
    .map((b) => {
      const d = new Date(b.iso + "T00:00:00");
      const label = d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3);
      const isToday = b.iso === today;
      const height = b.rate === null ? 3 : Math.max(3, Math.round((b.rate / 100) * 88));
      return `<div class="trend-bar-col" title="${formatDateLabel(b.iso)}: ${b.rate === null ? "no record" : b.rate + "% present"}">
        <span class="trend-value">${b.rate === null ? "" : b.rate + "%"}</span>
        <div class="trend-bar ${isToday ? "is-today" : ""}" style="height:${height}px"></div>
        <span class="trend-label">${label}</span>
      </div>`;
    })
    .join("");
}

/* ===========================================================
   Students view
   =========================================================== */
function openStudentModal(student) {
  const overlay = document.getElementById("studentModalOverlay");
  const form = document.getElementById("studentForm");
  const title = document.getElementById("studentModalTitle");
  const sub = document.getElementById("studentModalSub");
  const submitBtn = document.getElementById("studentSubmitBtn");

  form.reset();
  if (student) {
    title.textContent = "Edit student";
    sub.textContent = `Update ${student.name}'s record.`;
    submitBtn.textContent = "Save changes";
    document.getElementById("f_editing_id").value = student.id;
    document.getElementById("f_name").value = student.name;
    document.getElementById("f_admno").value = student.admno;
    document.getElementById("f_class").value = student.cls;
    document.getElementById("f_gender").value = student.gender || "Female";
    document.getElementById("f_father").value = student.father || "";
    document.getElementById("f_father_phone").value = student.fatherPhone || "";
    document.getElementById("f_mother").value = student.mother || "";
    document.getElementById("f_mother_phone").value = student.motherPhone || "";
    document.getElementById("f_email").value = student.email || "";
    if (student.guardian || student.guardianPhone) {
      document.getElementById("f_guardian").value = student.guardian || "";
      document.getElementById("f_guardian_phone").value = student.guardianPhone || "";
      document.getElementById("guardianFields").classList.add("is-visible");
      document.getElementById("guardianToggleRow").style.display = "none";
    } else {
      document.getElementById("guardianFields").classList.remove("is-visible");
      document.getElementById("guardianToggleRow").style.display = "";
    }
  } else {
    title.textContent = "Add a student";
    sub.textContent = "Register a new student to the roll.";
    submitBtn.textContent = "Add student";
    document.getElementById("f_editing_id").value = "";
    document.getElementById("guardianFields").classList.remove("is-visible");
    document.getElementById("guardianToggleRow").style.display = "";
  }
  overlay.classList.add("is-open");
  document.getElementById("f_name").focus();
}

function closeStudentModal() {
  const overlay = document.getElementById("studentModalOverlay");
  overlay.classList.remove("is-open");
  document.getElementById("studentForm").reset();
  document.getElementById("f_editing_id").value = "";
  document.getElementById("guardianFields").classList.remove("is-visible");
  document.getElementById("guardianToggleRow").style.display = "";
}

function initStudentForm() {
  const overlay = document.getElementById("studentModalOverlay");
  const form = document.getElementById("studentForm");

  document.getElementById("openStudentModalBtn").addEventListener("click", () => openStudentModal());
  document.getElementById("studentModalClose").addEventListener("click", closeStudentModal);
  document.getElementById("clearFormBtn").addEventListener("click", closeStudentModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeStudentModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeStudentModal();
  });

  document.getElementById("addGuardianBtn").addEventListener("click", () => {
    document.getElementById("guardianFields").classList.add("is-visible");
    document.getElementById("guardianToggleRow").style.display = "none";
  });
  document.getElementById("removeGuardianBtn").addEventListener("click", () => {
    document.getElementById("guardianFields").classList.remove("is-visible");
    document.getElementById("guardianToggleRow").style.display = "";
    document.getElementById("f_guardian").value = "";
    document.getElementById("f_guardian_phone").value = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editingId = document.getElementById("f_editing_id").value;
    const name = document.getElementById("f_name").value.trim();
    const admno = document.getElementById("f_admno").value.trim();
    const cls = document.getElementById("f_class").value.trim();
    const gender = document.getElementById("f_gender").value;
    const father = document.getElementById("f_father").value.trim();
    const fatherPhone = document.getElementById("f_father_phone").value.trim();
    const mother = document.getElementById("f_mother").value.trim();
    const motherPhone = document.getElementById("f_mother_phone").value.trim();
    const guardian = document.getElementById("f_guardian").value.trim();
    const guardianPhone = document.getElementById("f_guardian_phone").value.trim();
    const email = document.getElementById("f_email").value.trim();

    if (!name || !admno || !cls) {
      showToast("Name, admission number and class are required.");
      return;
    }
    if (!fatherPhone && !motherPhone && !guardianPhone) {
      showToast("At least one phone number (parent or guardian) is required.");
      return;
    }
    if (!email || !isValidEmail(email)) {
      showToast("A valid email address is required.");
      return;
    }
    const clash = DB.students.find((s) => s.admno.toLowerCase() === admno.toLowerCase() && String(s.id) !== String(editingId));
    if (clash) {
      showToast("That admission number is already in use.");
      return;
    }

    const payload = {
      id: editingId || undefined,
      name,
      admno,
      cls,
      gender,
      father,
      fatherPhone,
      mother,
      motherPhone,
      guardian,
      guardianPhone,
      email,
    };

    const submitBtn = document.getElementById("studentSubmitBtn");
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
      const savedStudent = await API.saveStudent(payload);
      if (editingId) {
        const idx = DB.students.findIndex((st) => String(st.id) === String(editingId));
        if (idx !== -1) {
          DB.students[idx] = savedStudent;
        }
        showToast(`${name}'s record was updated.`);
      } else {
        DB.students.push(savedStudent);
        if (!DB.fees[savedStudent.id]) {
          DB.fees[savedStudent.id] = { invoices: [], payments: [] };
        }
        showToast(`${name} added to the roll.`);
      }

      closeStudentModal();
      renderStudents();
      renderDashboard();
      populateStudentSelect();
      populateFeeStudentSelect();
    } catch (err) {
      showToast(err.message || "Failed to save student.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  document.getElementById("studentSearch").addEventListener("input", renderStudents);
}

function renderStudents() {
  const query = (document.getElementById("studentSearch").value || "").toLowerCase().trim();
  const body = document.getElementById("studentTableBody");
  const list = DB.students
    .filter((s) => !query || s.name.toLowerCase().includes(query) || s.admno.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));

  body.innerHTML = list
    .map(
      (s) => `<tr class="is-clickable" data-id="${s.id}">
        <td class="admno" data-label="Adm. No.">${escapeHtml(s.admno)}</td>
        <td class="student-name" data-label="Name">${escapeHtml(s.name)}</td>
        <td data-label="Class">${escapeHtml(s.cls)}</td>
        <td data-label="" class="row-actions">
          <button class="row-edit icon-btn" data-id="${s.id}" title="Edit" aria-label="Edit ${escapeHtml(s.name)}">${ICON_EDIT}</button>
          <button class="row-delete icon-btn" data-id="${s.id}" title="Remove" aria-label="Remove ${escapeHtml(s.name)}">${ICON_TRASH}</button>
        </td>
      </tr>`
    )
    .join("");

  document.getElementById("studentsEmptyNote").classList.toggle("is-visible", DB.students.length === 0);

  body.querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".icon-btn")) return;
      const s = DB.students.find((st) => String(st.id) === String(row.dataset.id));
      if (s) openStudentProfile(s);
    });
  });

  body.querySelectorAll(".row-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = DB.students.find((st) => String(st.id) === String(btn.dataset.id));
      if (s) openStudentModal(s);
    });
  });

  body.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const s = DB.students.find((st) => String(st.id) === String(btn.dataset.id));
      if (!s) return;
      if (!confirm(`Remove ${s.name} from the roll? Their attendance history and records will be deleted.`)) return;

      try {
        await API.deleteStudent(s.id);
        DB.students = DB.students.filter((st) => String(st.id) !== String(s.id));
        delete DB.fees[s.id];

        // Clean from attendance cache
        Object.keys(DB.attendance).forEach((date) => {
          if (DB.attendance[date][s.id]) {
            delete DB.attendance[date][s.id];
          }
        });

        showToast(`${s.name} removed from the roll.`);
        renderStudents();
        renderDashboard();
        populateStudentSelect();
        populateFeeStudentSelect();
      } catch (err) {
        showToast(err.message || "Failed to remove student.");
      }
    });
  });

  populateClassFilter();
}

function populateClassFilter() {
  const select = document.getElementById("attClassFilter");
  if (!select) return;
  const current = select.value;
  const classes = [...new Set(DB.students.map((s) => s.cls))].sort();
  select.innerHTML = `<option value="">All classes</option>` + classes.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  if (classes.includes(current)) select.value = current;
}

/* ===========================================================
   Student profile
   =========================================================== */
function profileRow(label, value) {
  return `<dt>${escapeHtml(label)}</dt><dd>${value ? escapeHtml(value) : '<span style="color:var(--slate-soft)">—</span>'}</dd>`;
}

function openStudentProfile(student) {
  document.getElementById("profileModalTitle").textContent = student.name;
  document.getElementById("profileModalSub").textContent = `Adm. No. ${student.admno} · ${student.cls}`;

  document.getElementById("profilePersonal").innerHTML = [
    profileRow("Full name", student.name),
    profileRow("Admission no.", student.admno),
    profileRow("Class / Grade", student.cls),
    profileRow("Gender", student.gender),
  ].join("");

  const contactRows = [
    profileRow("Father", [student.father, student.fatherPhone].filter(Boolean).join(" — ")),
    profileRow("Mother", [student.mother, student.motherPhone].filter(Boolean).join(" — ")),
  ];
  if (student.guardian || student.guardianPhone) {
    contactRows.push(profileRow("Guardian", [student.guardian, student.guardianPhone].filter(Boolean).join(" — ")));
  }
  contactRows.push(profileRow("Email", student.email));
  document.getElementById("profileContact").innerHTML = contactRows.join("");

  const rec = getFeeRecord(student.id);
  const totalInvoiced = round2(rec.invoices.reduce((sum, i) => sum + Number(i.amount), 0));
  const totalPaid = round2(rec.payments.reduce((sum, p) => sum + Number(p.amount), 0));
  const outstanding = round2(totalInvoiced - totalPaid);
  document.getElementById("profileFeeStats").innerHTML = `
    <div class="stat-card"><span class="stat-value">${formatCurrency(totalPaid)}</span><span class="stat-label">Total paid</span></div>
    <div class="stat-card"><span class="stat-value">${formatCurrency(totalInvoiced)}</span><span class="stat-label">Total invoiced</span></div>
    <div class="stat-card"><span class="stat-value ${outstanding > 0 ? "is-warn" : "is-ok"}">${outstanding > 0 ? formatCurrency(outstanding) : outstanding < 0 ? formatCurrency(Math.abs(outstanding)) + " credit" : formatCurrency(0)}</span><span class="stat-label">Outstanding</span></div>
  `;

  document.getElementById("profileViewFeesBtn").dataset.id = student.id;
  document.getElementById("studentProfileOverlay").classList.add("is-open");
}

function closeStudentProfile() {
  document.getElementById("studentProfileOverlay").classList.remove("is-open");
}

function initStudentProfile() {
  const overlay = document.getElementById("studentProfileOverlay");
  document.getElementById("profileModalClose").addEventListener("click", closeStudentProfile);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeStudentProfile();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeStudentProfile();
  });
  document.getElementById("profileViewFeesBtn").addEventListener("click", (e) => {
    const id = e.currentTarget.dataset.id;
    closeStudentProfile();
    switchView("fees");
    const select = document.getElementById("feeStudentSelect");
    select.value = id;
    renderFeeDetail();
  });
}

/* ===========================================================
   Attendance view
   =========================================================== */
let pendingAttendance = {}; // studentId -> status, for the date currently shown

function initAttendance() {
  const dateInput = document.getElementById("attDate");
  dateInput.value = todayISO();
  dateInput.addEventListener("change", renderAttendance);
  document.getElementById("attClassFilter").addEventListener("change", renderAttendance);

  document.querySelectorAll(".mark-all .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.dataset.mark;
      const rows = document.querySelectorAll("#attendanceTableBody tr");
      rows.forEach((row) => {
        const id = row.dataset.id;
        pendingAttendance[id] = status;
      });
      renderAttendanceRows();
      updateAttSummary();
    });
  });

  document.getElementById("saveAttendanceBtn").addEventListener("click", async () => {
    const date = document.getElementById("attDate").value;
    if (!date) {
      showToast("Choose a date first.");
      return;
    }

    const saveBtn = document.getElementById("saveAttendanceBtn");
    const origText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      await API.saveAttendance(date, pendingAttendance);
      DB.attendance[date] = { ...(DB.attendance[date] || {}), ...pendingAttendance };
      showToast(`Attendance saved for ${formatDateLabel(date)}.`);
      renderDashboard();
      renderRecords();
    } catch (err) {
      showToast(err.message || "Failed to save attendance.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
  });
}

function renderAttendance() {
  const date = document.getElementById("attDate").value || todayISO();
  const clsFilter = document.getElementById("attClassFilter").value;
  const existing = DB.attendance[date] || {};

  pendingAttendance = { ...existing };

  const students = DB.students
    .filter((s) => !clsFilter || s.cls === clsFilter)
    .sort((a, b) => a.name.localeCompare(b.name));

  const body = document.getElementById("attendanceTableBody");
  body.innerHTML = students
    .map(
      (s) => `<tr data-id="${s.id}">
        <td class="admno" data-label="Adm. No.">${escapeHtml(s.admno)}</td>
        <td class="student-name" data-label="Name">${escapeHtml(s.name)}</td>
        <td data-label="Class">${escapeHtml(s.cls)}</td>
        <td class="status-cell" data-label="Status"></td>
      </tr>`
    )
    .join("");

  document.getElementById("attendanceEmptyNote").classList.toggle("is-visible", students.length === 0);

  renderAttendanceRows();
  updateAttSummary();
}

function renderAttendanceRows() {
  document.querySelectorAll("#attendanceTableBody tr").forEach((row) => {
    const id = row.dataset.id;
    const status = pendingAttendance[id];
    const cell = row.querySelector(".status-cell");
    cell.innerHTML = ["present", "absent", "late"]
      .map(
        (opt) =>
          `<button type="button" class="status-btn ${opt} ${status === opt ? "is-set" : ""}" data-id="${id}" data-status="${opt}">${capitalize(opt)}</button>`
      )
      .join("");
  });

  document.querySelectorAll(".status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingAttendance[btn.dataset.id] = btn.dataset.status;
      renderAttendanceRows();
      updateAttSummary();
    });
  });
}

function updateAttSummary() {
  const values = Object.values(pendingAttendance);
  const present = values.filter((v) => v === "present").length;
  const late = values.filter((v) => v === "late").length;
  const absent = values.filter((v) => v === "absent").length;
  const total = document.querySelectorAll("#attendanceTableBody tr").length;
  document.getElementById("attSummary").textContent =
    total === 0 ? "" : `${present} present · ${late} late · ${absent} absent · ${total - values.length} unmarked`;
}

/* ===========================================================
   Records view
   =========================================================== */
function initRecords() {
  document.getElementById("recDate").value = todayISO();
  document.getElementById("recDate").addEventListener("change", renderRecordsByDay);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("is-active", p.id === `tab-${btn.dataset.tab}`));
    });
  });

  document.getElementById("recStudentSelect").addEventListener("change", renderRecordsByStudent);
}

function renderRecords() {
  renderRecordsByDay();
  populateStudentSelect();
  renderRecordsByStudent();
}

function renderRecordsByDay() {
  const date = document.getElementById("recDate").value || todayISO();
  const record = DB.attendance[date];
  const body = document.getElementById("recDayBody");
  const emptyNote = document.getElementById("recDayEmptyNote");

  if (!record || Object.keys(record).length === 0) {
    body.innerHTML = "";
    emptyNote.classList.add("is-visible");
    return;
  }
  emptyNote.classList.remove("is-visible");

  const rows = DB.students
    .filter((s) => record[s.id])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (s) => `<tr>
        <td class="admno" data-label="Adm. No.">${escapeHtml(s.admno)}</td>
        <td class="student-name" data-label="Name">${escapeHtml(s.name)}</td>
        <td data-label="Class">${escapeHtml(s.cls)}</td>
        <td data-label="Status"><span class="badge ${record[s.id]}">${capitalize(record[s.id])}</span></td>
      </tr>`
    );
  body.innerHTML = rows.join("");
  if (rows.length === 0) emptyNote.classList.add("is-visible");
}

function populateStudentSelect() {
  const select = document.getElementById("recStudentSelect");
  if (!select) return;
  const current = select.value;
  const sorted = [...DB.students].sort((a, b) => a.name.localeCompare(b.name));
  select.innerHTML =
    `<option value="">Select a student…</option>` +
    sorted.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.cls)}</option>`).join("");
  if (sorted.some((s) => String(s.id) === String(current))) select.value = current;
}

function renderRecordsByStudent() {
  const id = document.getElementById("recStudentSelect").value;
  const emptyNote = document.getElementById("recStudentEmptyNote");
  const container = document.getElementById("recStudentDetailsContainer");

  if (!id) {
    if (emptyNote) emptyNote.classList.add("is-visible");
    if (container) container.style.display = "none";
    return;
  }

  const student = DB.students.find((s) => String(s.id) === String(id));
  if (!student) {
    if (emptyNote) emptyNote.classList.add("is-visible");
    if (container) container.style.display = "none";
    return;
  }

  if (emptyNote) emptyNote.classList.remove("is-visible");
  if (container) container.style.display = "block";

  // 1. Render Student Details
  const personalEl = document.getElementById("recStudentPersonal");
  if (personalEl) {
    personalEl.innerHTML = [
      profileRow("Full name", student.name),
      profileRow("Admission no.", student.admno),
      profileRow("Class / Grade", student.cls),
      profileRow("Gender", student.gender),
    ].join("");
  }

  const contactEl = document.getElementById("recStudentContact");
  if (contactEl) {
    const contactRows = [
      profileRow("Father", [student.father, student.fatherPhone].filter(Boolean).join(" — ")),
      profileRow("Mother", [student.mother, student.motherPhone].filter(Boolean).join(" — ")),
    ];
    if (student.guardian || student.guardianPhone) {
      contactRows.push(profileRow("Guardian", [student.guardian, student.guardianPhone].filter(Boolean).join(" — ")));
    }
    contactRows.push(profileRow("Email", student.email));
    contactEl.innerHTML = contactRows.join("");
  }

  // 2. Render Attendance Records & Stats
  const attBody = document.getElementById("recStudentBody");
  const attStats = document.getElementById("recStudentStats");
  const attEmpty = document.getElementById("recStudentAttEmptyNote");

  const dates = Object.keys(DB.attendance)
    .filter((d) => DB.attendance[d] && (DB.attendance[d][id] || DB.attendance[d][String(id)]))
    .sort((a, b) => (a < b ? 1 : -1));

  if (dates.length === 0) {
    if (attBody) attBody.innerHTML = "";
    if (attStats) attStats.innerHTML = "";
    if (attEmpty) attEmpty.classList.add("is-visible");
  } else {
    if (attEmpty) attEmpty.classList.remove("is-visible");
    let present = 0, absent = 0, late = 0;
    dates.forEach((d) => {
      const st = DB.attendance[d][id] || DB.attendance[d][String(id)];
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") late++;
    });
    const rate = Math.round(((present + late) / dates.length) * 100);

    if (attStats) {
      attStats.innerHTML = `
        <div class="stat-card"><span class="stat-value">${rate}%</span><span class="stat-label">Attendance rate</span></div>
        <div class="stat-card"><span class="stat-value">${present}</span><span class="stat-label">Days present</span></div>
        <div class="stat-card"><span class="stat-value">${absent}</span><span class="stat-label">Days absent</span></div>
      `;
    }

    if (attBody) {
      attBody.innerHTML = dates
        .map((d) => {
          const st = DB.attendance[d][id] || DB.attendance[d][String(id)];
          return `<tr><td data-label="Date">${formatDateLabel(d)}</td><td data-label="Status"><span class="badge ${st}">${capitalize(st)}</span></td></tr>`;
        })
        .join("");
    }
  }

  // 3. Render Fees & Payments
  const rec = getFeeRecord(student.id);
  const totalInvoiced = round2(rec.invoices.reduce((sum, i) => sum + Number(i.amount), 0));
  const totalPaid = round2(rec.payments.reduce((sum, p) => sum + Number(p.amount), 0));
  const outstanding = round2(totalInvoiced - totalPaid);

  const feeStats = document.getElementById("recStudentFeeStats");
  if (feeStats) {
    feeStats.innerHTML = `
      <div class="stat-card"><span class="stat-value">${formatCurrency(totalPaid)}</span><span class="stat-label">Total paid</span></div>
      <div class="stat-card"><span class="stat-value">${formatCurrency(totalInvoiced)}</span><span class="stat-label">Total invoiced</span></div>
      <div class="stat-card"><span class="stat-value ${outstanding > 0 ? "is-warn" : "is-ok"}">${outstanding > 0 ? formatCurrency(outstanding) : outstanding < 0 ? formatCurrency(Math.abs(outstanding)) + " credit" : formatCurrency(0)}</span><span class="stat-label">Outstanding</span></div>
    `;
  }

  const invBody = document.getElementById("recStudentInvoicesBody");
  const invEmpty = document.getElementById("recStudentInvEmptyNote");
  const sortedInvoices = [...rec.invoices].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (invBody) {
    invBody.innerHTML = sortedInvoices
      .map(
        (i) => `<tr>
          <td data-label="Date">${formatDateLabel(i.date)}</td>
          <td data-label="Description">${escapeHtml(i.desc)}</td>
          <td data-label="Due">${i.due ? formatDateLabel(i.due) : "—"}</td>
          <td data-label="Amount">${formatCurrency(i.amount)}</td>
        </tr>`
      )
      .join("");
  }
  if (invEmpty) {
    invEmpty.classList.toggle("is-visible", sortedInvoices.length === 0);
  }

  const payBody = document.getElementById("recStudentPaymentsBody");
  const payEmpty = document.getElementById("recStudentPayEmptyNote");
  const sortedPayments = [...rec.payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (payBody) {
    payBody.innerHTML = sortedPayments
      .map(
        (p) => `<tr>
          <td data-label="Date">${formatDateLabel(p.date)}</td>
          <td data-label="Method">${escapeHtml(p.method)}</td>
          <td data-label="Note">${escapeHtml(p.note || "—")}</td>
          <td data-label="Amount">${formatCurrency(p.amount)}</td>
        </tr>`
      )
      .join("");
  }
  if (payEmpty) {
    payEmpty.classList.toggle("is-visible", sortedPayments.length === 0);
  }
}

/* ===========================================================
   Fees
   =========================================================== */
function renderFees() {
  populateFeeStudentSelect();
  renderFeeDetail();
}

function populateFeeStudentSelect() {
  const select = document.getElementById("feeStudentSelect");
  if (!select) return;
  const current = select.value;
  const sorted = [...DB.students].sort((a, b) => a.name.localeCompare(b.name));
  select.innerHTML =
    `<option value="">Select a student…</option>` +
    sorted.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} — ${escapeHtml(s.cls)}</option>`).join("");
  if (sorted.some((s) => String(s.id) === String(current))) select.value = current;
}

function renderFeeDetail() {
  const id = document.getElementById("feeStudentSelect").value;
  const emptyNote = document.getElementById("feeEmptyNote");
  const detail = document.getElementById("feeDetail");

  if (!id) {
    emptyNote.classList.add("is-visible");
    detail.style.display = "none";
    return;
  }
  emptyNote.classList.remove("is-visible");
  detail.style.display = "block";

  const student = DB.students.find((s) => String(s.id) === String(id));
  const emailLabel = document.getElementById("feeParentEmailLabel");
  const emailBtn = document.getElementById("emailInvoiceBtn");
  if (student && student.email) {
    emailLabel.textContent = `Invoice will be sent to ${student.email}`;
    emailBtn.disabled = false;
  } else {
    emailLabel.textContent = "No email on file — edit this student's record to add one.";
    emailBtn.disabled = true;
  }

  const rec = getFeeRecord(id);
  const totalInvoiced = round2(rec.invoices.reduce((sum, i) => sum + Number(i.amount), 0));
  const totalPaid = round2(rec.payments.reduce((sum, p) => sum + Number(p.amount), 0));
  const outstanding = round2(totalInvoiced - totalPaid);

  document.getElementById("feeTotalInvoiced").textContent = formatCurrency(totalInvoiced);
  document.getElementById("feeTotalPaid").textContent = formatCurrency(totalPaid);
  const outstandingEl = document.getElementById("feeOutstanding");
  outstandingEl.textContent = outstanding > 0 ? formatCurrency(outstanding) : outstanding < 0 ? `${formatCurrency(Math.abs(outstanding))} credit` : formatCurrency(0);
  outstandingEl.classList.toggle("is-warn", outstanding > 0);
  outstandingEl.classList.toggle("is-ok", outstanding <= 0);

  const invBody = document.getElementById("invoiceTableBody");
  const invEmpty = document.getElementById("invoiceEmptyNote");
  const sortedInvoices = [...rec.invoices].sort((a, b) => (a.date < b.date ? 1 : -1));
  invBody.innerHTML = sortedInvoices
    .map(
      (i) => `<tr>
        <td data-label="Date">${formatDateLabel(i.date)}</td>
        <td data-label="Description">${escapeHtml(i.desc)}</td>
        <td data-label="Due">${i.due ? formatDateLabel(i.due) : "—"}</td>
        <td data-label="Amount">${formatCurrency(i.amount)}</td>
        <td data-label=""><button class="row-delete icon-btn" data-type="invoice" data-id="${i.id}" title="Remove" aria-label="Remove invoice">${ICON_TRASH}</button></td>
      </tr>`
    )
    .join("");
  invEmpty.classList.toggle("is-visible", rec.invoices.length === 0);

  const payBody = document.getElementById("paymentTableBody");
  const payEmpty = document.getElementById("paymentEmptyNote");
  const sortedPayments = [...rec.payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  payBody.innerHTML = sortedPayments
    .map(
      (p) => `<tr>
        <td data-label="Date">${formatDateLabel(p.date)}</td>
        <td data-label="Method">${escapeHtml(p.method)}</td>
        <td data-label="Note">${escapeHtml(p.note || "—")}</td>
        <td data-label="Amount">${formatCurrency(p.amount)}</td>
        <td data-label=""><button class="row-delete icon-btn" data-type="payment" data-id="${p.id}" title="Remove" aria-label="Remove payment">${ICON_TRASH}</button></td>
      </tr>`
    )
    .join("");
  payEmpty.classList.toggle("is-visible", rec.payments.length === 0);

  invBody.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const invId = btn.dataset.id;
      if (!confirm("Remove this invoice?")) return;
      try {
        await API.deleteInvoice(invId);
        rec.invoices = rec.invoices.filter((i) => String(i.id) !== String(invId));
        showToast("Invoice removed.");
        renderFeeDetail();
      } catch (err) {
        showToast(err.message || "Failed to remove invoice.");
      }
    });
  });

  payBody.querySelectorAll(".row-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const payId = btn.dataset.id;
      if (!confirm("Remove this payment record?")) return;
      try {
        await API.deletePayment(payId);
        rec.payments = rec.payments.filter((p) => String(p.id) !== String(payId));
        showToast("Payment record removed.");
        renderFeeDetail();
      } catch (err) {
        showToast(err.message || "Failed to remove payment.");
      }
    });
  });
}

function initFees() {
  document.getElementById("feeStudentSelect").addEventListener("change", renderFeeDetail);

  const currencySelect = document.getElementById("currencySelect");
  currencySelect.innerHTML = Object.entries(CURRENCIES)
    .map(([code, c]) => `<option value="${code}">${c.symbol} ${c.label} (${code})</option>`)
    .join("");
  currencySelect.value = currentCurrency;

  currencySelect.addEventListener("change", async () => {
    currentCurrency = currencySelect.value;
    await API.saveSetting("currency", currentCurrency);
    renderFeeDetail();
  });

  document.getElementById("emailInvoiceBtn").addEventListener("click", () => {
    const id = document.getElementById("feeStudentSelect").value;
    const student = DB.students.find((s) => String(s.id) === String(id));
    if (!student || !student.email) return;

    const rec = getFeeRecord(id);
    const totalInvoiced = round2(rec.invoices.reduce((sum, i) => sum + Number(i.amount), 0));
    const totalPaid = round2(rec.payments.reduce((sum, p) => sum + Number(p.amount), 0));
    const outstanding = round2(totalInvoiced - totalPaid);

    const subject = `Fee Invoice — ${student.name} (${student.cls})`;
    const lines = [];
    lines.push(`Dear Parent/Guardian,`);
    lines.push("");
    lines.push(`Here is the current fee status for ${student.name} (${student.cls}, Adm. No. ${student.admno}).`);
    lines.push("");
    lines.push("INVOICES");
    if (rec.invoices.length === 0) {
      lines.push("  (none on file)");
    } else {
      [...rec.invoices].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((i) => {
        lines.push(`  - ${formatDateLabel(i.date)}: ${i.desc} — ${formatCurrency(i.amount)}${i.due ? ` (due ${formatDateLabel(i.due)})` : ""}`);
      });
    }
    lines.push("");
    lines.push("PAYMENTS RECEIVED");
    if (rec.payments.length === 0) {
      lines.push("  (none on file)");
    } else {
      [...rec.payments].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((p) => {
        lines.push(`  - ${formatDateLabel(p.date)}: ${formatCurrency(p.amount)} via ${p.method}${p.note ? ` — ${p.note}` : ""}`);
      });
    }
    lines.push("");
    lines.push(`Total invoiced: ${formatCurrency(totalInvoiced)}`);
    lines.push(`Total paid: ${formatCurrency(totalPaid)}`);
    lines.push(
      outstanding > 0
        ? `Outstanding balance: ${formatCurrency(outstanding)} — please settle at your earliest convenience.`
        : outstanding < 0
        ? `Credit balance: ${formatCurrency(Math.abs(outstanding))}.`
        : `Balance: fully settled. Thank you.`
    );
    lines.push("");
    lines.push("Regards,");
    lines.push("Rollbook — School Register");

    const body = lines.join("\n");
    const mailto = `mailto:${encodeURIComponent(student.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });

  const invOverlay = document.getElementById("invoiceModalOverlay");
  const invForm = document.getElementById("invoiceForm");
  function closeInvoiceModal() {
    invOverlay.classList.remove("is-open");
    invForm.reset();
  }
  document.getElementById("openInvoiceModalBtn").addEventListener("click", () => {
    invForm.reset();
    invOverlay.classList.add("is-open");
    document.getElementById("inv_desc").focus();
  });
  document.getElementById("invoiceModalClose").addEventListener("click", closeInvoiceModal);
  document.getElementById("invoiceCancelBtn").addEventListener("click", closeInvoiceModal);
  invOverlay.addEventListener("click", (e) => { if (e.target === invOverlay) closeInvoiceModal(); });

  invForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("feeStudentSelect").value;
    if (!id) return;
    const desc = document.getElementById("inv_desc").value.trim();
    const amount = parseFloat(document.getElementById("inv_amount").value);
    const due = document.getElementById("inv_due").value;
    if (!desc || !(amount > 0)) {
      showToast("Enter a description and an amount greater than zero.");
      return;
    }

    const submitBtn = invForm.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating...";

    try {
      const newInvoice = await API.createInvoice({
        studentId: id,
        desc,
        amount,
        due,
        date: todayISO(),
      });
      getFeeRecord(id).invoices.push(newInvoice);
      closeInvoiceModal();
      showToast("Invoice created.");
      renderFeeDetail();
    } catch (err) {
      showToast(err.message || "Failed to create invoice.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  });

  const payOverlay = document.getElementById("paymentModalOverlay");
  const payForm = document.getElementById("paymentForm");
  function closePaymentModal() {
    payOverlay.classList.remove("is-open");
    payForm.reset();
  }
  document.getElementById("openPaymentModalBtn").addEventListener("click", () => {
    payForm.reset();
    payOverlay.classList.add("is-open");
    document.getElementById("pay_amount").focus();
  });
  document.getElementById("paymentModalClose").addEventListener("click", closePaymentModal);
  document.getElementById("paymentCancelBtn").addEventListener("click", closePaymentModal);
  payOverlay.addEventListener("click", (e) => { if (e.target === payOverlay) closePaymentModal(); });

  payForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("feeStudentSelect").value;
    if (!id) return;
    const amount = parseFloat(document.getElementById("pay_amount").value);
    const method = document.getElementById("pay_method").value;
    const note = document.getElementById("pay_note").value.trim();
    if (!(amount > 0)) {
      showToast("Enter a payment amount greater than zero.");
      return;
    }

    const submitBtn = payForm.querySelector('button[type="submit"]');
    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Recording...";

    try {
      const newPayment = await API.recordPayment({
        studentId: id,
        amount,
        method,
        note,
        date: todayISO(),
      });
      getFeeRecord(id).payments.push(newPayment);
      closePaymentModal();
      showToast("Payment recorded.");
      renderFeeDetail();
    } catch (err) {
      showToast(err.message || "Failed to record payment.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
    }
  });
}

/* ===========================================================
   Utilities
   =========================================================== */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ===========================================================
   Boot
   =========================================================== */
async function boot() {
  document.getElementById("todayLabel").textContent = formatDateLabel(todayISO());
  initNav();
  initStudentForm();
  initStudentProfile();
  initAttendance();
  initRecords();
  initFees();

  // Load state from MySQL backend
  await API.bootstrap();

  // Sync currency dropdown
  const currencySelect = document.getElementById("currencySelect");
  if (currencySelect) {
    currencySelect.value = currentCurrency;
  }

  // Initial renders
  renderDashboard();
  renderStudents();
  populateClassFilter();
  populateStudentSelect();
  populateFeeStudentSelect();
}

document.addEventListener("DOMContentLoaded", boot);
