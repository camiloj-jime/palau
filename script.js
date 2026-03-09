const usuarios = [
    { user: "admin", pass: "admin" },
    { user: "profesor", pass: "1234" }
];

// Attendance states with codes, labels, and colors
const estadosConfig = {
    "I": { label: "Inasistencia", color: "#ef4444" }, // Rojo
    "IE": { label: "Inasistencia con excusa escrita", color: "#f97316" }, // Naranja
    "LTS": { label: "Llegada tarde al salón", color: "#eab308" }, // Amarillo
    "LTC": { label: "Llegada tarde al colegio", color: "#fef08a" }, // Amarillo claro
    "SA": { label: "Suspensión académica", color: "#a855f7" }, // Morado
    "E": { label: "Enfermedad", color: "#22c55e" }, // Verde
    "SAu": { label: "Salida con autorización", color: "#3b82f6" }, // Azul
    "IET": { label: "Inasistencia con excusa telefónica", color: "#ec4899" } // Rosa
};

function getStateColor(code) {
    return estadosConfig[code]?.color || "#ffffff";
}

function createSelectOptions() {
    let html = '<option value="">Seleccionar</option>';
    Object.keys(estadosConfig).forEach(code => {
        html += `<option value="${code}" style="background:${getStateColor(code)}; color:white;">${code} - ${estadosConfig[code].label}</option>`;
    });
    return html;
}

const tabla = document.getElementById("tabla");
let contador = 0;

function showMessage(msg, type = "info", duration = 3000) {
    const el = document.getElementById("message");
    el.textContent = msg;
    el.className = `message ${type}`;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, duration);
}

function login() {
    const u = document.getElementById("usuario").value;
    const p = document.getElementById("clave").value;
    const acceso = usuarios.some(x => x.user === u && x.pass === p);

    if (acceso) {
        document.getElementById("login").style.display = "none";
        document.getElementById("panel").style.display = "block";
        showMessage("Bienvenido", "success");
    } else {
        showMessage("Datos incorrectos", "error");
    }
}

function renumerar() {
    for (let i = 1; i < tabla.rows.length; i++) {
        tabla.rows[i].cells[0].innerText = i;
    }
    contador = tabla.rows.length - 1;
}

function eliminarFila(e) {
    const row = e.target.closest("tr");
    if (row) {
        tabla.deleteRow(row.rowIndex);
        renumerar();
        actualizar();
        autoSave();
    }
}

function agregar() {
    const nombreInput = document.getElementById("nombreEstudiante");
    const nombre = nombreInput.value.trim();
    if (!nombre) return;

    // comprobación de duplicados
    for (let i = 1; i < tabla.rows.length; i++) {
        if (tabla.rows[i].cells[1].innerText.trim().toLowerCase() === nombre.toLowerCase()) {
            showMessage("Estudiante ya agregado", "warning");
            return;
        }
    }

    contador++;
    const fila = tabla.insertRow();
    fila.insertCell(0).innerText = contador;
    fila.insertCell(1).innerText = nombre;
    const days = currentDaysCount();
    // create a cell for each day
    for (let d = 0; d < days; d++) {
        const celdaEstado = fila.insertCell();
        celdaEstado.innerHTML = `
            <select onchange="actualizarColor(this); actualizar(); autoSave();" class="estado-select">
                ${createSelectOptions()}
            </select>
        `;
    }
    const celdaAcciones = fila.insertCell();
    const btn = document.createElement("button");
    btn.textContent = "Eliminar";
    btn.className = "btn-delete";
    btn.addEventListener("click", eliminarFila);
    celdaAcciones.appendChild(btn);

    nombreInput.value = "";
    actualizar();
    autoSave();
}

function actualizar() {
    const total = tabla.rows.length - 1;
    let presentes = 0;
    let ausentes = 0;
    const days = currentDaysCount();

    for (let i = 1; i < tabla.rows.length; i++) {
        // count present/absent across all days
        for (let d = 0; d < days; d++) {
            const estado = tabla.rows[i].cells[2 + d].querySelector("select").value;
            // I is inasistencia (ausente)
            if (estado === "I") ausentes++;
        }
    }

    document.getElementById("total").innerText = total;
    document.getElementById("presentes").innerText = presentes;
    document.getElementById("ausentes").innerText = ausentes;
}

