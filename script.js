const usuarios = [
    { user: "admin", pass: "admin" },
    { user: "profesor", pass: "1234" }
];

const estadosConfig = {
    "P": { label: "Presente", color: "#22c55e" },
    "I": { label: "Inasistencia", color: "#ef4444" },
    "IE": { label: "Excusa escrita", color: "#f97316" },
    "LTS": { label: "Llegada tarde salón", color: "#eab308" },
    "LTC": { label: "Llegada tarde colegio", color: "#fde047" },
    "SA": { label: "Suspensión académica", color: "#a855f7" },
    "E": { label: "Enfermedad", color: "#3b82f6" },
    "SAu": { label: "Salida autorizada", color: "#06b6d4" },
    "IET": { label: "Excusa telefónica", color: "#ec4899" }
};

function getStateColor(code) {
    return estadosConfig[code]?.color || "#ffffff";
}

function createSelectOptions() {
    let html = '<option value="">-</option>';
    Object.keys(estadosConfig).forEach(code => {
        html += `<option value="${code}" data-code="${code}">${estadosConfig[code].label}</option>`;
    });
    return html;
}

const tabla = document.getElementById("tabla");
let contador = 0;

function login() {

    const u = document.getElementById("usuario").value;
    const p = document.getElementById("clave").value;

    const acceso = usuarios.some(x => x.user === u && x.pass === p);

    if (acceso) {
        sessionStorage.setItem("usuarioLogueado", u);
        document.getElementById("login").style.display = "none";
        document.getElementById("panel").style.display = "block";
    } else {
        alert("Datos incorrectos");
    }
}

function logout() {
    sessionStorage.removeItem("usuarioLogueado");
    document.getElementById("login").style.display = "block";
    document.getElementById("panel").style.display = "none";
    document.getElementById("usuario").value = "";
    document.getElementById("clave").value = "";
}

function verificarSesion() {
    if (sessionStorage.getItem("usuarioLogueado")) {
        document.getElementById("login").style.display = "none";
        document.getElementById("panel").style.display = "block";
    }
}

function agregar() {

    const nombre = document.getElementById("nombreEstudiante").value.trim();

    if (!nombre) return;

    contador++;

    const fila = tabla.insertRow();

    fila.insertCell(0).innerText = contador;
    fila.insertCell(1).innerText = nombre;

    const days = currentDaysCount();

    for (let d = 0; d < days; d++) {

        const celda = fila.insertCell();

        celda.innerHTML = `
        <div class="estado-container">
            <select onchange="actualizarColor(this);autoSave();actualizar()" class="estado">
            ${createSelectOptions()}
            </select>
            <span class="estado-label">-</span>
        </div>
        `;
    }

    const acciones = fila.insertCell();

    acciones.innerHTML = `<button onclick="eliminarFila(this)">Eliminar</button>`;

    document.getElementById("nombreEstudiante").value = "";

    actualizar();
    autoSave();
}

function eliminarFila(btn) {

    const fila = btn.parentNode.parentNode;

    tabla.deleteRow(fila.rowIndex);

    renumerar();

    actualizar();

    autoSave();
}

function renumerar() {

    for (let i = 1; i < tabla.rows.length; i++) {

        tabla.rows[i].cells[0].innerText = i;
    }

    contador = tabla.rows.length - 1;
}

function actualizarColor(select) {

    const color = getStateColor(select.value);
    const codigo = select.value;
    const label = estadosConfig[codigo]?.label || "-";

    select.style.background = color;
    select.style.color = "white";
    select.title = label;
    
    // Actualizar el label visual con solo las iniciales
    const container = select.parentElement;
    const labelSpan = container.querySelector('.estado-label');
    if (labelSpan) {
        labelSpan.textContent = codigo || "-";
        labelSpan.style.background = color;
        labelSpan.style.color = "white";
    }
}

