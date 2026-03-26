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
    "IET": { label: "Excusa telefónica", color: "#ec4899" },
    "CM": { label: "Cita médica", color: "#8b5cf6" },
    "PL": { label: "Personal", color: "#06b6d4" }
};

let tabla = null;
let contador = 0;

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
    // Cancelar listener en tiempo real
    if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
        unsubscribe = null;
    }

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
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) {
        alert("Error: tabla no encontrada");
        return;
    }

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
    llenarSelectorEstudiantes();

    const grado = document.getElementById("salon").value;
    guardarEstudiante(nombre, grado);
}
async function guardarDatos(){
    try {
        await window.addDoc(window.collection(window.db, "mensajes"), {
            nombre: document.getElementById("nombre").value,
            mensaje: document.getElementById("mensaje").value,
            fecha: new Date()
        });
        alert("Datos guardados correctamente en Firebase");
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar los datos");
    }
}

async function guardarEstudiante(nombre, grado) {
    try {
        await window.addDoc(window.collection(window.db, "estudiantes"), {
            nombre: nombre,
            grado: grado,
            fechaRegistro: new Date()
        });
        alert("Estudiante guardado correctamente en Firebase");
    } catch (error) {
        console.error("Error al guardar estudiante:", error);
        alert("Error al guardar el estudiante");
    }
}

async function cargarEstudiantes() {
    try {
        const grado = document.getElementById("salon").value;

        // Usar query con where para filtrar en Firebase directamente
        const q = window.query(
            window.collection(window.db, "estudiantes"),
            window.where("grado", "==", grado)
        );

        const querySnapshot = await window.getDocs(q);
        const estudiantes = [];

        querySnapshot.forEach((doc) => {
            estudiantes.push({
                id: doc.id,
                ...doc.data()
            });
            console.log("Estudiante cargado:", doc.data());
        });

        return estudiantes;
    } catch (error) {
        console.error("Error al cargar estudiantes:", error);
        return [];
    }
}

function eliminarFila(btn) {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    const fila = btn.parentNode.parentNode;

    tabla.deleteRow(fila.rowIndex);

    renumerar();

    actualizar();

    autoSave();
}

function renumerar() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    for (let i = 1; i < tabla.rows.length; i++) {

        tabla.rows[i].cells[0].innerText = i;
    }

    contador = tabla.rows.length - 1;
}

function actualizarColor(select) {

    const color = getStateColor(select.value);
    const codigo = select.value;
    const label = estadosConfig[codigo]?.label || "-";

    select.style.backgroundColor = color;
  select.style.color = codigo ? "black" : "#999";
    select.style.borderColor = color;
    select.style.textShadow = "none";
    select.title = label;

    // Actualizar el label visual con solo las iniciales
     const container = select.parentElement;
    const labelSpan = container.querySelector('.estado-label');
    if (labelSpan) {
        labelSpan.textContent = codigo || "-";
        labelSpan.style.background = color;
       labelSpan.style.color = "black";
    }
}

function actualizar() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

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
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

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

    // También guardar en Firebase
    guardarAsistenciaFirebase(datos);
}

async function guardarAsistenciaFirebase(datos) {
    try {
        const anio = document.getElementById("anio").value;
        const mes = document.getElementById("mes").value;
        const salon = document.getElementById("salon").value;

        // Crear un ID único para este grado/mes/año
        const docId = `${anio}-${mes.toLowerCase()}-${salon}`;

        // Usar setDoc para actualizar/crear el documento (no addDoc)
        const docRef = window.doc(window.db, "asistencia", docId);

        await window.setDoc(docRef, {
            anio: anio,
            mes: mes,
            grado: salon,
            estudiantes: datos,
            fechaActualizacion: new Date().getTime(),
            docId: docId
        });

        console.log("Asistencia guardada en Firebase para", salon, mes, anio);
    } catch (error) {
        console.error("Error al guardar asistencia en Firebase:", error);
    }
}

let unsubscribe = null;

function escucharActualizacionesFirebase() {
    try {
        const anio = document.getElementById("anio").value;
        const mes = document.getElementById("mes").value;
        const salon = document.getElementById("salon").value;
        const docId = `${anio}-${mes.toLowerCase()}-${salon}`;

        // Cancelar escucha anterior si existe
        if (unsubscribe) {
            unsubscribe();
        }

        // Escuchar cambios en tiempo real
        const docRef = window.doc(window.db, "asistencia", docId);
        unsubscribe = window.onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Asistencia actualizada en tiempo real:", data);

                // Recargar la tabla con los nuevos datos si es necesario
                if (data.estudiantes && data.estudiantes.length > 0) {
                    cargarEstudiantesEnTabla(data.estudiantes);
                    actualizar();
                }
            }
        });
    } catch (error) {
        console.error("Error al configurar escucha de Firebase:", error);
    }
}