function autoSave() {
    const key = clave();
    if (!key) return;
    
    const datos = [];
    const days = currentDaysCount();
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1].innerText;
        const estados = [];
        for (let d = 0; d < days; d++) {
            estados.push(tabla.rows[i].cells[2 + d].querySelector("select").value);
        }
        datos.push({ nombre, estados });
    }
    localStorage.setItem(key, JSON.stringify(datos));
}

function convertOldToNew(oldState) {
    const map = { "Presente": "P", "Tarde": "LTC", "Ausente": "I", "Excusa": "IE", "Permiso": "SAu" };
    return map[oldState] || oldState;
}

function actualizarColor(selectElement) {
    const code = selectElement.value;
    const color = getStateColor(code);
    selectElement.style.backgroundColor = color;
    selectElement.style.color = code ? "white" : "black";
}

function clave() {
    const anio = document.getElementById("anio").value;
    const mes = document.getElementById("mes").value;
    const salon = document.getElementById("salon").value;
    if (!anio || !mes || !salon) {
        showMessage("Seleccione año, mes y salón antes", "warning");
        return "";
    }
    return anio + mes + salon;
}

function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

function currentDaysCount() {
    const year = parseInt(document.getElementById("anio").value) || new Date().getFullYear();
    const month = document.getElementById("mes").selectedIndex;
    return daysInMonth(year, month);
}

function buildHeaders() {
    const days = currentDaysCount();
    // start fresh
    tabla.innerHTML = "";
    const header = tabla.insertRow();
    header.insertCell().outerHTML = '<th>#</th>';
    header.insertCell().outerHTML = '<th>Nombre</th>';
    for (let d = 1; d <= days; d++) {
        header.insertCell().outerHTML = `<th>${d}</th>`;
    }
    header.insertCell().outerHTML = '<th>Acciones</th>';
}

function updateDayOptions() {
    const days = currentDaysCount();
    const inicio = document.getElementById("diaInicio");
    const fin = document.getElementById("diaFin");
    inicio.innerHTML = "";
    fin.innerHTML = "";
    for (let d = 1; d <= days; d++) {
        const op1 = document.createElement("option");
        op1.value = d;
        op1.text = d;
        inicio.appendChild(op1);
        const op2 = op1.cloneNode(true);
        fin.appendChild(op2);
    }
    inicio.value = 1;
    fin.value = days;
}

function clearTable() {
    buildHeaders();
    contador = 0;
    actualizar();
    // auto-load when clearing table
    cargarSilent();
}

function cargarSilent() {
    const key = clave();
    if (!key) return;
    const datos = JSON.parse(localStorage.getItem(key));
    if (!datos) return;

    // rebuild header to match current month
    buildHeaders();
    contador = 0;
    const days = currentDaysCount();
    datos.forEach(d => {
        contador++;
        const fila = tabla.insertRow();
        fila.insertCell(0).innerText = contador;
        fila.insertCell(1).innerText = d.nombre;
        // handle old format with d.estado
        const estados = d.estados || Array(days).fill(d.estado || "P");
        for (let j = 0; j < days; j++) {
            const code = estados[j];
            const color = getStateColor(code);
            const cell = fila.insertCell();
            const selectHtml = `
                <select onchange="actualizarColor(this); actualizar(); autoSave();" class="estado-select" style="background:${color}; color:white;">
                    ${createSelectOptions()}
                </select>
            `;
            cell.innerHTML = selectHtml;
            // Set value after HTML is rendered
            const select = cell.querySelector("select");
            if (select) {
                select.value = code;
                actualizarColor(select);
            }
        }
        const celdaAcc = fila.insertCell();
        const btn = document.createElement("button");
        btn.textContent = "Eliminar";
        btn.className = "btn-delete";
        btn.addEventListener("click", eliminarFila);
        celdaAcc.appendChild(btn);
    });
    actualizar();
}