function actualizar() {

    let ausentes = 0;
    let presentes = 0;

    const days = currentDaysCount();

    for (let i = 1; i < tabla.rows.length; i++) {

        for (let d = 0; d < days; d++) {

            const estado = tabla.rows[i].cells[2 + d].querySelector("select").value;

            if (estado === "I") ausentes++;

            if (estado === "P") presentes++;
        }
    }

    document.getElementById("total").innerText = tabla.rows.length - 1;
    document.getElementById("presentes").innerText = presentes;
    document.getElementById("ausentes").innerText = ausentes;
}

function clave() {

    const anio = document.getElementById("anio").value;
    const mes = document.getElementById("mes").value;
    const salon = document.getElementById("salon").value;

    return anio + mes + salon;
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

function cargarSilent() {

    const key = clave();

    const datos = JSON.parse(localStorage.getItem(key));

    if (!datos) return;

    buildHeaders();

    contador = 0;

    datos.forEach(d => {

        contador++;

        const fila = tabla.insertRow();

        fila.insertCell(0).innerText = contador;

        fila.insertCell(1).innerText = d.nombre;

        d.estados.forEach(e => {

            const celda = fila.insertCell();

            celda.innerHTML = `
            <div class="estado-container">
                <select onchange="actualizarColor(this);autoSave();actualizar()" class="estado">
                ${createSelectOptions()}
                </select>
                <span class="estado-label">-</span>
            </div>
            `;

            const select = celda.querySelector("select");

            select.value = e;

            actualizarColor(select);
        });

        fila.insertCell().innerHTML = `<button onclick="eliminarFila(this)">Eliminar</button>`;
    });

    actualizar();
}

function daysInMonth(year, month) {

    return new Date(year, month, 0).getDate();
}

function currentDaysCount() {

    const year = document.getElementById("anio").value;
    const month = document.getElementById("mes").selectedIndex + 1;

    return daysInMonth(year, month);
}

function buildHeaders() {

    const days = currentDaysCount();

    tabla.innerHTML = "";

    const header = tabla.insertRow();

    header.innerHTML = "<th>#</th><th>Nombre</th>";

    for (let d = 1; d <= days; d++) {

        header.innerHTML += `<th>${d}</th>`;
    }

    header.innerHTML += "<th>Acciones</th>";
}

function abrirObservaciones(){
window.location.href="asistencia_observaciones.html";
}

function filtrarEstudiantesAsistencia() {
    const input = document.getElementById("nombreEstudiante");
    const filtro = input.value.toLowerCase();
    const sugerenciasDiv = document.getElementById("sugerenciasEstudiantes");
    
    if (filtro.length === 0) {
        sugerenciasDiv.innerHTML = "";
        sugerenciasDiv.style.display = "none";
        return;
    }
    
    const estudiantes = [];
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1].innerText.toLowerCase();
        if (nombre.includes(filtro)) {
            estudiantes.push(tabla.rows[i].cells[1].innerText);
        }
    }
    
    if (estudiantes.length === 0) {
        sugerenciasDiv.style.display = "none";
        return;
    }
    
    let html = "";
    estudiantes.forEach(est => {
        html += `<div class="sugerencia" onclick="seleccionarEstudiante('${est}')">${est}</div>`;
    });
    
    sugerenciasDiv.innerHTML = html;
    sugerenciasDiv.style.display = "block";
}

function seleccionarEstudiante(nombre) {
    document.getElementById("nombreEstudiante").value = nombre;
    document.getElementById("sugerenciasEstudiantes").innerHTML = "";
}

function volverAsistenciaConSesion() {
    window.location.href = "index.html";
}

function bulkAdd() {
    const lista = document.getElementById("listaEstudiantes").value.trim();
    
    if (!lista) {
        alert("Por favor escribe los nombres en la lista");
        return;
    }
    
    const nombres = lista.split('\n').filter(n => n.trim().length > 0);
    
    if (nombres.length === 0) {
        alert("No hay nombres válidos para agregar");
        return;
    }
    
    nombres.forEach(nombre => {
        document.getElementById("nombreEstudiante").value = nombre.trim();
        agregar();
    });
    
    document.getElementById("listaEstudiantes").value = "";
    alert(`Se agregaron ${nombres.length} estudiantes`);
}