async function cargarAsistenciaFirebase() {
    try {
        const anio = document.getElementById("anio").value;
        const mes = document.getElementById("mes").value;
        const salon = document.getElementById("salon").value;

        const docId = `${anio}-${mes.toLowerCase()}-${salon}`;

        const docRef = window.doc(window.db, "asistencia", docId);

        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {

            const data = docSnap.data();

            console.log("Asistencia cargada:", data);

            return data.estudiantes;

        }

        return null;

    } catch (error) {

        console.error("Error al cargar asistencia:", error);

        return null;

    }
}

async function cargarSilent() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    const key = clave();
    const datos = JSON.parse(localStorage.getItem(key));

    // Si hay datos en localStorage, usarlos
    if (datos && datos.length > 0) {
        cargarEstudiantesEnTabla(datos); // Ya limpia tabla y reinicia contador
        actualizar();
        escucharActualizacionesFirebase();
        return;
    }

    // Intentar cargar de Firebase
    const datosFirebase = await cargarAsistenciaFirebase();
    if (datosFirebase && datosFirebase.length > 0) {
        cargarEstudiantesEnTabla(datosFirebase);
        // Guardar en localStorage también
        localStorage.setItem(key, JSON.stringify(datosFirebase));
        actualizar();
        escucharActualizacionesFirebase();
        return;
    }

    // Si no hay datos de asistencia, cargar estudiantes de Firebase
    const estudiantesFirebase = await cargarEstudiantes();
    if (estudiantesFirebase.length > 0) {
        buildHeaders();  // ← LIMPIA TABLA
        contador = 0;    // ← REINICIA CONTADOR

        estudiantesFirebase.forEach(d => {
            contador++;
            const fila = tabla.insertRow();
            fila.insertCell(0).innerText = contador;
            fila.insertCell(1).innerText = d.nombre;

            const days = currentDaysCount();
            for (let i = 0; i < days; i++) {
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

            fila.insertCell().innerHTML = `<button onclick="eliminarFila(this)">Eliminar</button>`;
        });

        actualizar();
        escucharActualizacionesFirebase();
    }
}