// auto-clear and update days when selectors change to avoid mixing cursos
["anio", "mes", "salon"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
        updateDayOptions();
        clearTable();
    });
});

function guardar() {
    autoSave();
    showMessage("Asistencia guardada", "success");
}

function cargar() {
    const key = clave();
    if (!key) return;
    const datos = JSON.parse(localStorage.getItem(key));
    if (!datos) { showMessage("No hay datos"); return; }

    // rebuild header to match current month
    clearTable();
    contador = 0;
    const days = currentDaysCount();
    datos.forEach(d => {
        contador++;
        const fila = tabla.insertRow();
        fila.insertCell(0).innerText = contador;
        fila.insertCell(1).innerText = d.nombre;
        // handle old format with d.estado
        const estados = d.estados || Array(days).fill(d.estado || "P");
        for (let j = 0; j < days; j++) {
            const code = estados[j];
            const color = getStateColor(code);
            const cell = fila.insertCell();
            const selectHtml = `
                <select onchange="actualizarColor(this); actualizar()" class="estado-select" style="background:${color}; color:white;">
                    ${createSelectOptions()}
                </select>
            `;
            cell.innerHTML = selectHtml;
            // Set value after HTML is rendered
            const select = cell.querySelector("select");
            if (select) {
                select.value = code;
                actualizarColor(select);
            }
        }
        const celdaAcc = fila.insertCell();
        const btn = document.createElement("button");
        btn.textContent = "Eliminar";
        btn.className = "btn-delete";
        btn.addEventListener("click", eliminarFila);
        celdaAcc.appendChild(btn);
    });
    actualizar();
}