function guardar() {
    autoSave();
    alert("Datos guardados correctamente");
}

function exportar() {
    const salon = document.getElementById("salon").value;
    const mesIndex = document.getElementById("mes").selectedIndex;
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const mesNombre = meses[mesIndex];
    const anio = document.getElementById("anio").value;
    
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asistencia ${mesNombre} ${anio}</title>
    <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, Calibri, sans-serif; background: white; }
        .no-print { display: block; padding: 20px; text-align: center; background: #f0f0f0; border-bottom: 2px solid #333; }
        .no-print button { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; }
        .no-print button:hover { background: #1d4ed8; }
        .content { padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h2 { margin: 10px 0; color: #1e3a8a; font-size: 18px; font-weight: bold; }
        .header p { margin: 5px 0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 10px; text-align: center; font-size: 11px; }
        th { background-color: #2563eb; color: white; font-weight: bold; height: 25px; }
        td { height: 25px; }
        .nombre-col { text-align: left; }
        .numero-col { width: 30px; }
        .leyenda { margin-top: 50px; page-break-before: avoid; }
        .leyenda h3 { color: #1e3a8a; font-size: 12px; margin: 10px 0 8px 0; border-bottom: 1px solid #2563eb; padding-bottom: 3px; }
        .leyenda-items { display: flex; flex-wrap: wrap; gap: 15px; font-size: 9px; line-height: 1.4; }
        .leyenda-item { display: inline-block; }
        .pie { margin-top: 20px; font-size: 10px; text-align: center; color: #999; }
        @media print {
            .no-print { display: none; }
            body { padding: 0; }
            .content { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ IMPRIMIR</button>
    </div>
    <div class="content">
        <div class="header">
            <h2>ASISTENCIA COLEGIO FRANCISCO PALAU Y QUER</h2>
            <p><strong>Mes:</strong> ${mesNombre} | <strong>Año:</strong> ${anio} | <strong>Salón:</strong> ${salon}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th class="numero-col">#</th>
                    <th>Nombre del Estudiante</th>`;
    
    for (let d = 1; d <= currentDaysCount(); d++) {
        html += `<th>${d}</th>`;
    }
    
    html += `</tr>
            </thead>
            <tbody>`;
    
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1].innerText;
        html += `<tr><td class="numero-col">${i}</td><td class="nombre-col">${nombre}</td>`;
        
        for (let d = 2; d < tabla.rows[i].cells.length - 1; d++) {
            const estado = tabla.rows[i].cells[d].querySelector("select")?.value || "";
            html += `<td>${estado}</td>`;
        }
        
        html += `</tr>`;
    }
    
    html += `</tbody>
        </table>
        <div class="leyenda">
            <h3>LEYENDA DE ESTADOS</h3>
            <div class="leyenda-items">`;
    
    // Agregar la leyenda de estados en línea
    Object.keys(estadosConfig).forEach(code => {
        const config = estadosConfig[code];
        const bgColor = config.color;
        html += `<span class="leyenda-item"><strong style="color: ${bgColor};">${code}</strong>=${config.label}</span>`;
    });
    
    html += `</div>
        </div>
        <div class="pie">
            <p>Documento generado automáticamente - Colegio Francisco Palau y Quer</p>
        </div>
    </div>
</body>
</html>`;
    
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia_${salon}_${mesNombre}_${anio}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
}
function clearTable() {
    if (confirm("¿Estás seguro de que quieres limpiar toda la tabla?")) {
        buildHeaders();
        contador = 0;
        actualizar();
        autoSave();
    }
}

function eliminarTodosCurso() {
    const salon = document.getElementById("salon").value;
    
    if (!salon) {
        alert("Por favor selecciona un salón primero");
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar TODOS los estudiantes del ${salon}?`)) {
        const key = clave();
        localStorage.removeItem(key);
        buildHeaders();
        contador = 0;
        actualizar();
        alert(`Se han eliminado todos los estudiantes del ${salon}`);
    }
}

// FUNCIONES PARA OBSERVACIONES
function guardarObservacion() {
    const estudiante = document.getElementById("obsEstudiante").value.trim();
    const grado = document.getElementById("obsGrado").value.trim();
    const fecha = document.getElementById("obsFecha").value;
    const docente = document.getElementById("obsDocente").value.trim();
    const desempeno = document.getElementById("obsDesempeno").value.trim();
    const llamados = document.getElementById("obsLlamados").value.trim();
    const anotaciones = document.getElementById("obsAnotaciones").value.trim();
    const acciones = document.getElementById("obsAcciones").value.trim();
    const ficha = document.getElementById("obsFicha").value.trim();
    const sanciones = document.getElementById("obsSanciones").value.trim();
    const compromiso = document.getElementById("obsCompromiso").value.trim();
    const observaciones = document.getElementById("obsObservaciones").value.trim();
    
    if (!estudiante || !fecha) {
        alert("Por favor completa al menos el nombre del estudiante y la fecha");
        return;
    }
    
    const observacion = {
        estudiante, grado, fecha, docente, desempeno, llamados, 
        anotaciones, acciones, ficha, sanciones, compromiso, observaciones,
        id: Date.now()
    };
    
    let observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
    observaciones_list.push(observacion);
    localStorage.setItem("observaciones", JSON.stringify(observaciones_list));
    
    alert("Observación guardada correctamente");
    
    document.getElementById("obsEstudiante").value = "";
    document.getElementById("obsGrado").value = "";
    document.getElementById("obsFecha").value = "";
    document.getElementById("obsDocente").value = "";
    document.getElementById("obsDesempeno").value = "";
    document.getElementById("obsLlamados").value = "";
    document.getElementById("obsAnotaciones").value = "";
    document.getElementById("obsAcciones").value = "";
    document.getElementById("obsFicha").value = "";
    document.getElementById("obsSanciones").value = "";
    document.getElementById("obsCompromiso").value = "";
    document.getElementById("obsObservaciones").value = "";
    
    cargarObservaciones();
}

function cargarObservaciones() {
    const observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
    const listaDiv = document.getElementById("listaObservaciones");
    
    if (observaciones_list.length === 0) {
        listaDiv.innerHTML = "<p>No hay observaciones registradas</p>";
        return;
    }
    
    let html = "<table style='width:100%; border-collapse: collapse;'>";
    html += "<tr style='background: #2563eb; color: white;'>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Estudiante</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Grado</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Fecha</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Docente</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Desempeño</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Llamados</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Observaciones</th>";
    html += "<th style='border: 1px solid #ddd; padding: 8px;'>Acción</th>";
    html += "</tr>";
    
    observaciones_list.forEach(obs => {
        html += "<tr style='background: #f9f9f9;'>";
        html += `<td style='border: 1px solid #ddd; padding: 8px;'>${obs.estudiante}</td>`;
        html += `<td style='border: 1px solid #ddd; padding: 8px;'>${obs.grado}</td>`;
        html += `<td style='border: 1px solid #ddd; padding: 8px;'>${formatearFecha(obs.fecha)}</td>`;
        html += `<td style='border: 1px solid #ddd; padding: 8px;'>${obs.docente}</td>`;
        html += `<td style='border: 1px solid #ddd; padding: 8px;'>${obs.desempeno}</td>`;
        html += `<td style='border: 1px solid #ddd; padding: 8px;'>${obs.llamados}</td>`;
        const obsText = obs.observaciones || obs.anotaciones || obs.acciones || obs.ficha || obs.sanciones || obs.compromiso || "-";
        html += `<td style='border: 1px solid #ddd; padding: 8px; max-width: 300px;'>${obsText}</td>`;
        html += `<td style='border: 1px solid #ddd; padding: 8px;'><button onclick="eliminarObservacion(${obs.id})" style='background: #ef4444; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;'>Eliminar</button></td>`;
        html += "</tr>";
    });
    
    html += "</table>";
    listaDiv.innerHTML = html;
}

function formatearFecha(fecha) {
    if (!fecha) return "";
    const date = new Date(fecha + "T00:00:00");
    return date.toLocaleDateString("es-ES");
}

function eliminarObservacion(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta observación?")) {
        let observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
        observaciones_list = observaciones_list.filter(obs => obs.id !== id);
        localStorage.setItem("observaciones", JSON.stringify(observaciones_list));
        cargarObservaciones();
    }
}

function exportarObservaciones() {

    const observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];

    if (observaciones_list.length === 0) {

        alert("No hay observaciones para exportar");

        return;
    }

    const ahora = new Date();

    const mesNombre = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][ahora.getMonth()];

    const anioActual = ahora.getFullYear();

    let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Observaciones ${mesNombre} ${anioActual}</title>
    <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, Calibri, sans-serif; background: white; }
        .no-print { display: block; padding: 20px; text-align: center; background: #f0f0f0; border-bottom: 2px solid #333; }
        .no-print button { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; }
        .no-print button:hover { background: #1d4ed8; }
        .content { padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h2 { margin: 10px 0; color: #1e3a8a; font-size: 18px; font-weight: bold; }
        .header p { margin: 5px 0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 10px; text-align: left; font-size: 11px; }
        th { background-color: #2563eb; color: white; font-weight: bold; height: 25px; }
        td { padding: 8px; }
        .pie { margin-top: 20px; font-size: 10px; text-align: center; color: #999; }
        @media print {
            .no-print { display: none; }
            body { padding: 0; }
            .content { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">🖨️ IMPRIMIR</button>
    </div>
    <div class="content">
        <div class="header">
            <h2>OBSERVACIONES COLEGIO FRANCISCO PALAU Y QUER</h2>
            <p><strong>Mes:</strong> ${mesNombre} | <strong>Año:</strong> ${anioActual}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Estudiante</th>
                    <th>Grado</th>
                    <th>Fecha</th>
                    <th>Docente</th>
                    <th>Desempeño</th>
                    <th>Llamados</th>
                    <th>Anotaciones</th>
                    <th>Acciones</th>
                    <th>Ficha</th>
                    <th>Sanciones</th>
                    <th>Compromiso</th>
                    <th>Observaciones</th>
                </tr>
            </thead>
            <tbody>`;

    observaciones_list.forEach(obs => {
        const fecha = formatearFecha(obs.fecha);
        html += `<tr>
                    <td>${obs.estudiante}</td>
                    <td>${obs.grado}</td>
                    <td>${fecha}</td>
                    <td>${obs.docente}</td>
                    <td>${obs.desempeno}</td>
                    <td>${obs.llamados}</td>
                    <td>${obs.anotaciones}</td>
                    <td>${obs.acciones}</td>
                    <td>${obs.ficha}</td>
                    <td>${obs.sanciones}</td>
                    <td>${obs.compromiso}</td>
                    <td>${obs.observaciones}</td>
                </tr>`;
    });

    html += `</tbody>
        </table>
        <div class="pie">
            <p>Documento generado automáticamente - Colegio Francisco Palau y Quer</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });

    const link = document.createElement("a");

    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);

    link.setAttribute("download", `observaciones_${mesNombre}_${anioActual}.html`);

    link.style.visibility = "hidden";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}

function mostrarConteoCurso() {
    const curso = document.getElementById("searchCurso").value;
    
    if (!curso) {
        alert("Por favor selecciona un curso");
        return;
    }
    
    const observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
    const conteo = observaciones_list.filter(obs => obs.grado === curso).length;
    
    const conteDiv = document.getElementById("conteoCurso");
    conteDiv.textContent = `Observaciones en ${curso}: ${conteo}`;
    conteDiv.style.display = "block";
}

["anio","mes","salon"].forEach(id=>{

document.getElementById(id).addEventListener("change",()=>{

buildHeaders();

cargarSilent();

})

});

(function(){
const anio=document.getElementById("anio");
const actual=new Date().getFullYear();
for(let i=2024;i<=2035;i++){
const op=document.createElement("option");
op.value=i;
op.text=i;
if(i===actual)op.selected=true;
anio.appendChild(op);
}
buildHeaders();
verificarSesion();
})();