function cargarEstudiantesEnTabla(dados) {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    buildHeaders();   // ← LIMPIA TABLA
    contador = 0;     // ← REINICIA CONTADOR

    dados.forEach(d => {
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

llenarSelectorEstudiantes();
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
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

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
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    const input = document.getElementById("nombreEstudiante");
    const filtro = input.value.toLowerCase().trim();

    // Si no hay filtro, mostrar todos
    if (filtro.length === 0) {
        for (let i = 1; i < tabla.rows.length; i++) {
            tabla.rows[i].style.display = "";
        }
        document.getElementById("sugerenciasEstudiantes").style.display = "none";
        return;
    }

    // Filtrar filas por nombre
    let encontrados = 0;
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1].innerText.toLowerCase();
        if (nombre.includes(filtro)) {
            tabla.rows[i].style.display = "";
            encontrados++;
        } else {
            tabla.rows[i].style.display = "none";
        }
    }

    // Mostrar sugerencias completamente visibles arriba
    const sugerenciasDiv = document.getElementById("sugerenciasEstudiantes");
    const estudiantes = [];
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1].innerText.toLowerCase();
        if (nombre.includes(filtro) && !estudiantes.includes(tabla.rows[i].cells[1].innerText)) {
            estudiantes.push(tabla.rows[i].cells[1].innerText);
        }
    }

    if (estudiantes.length > 0 && estudiantes.length <= 5) {
        let html = "";
        estudiantes.forEach(est => {
            html += `<div class="sugerencia" onclick="seleccionarEstudiante('${est}')">${est}</div>`;
        });
        sugerenciasDiv.innerHTML = html;
        sugerenciasDiv.style.display = "block";
    } else {
        sugerenciasDiv.style.display = "none";
    }
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
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) {
        alert("Error: tabla no encontrada");
        return;
    }

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
        .content { padding: 8px; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h2 { margin: 5px 0; color: #1e3a8a; font-size: 14px; font-weight: bold; }
        .header p { margin: 2px 0; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #000; padding: 4px 2px; text-align: center; font-size: 8px; }
        th { background-color: #2563eb; color: white; font-weight: bold; height: auto; line-height: 1.2; }
        td { height: 18px; }
        .nombre-col { text-align: left; padding-left: 4px; }
        .numero-col { width: 25px; }
        .leyenda { margin-top: 15px; page-break-before: avoid; }
        .leyenda h3 { color: #1e3a8a; font-size: 10px; margin: 5px 0 5px 0; border-bottom: 1px solid #2563eb; padding-bottom: 2px; }
        .leyenda-items { display: flex; flex-wrap: wrap; gap: 8px; font-size: 8px; line-height: 1.2; }
        .leyenda-item { display: inline-block; }
        .pie { margin-top: 10px; font-size: 8px; text-align: center; color: #999; }
        @media print {
            .no-print { display: none; }
            body { padding: 0; margin: 0; }
            .content { padding: 5px; }
            @page { margin: 5mm; size: landscape; }
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
        html += `<span class="leyenda-item"><strong style="background-color: ${bgColor}; color: white; padding: 2px 6px; border-radius: 3px;">${code}</strong>=${config.label}</span>`;
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
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    if (confirm("¿Estás seguro de que quieres limpiar los estados de la tabla? Los nombres se mantienen.")) {
        // Recorrer todas las filas (excepto header)
        for (let i = 1; i < tabla.rows.length; i++) {
            // Recorrer las celdas de estado (desde columna 2 hasta la penúltima)
            const fila = tabla.rows[i];
            for (let j = 2; j < fila.cells.length - 1; j++) {
                const select = fila.cells[j].querySelector("select");
                if (select) {
                    select.value = "";
                    actualizarColor(select);
                }
            }
        }
        actualizar();
        autoSave();
    }
}

function eliminarTodosCurso() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

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
        llenarSelectorEstudiantes();
        alert(`Se han eliminado todos los estudiantes del ${salon}`);
    }
}

// FUNCIÓN PARA LLENAR SELECTOR DE ESTUDIANTES DEL CURSO
function llenarSelectorEstudiantes() {
    if (!tabla) tabla = document.getElementById("tabla");
    const selector = document.getElementById("selectorEstudiantesCurso");

    if (!selector) return;

    // Limpiar selector excepto opción principal
    selector.innerHTML = '<option value="">-- Ver Todos --</option>';

    // Agregar todos los nombres de estudiantes de la tabla
    const estudiantes = new Set();
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1]?.innerText;
        if (nombre && nombre.trim()) {
            estudiantes.add(nombre.trim());
        }
    }

    // Convertir a array y agregar al selector
    Array.from(estudiantes).sort().forEach(nombre => {
        const option = document.createElement("option");
        option.value = nombre;
        option.text = nombre;
        selector.appendChild(option);
    });
}

// FUNCIÓN PARA FILTRAR TABLA POR ESTUDIANTE SELECCIONADO
function filtrarPorEstudianteSeleccionado() {
    if (!tabla) tabla = document.getElementById("tabla");
    const selector = document.getElementById("selectorEstudiantesCurso");
    const estudianteSeleccionado = selector.value;

    // Si es vacío, mostrar todos
    if (!estudianteSeleccionado) {
        for (let i = 1; i < tabla.rows.length; i++) {
            tabla.rows[i].style.display = "";
        }
        return;
    }

    // Mostrar solo el estudiante seleccionado
    for (let i = 1; i < tabla.rows.length; i++) {
        const nombre = tabla.rows[i].cells[1]?.innerText;
        if (nombre === estudianteSeleccionado) {
            tabla.rows[i].style.display = "";
        } else {
            tabla.rows[i].style.display = "none";
        }
    }
}

// FUNCIONES PARA OBSERVACIONES
async function guardarObservacionFirebase(observacion) {
    try {
        const grado = observacion.grado || "sin-grado";
        const docRef = window.doc(window.db, "observaciones", grado);

        // Obtener el documento actual
        const docSnap = await window.getDoc(docRef);
        let registros = [];

        if (docSnap.exists()) {
            registros = docSnap.data().registros || [];
        }

        // Agregar la nueva observación
        registros.push(observacion);

        // Guardar de vuelta
        await window.setDoc(docRef, {
            grado: grado,
            registros: registros,
            fechaActualizacion: new Date().getTime()
        });

        console.log("Observación guardada en Firebase para", grado);
    } catch (error) {
        console.error("Error al guardar observación en Firebase:", error);
    }
}

async function cargarObservacionesFirebase() {
    try {
        const observaciones = [];
        const querySnapshot = await window.getDocs(window.collection(window.db, "observaciones"));

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.registros && Array.isArray(data.registros)) {
                observaciones.push(...data.registros);
            }
        });

        return observaciones;
    } catch (error) {
        console.error("Error al cargar observaciones de Firebase:", error);
        return [];
    }
}