function exportar() {
    const days = currentDaysCount();
    const start = parseInt(document.getElementById("diaInicio").value) || 1;
    const end = parseInt(document.getElementById("diaFin").value) || days;
    const clone = tabla.cloneNode(true);
    const dayColsStart = 2; // index of first day column
    const dayColsEnd = dayColsStart + days - 1;
    
    // Add colors to each cell in export
    for (let r = 0; r < clone.rows.length; r++) {
        for (let c = dayColsEnd; c >= dayColsStart; c--) {
            const dayIndex = c - dayColsStart + 1;
            if (dayIndex < start || dayIndex > end) {
                clone.rows[r].deleteCell(c);
            } else {
                // Color the cell based on the selected value
                const originalCell = tabla.rows[r].cells[c];
                const select = originalCell.querySelector("select");
                if (select) {
                    const code = select.value;
                    const color = getStateColor(code);
                    clone.rows[r].cells[c].style.backgroundColor = color;
                    clone.rows[r].cells[c].style.color = code ? "white" : "black";
                    clone.rows[r].cells[c].innerText = code || "";
                }
            }
        }
    }
    
    const html = clone.outerHTML;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${start}-${end}.xls`;
    link.click();
}

function resumenAnual() {
    const year = document.getElementById("anio").value;
    const salon = document.getElementById("salon").value;
    if (!year || !salon) { showMessage("Seleccione año y salón", "warning"); return; }
    const months = Array.from(document.getElementById("mes").options).map(o => o.text);
    const totals = {};
    months.forEach(m => {
        const key = year + m + salon;
        const datos = JSON.parse(localStorage.getItem(key));
        if (datos) {
            datos.forEach(d => {
                if (!totals[d.nombre]) totals[d.nombre] = 0;
                const estados = d.estados || [d.estado];
                // Count inasistencias (code I) and related codes
                estados.forEach(s => { 
                    if (s === "I" || s === "IE" || s === "IET") totals[d.nombre]++; 
                });
            });
        }
    });
    let report = `Resumen de ausencias/inasistencias en ${year} salón ${salon}\n\n`;
    Object.keys(totals).sort().forEach(n => { report += `${n}: ${totals[n]}\n`; });
    alert(report);
}

// search across all stored cursos
function searchStudent() {
    const term = document.getElementById("searchInput").value.trim().toLowerCase();
    const resultsDiv = document.getElementById("searchResults");
    resultsDiv.style.display = "block";
    resultsDiv.innerHTML = "";
    if (!term) {
        resultsDiv.textContent = "Ingrese nombre o apellido para buscar.";
        return;
    }
    const found = {};
    // Group by student name
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!/^\d{4}/.test(key)) continue; // skip unrelated keys
        const datos = JSON.parse(localStorage.getItem(key));
        if (!datos) continue;
        datos.forEach(d => {
            if (d.nombre.toLowerCase().includes(term)) {
                if (!found[d.nombre]) found[d.nombre] = [];
                found[d.nombre].push(key);
            }
        });
    }
    if (Object.keys(found).length === 0) {
        resultsDiv.textContent = "No se encontró ningún estudiante.";
    } else {
        Object.keys(found).sort().forEach(nombre => {
            const div = document.createElement("div");
            div.style.marginBottom = "15px";
            div.style.padding = "10px";
            div.style.backgroundColor = "#f0f4f8";
            div.style.borderLeft = "4px solid #2563eb";
            div.style.borderRadius = "4px";
            
            const title = document.createElement("strong");
            title.textContent = nombre;
            div.appendChild(title);
            
            const selectDiv = document.createElement("div");
            selectDiv.style.marginTop = "8px";
            const label = document.createElement("label");
            label.style.display = "block";
            label.style.marginBottom = "5px";
            label.style.fontSize = "12px";
            label.textContent = "Selecciona un mes/curso:";
            selectDiv.appendChild(label);
            
            const select = document.createElement("select");
            select.style.padding = "5px";
            select.style.borderRadius = "4px";
            select.style.border = "1px solid #ccc";
            const defaultOp = document.createElement("option");
            defaultOp.value = "";
            defaultOp.text = "-- Elige un registro --";
            select.appendChild(defaultOp);
            
            found[nombre].forEach(key => {
                const op = document.createElement("option");
                op.value = key;
                op.text = `${key.substring(4)} (${key.substring(0, 4)})`; // Formato: Mes (Año)
                select.appendChild(op);
            });
            
            select.addEventListener("change", function() {
                if (this.value) {
                    loadStudentRecord(this.value, nombre);
                }
            });
            
            selectDiv.appendChild(select);
            div.appendChild(selectDiv);
            resultsDiv.appendChild(div);
        });
    }
}

function loadStudentRecord(key, studentName) {
    // Parse the key to get year, month, class
    const year = key.substring(0, 4);
    const resto = key.substring(4);
    // Find where the salon code starts (last 1-3 characters that match salon options)
    const salones = Array.from(document.getElementById("salon").options).map(o => o.value);
    let salon = "";
    let monthName = resto;
    for (let s of salones) {
        if (resto.endsWith(s)) {
            salon = s;
            monthName = resto.substring(0, resto.length - s.length);
            break;
        }
    }
    
    // Set year and month
    document.getElementById("anio").value = year;
    // Find month index by name
    const mesOptions = Array.from(document.getElementById("mes").options);
    const mesIndex = mesOptions.findIndex(o => o.text === monthName);
    if (mesIndex >= 0) {
        document.getElementById("mes").selectedIndex = mesIndex;
    } else {
        document.getElementById("mes").value = monthName;
    }
    document.getElementById("salon").value = salon;
    
    // Trigger change event to load data
    document.getElementById("mes").dispatchEvent(new Event("change"));
    
    showMessage(`Cargando: ${studentName} - ${monthName} de ${year} (${salon})`, "info");
}

function bulkAdd() {
    const text = document.getElementById("listaEstudiantes").value;
    if (!text.trim()) return;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    lines.forEach(name => {
        document.getElementById("nombreEstudiante").value = name;
        agregar();
    });
    document.getElementById("listaEstudiantes").value = "";
}

(function initYearOptions() {
    const anio = document.getElementById("anio");
    const actual = new Date().getFullYear();
    for (let i = 2020; i <= 2035; i++) {
        const op = document.createElement("option");
        op.value = i;
        op.text = i;
        if (i === actual) op.selected = true;
        anio.appendChild(op);
    }
    // after populating years, set day options and headers for initial view
    updateDayOptions();
    buildHeaders();
})();