async function eliminarObservacionFirebase(id, grado) {
    try {
        const docRef = window.doc(window.db, "observaciones", grado);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            let registros = docSnap.data().registros || [];
            registros = registros.filter(obs => obs.id !== id);

            await window.setDoc(docRef, {
                grado: grado,
                registros: registros,
                fechaActualizacion: new Date().getTime()
            });

            console.log("Observación eliminada de Firebase");
        }
    } catch (error) {
        console.error("Error al eliminar observación de Firebase:", error);
    }
}

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

    // Guardar también en Firebase
    guardarObservacionFirebase(observacion);

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

async function cargarObservaciones() {
    // Intentar cargar de Firebase primero
    const observacionesFirebase = await cargarObservacionesFirebase();

    let observaciones_list = observacionesFirebase || [];

    // Si no hay datos en Firebase, usar localStorage
    if (observaciones_list.length === 0) {
        observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
    }

    // Guardar en localStorage también
    if (observacionesFirebase && observacionesFirebase.length > 0) {
        localStorage.setItem("observaciones", JSON.stringify(observacionesFirebase));
    }

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
        html += `<td style='border: 1px solid #ddd; padding: 8px;'><button onclick="eliminarObservacion(${obs.id}, '${obs.grado}')" style='background: #ef4444; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;'>Eliminar</button></td>`;
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

function eliminarObservacion(id, grado) {
    if (confirm("¿Estás seguro de que quieres eliminar esta observación?")) {
        let observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
        observaciones_list = observaciones_list.filter(obs => obs.id !== id);
        localStorage.setItem("observaciones", JSON.stringify(observaciones_list));

        // Eliminar también de Firebase
        if (grado) {
            eliminarObservacionFirebase(id, grado);
        }

        cargarObservaciones();
    }
}

async function exportarObservaciones() {

    // Cargar desde Firebase primero
    let observaciones_list = await cargarObservacionesFirebase();

    // Si no hay datos en Firebase, usar localStorage
    if (!observaciones_list || observaciones_list.length === 0) {
        observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
    }

    if (observaciones_list.length === 0) {

        alert("No hay observaciones para exportar");

        return;
    }

    // Filtrar por curso si se selecciona uno
    const cursoSeleccionado = document.getElementById("searchCurso").value;
    if (cursoSeleccionado) {
        observaciones_list = observaciones_list.filter(obs => obs.grado === cursoSeleccionado);
        if (observaciones_list.length === 0) {
            alert(`No hay observaciones para el curso ${cursoSeleccionado}`);
            return;
        }
    }

    const ahora = new Date();

    const mesNombre = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][ahora.getMonth()];

    const anioActual = ahora.getFullYear();

    let titulo = `Observaciones ${mesNombre} ${anioActual}`;
    let nombreArchivo = `observaciones_${mesNombre}_${anioActual}.html`;
    if (cursoSeleccionado) {
        titulo += ` - Curso ${cursoSeleccionado}`;
        nombreArchivo = `observaciones_${cursoSeleccionado}_${mesNombre}_${anioActual}.html`;
    }

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
            <p><strong>Mes:</strong> ${mesNombre} | <strong>Año:</strong> ${anioActual}${cursoSeleccionado ? ` | <strong>Curso:</strong> ${cursoSeleccionado}` : ''}</p>
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

    link.setAttribute("download", nombreArchivo);

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
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("change",async ()=>{
            // Primero limpiar la tabla completamente
            if (!tabla) tabla = document.getElementById("tabla");
            if (tabla) {
                buildHeaders();
                contador = 0;
            }

            // Cargar datos del nuevo grupo/mes/año
            await cargarSilent();
        });
    }
});

(async function(){
    // Inicializar tabla
    tabla = document.getElementById("tabla");

    const anio = document.getElementById("anio");
    if (anio) {
        const actual = new Date().getFullYear();
        for(let i=2024; i<=2035; i++){
            const op = document.createElement("option");
            op.value = i;
            op.text = i;
            if(i === actual) op.selected = true;
            anio.appendChild(op);
        }
    }

    buildHeaders();
    verificarSesion();
    await cargarSilent();
})();




