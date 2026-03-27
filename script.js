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

function showMessage(text, type = 'success', duration = 2200) {
    const message = document.getElementById('message');
    if (!message) return;

    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';

    setTimeout(() => {
        message.style.display = 'none';
    }, duration);
}

function getStateColor(code) {
    return estadosConfig[code]?.color || "#ffffff";
}

function createSelectOptions() {
    let html = '<option value="P">Presente</option>';
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
        showMessage("Datos incorrectos", "error");
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
        showMessage("Error: tabla no encontrada", "error");
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
        showMessage("Datos guardados correctamente en Firebase", "success");
    } catch (error) {
        console.error("Error al guardar:", error);
        showMessage("Error al guardar los datos", "error");
    }
}

async function guardarEstudiante(nombre, grado) {
    try {
        await window.addDoc(window.collection(window.db, "estudiantes"), {
            nombre: nombre,
            grado: grado,
            fechaRegistro: new Date()
        });
        showMessage("Estudiante guardado correctamente en Firebase", "success");
    } catch (error) {
        console.error("Error al guardar estudiante:", error);
        showMessage("Error al guardar el estudiante", "error");
    }
}

async function eliminarObservacionesEstudianteFirebase(nombre, grado) {
    try {
        const docRef = window.doc(window.db, "observaciones", grado);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const registros = Array.isArray(data.registros) ? data.registros : [];
            const nuevos = registros.filter(obs => obs.estudiante !== nombre);

            if (nuevos.length !== registros.length) {
                await window.setDoc(docRef, {
                    grado: grado,
                    registros: nuevos,
                    fechaActualizacion: new Date().getTime()
                });
                console.log("Observaciones del estudiante eliminadas en Firebase:", nombre, grado);
            }
        }
    } catch (error) {
        console.error("Error al eliminar observaciones del estudiante en Firebase:", error);
    }
}

async function eliminarEstudianteFirebase(nombre, grado) {
    try {
        const q = window.query(
            window.collection(window.db, "estudiantes"),
            window.where("nombre", "==", nombre),
            window.where("grado", "==", grado)
        );
        const querySnapshot = await window.getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            await window.deleteDoc(window.doc(window.db, "estudiantes", docSnap.id));
        }

        // Eliminar asistencia del estudiante en todos los documentos de asistencia del mismo grado
        const qAsistencia = window.query(
            window.collection(window.db, "asistencia"),
            window.where("grado", "==", grado)
        );
        const asistenciaSnapshot = await window.getDocs(qAsistencia);

        for (const docSnap of asistenciaSnapshot.docs) {
            const asistenciaData = docSnap.data();
            const estudiantes = Array.isArray(asistenciaData.estudiantes) ? asistenciaData.estudiantes : [];
            const nuevos = estudiantes.filter(est => est.nombre !== nombre);

            if (nuevos.length !== estudiantes.length) {
                await window.setDoc(window.doc(window.db, "asistencia", docSnap.id), {
                    ...asistenciaData,
                    estudiantes: nuevos,
                    fechaActualizacion: new Date().getTime()
                });
            }
        }

        // Eliminar observaciones del estudiante
        await eliminarObservacionesEstudianteFirebase(nombre, grado);

        console.log("Estudiante eliminado en Firebase:", nombre, grado);
    } catch (error) {
        console.error("Error al eliminar estudiante en Firebase:", error);
    }
}

async function eliminarEstudiantesPorCurso(grado) {
    try {
        const q = window.query(
            window.collection(window.db, "estudiantes"),
            window.where("grado", "==", grado)
        );
        const querySnapshot = await window.getDocs(q);

        for (const docSnap of querySnapshot.docs) {
            await window.deleteDoc(window.doc(window.db, "estudiantes", docSnap.id));
        }
        console.log("Estudiantes eliminados en Firebase curso:", grado);
    } catch (error) {
        console.error("Error al eliminar estudiantes por curso en Firebase:", error);
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

async function eliminarFila(btn) {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    const fila = btn.parentNode.parentNode;
    const nombre = fila.cells[1]?.innerText || "";
    const grado = document.getElementById("salon").value;

    if (!confirm(`¿Estás seguro de eliminar al estudiante ${nombre}? Esto también eliminará al estudiante de Firebase.`)) {
        return;
    }

    tabla.deleteRow(fila.rowIndex);

    renumerar();

    actualizar();

    autoSave();

    if (nombre) {
        await eliminarEstudianteFirebase(nombre, grado);
    }
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

            let valor = tabla.rows[i].cells[2 + d].querySelector("select").value;

            // 👇 Cambia de inasistencia a presente por defecto si está vacío
            if (valor === "") valor = "P";

            estados.push(valor);
        }

        datos.push({ nombre, estados });
    }

    console.log("autoSave: Guardando datos localmente", datos);
    localStorage.setItem(key, JSON.stringify(datos));

    // También guardar en Firebase
    guardarAsistenciaFirebase(datos);
}

async function guardarAsistenciaFirebase(datos) {
    try {
        const anio = document.getElementById("anio").value;
        const mes = document.getElementById("mes").value;
        const salon = document.getElementById("salon").value;

        // Validar que tenemos los valores necesarios
        if (!anio || !mes || !salon) {
            console.warn("guardarAsistenciaFirebase: Faltan valores - Año:", anio, "Mes:", mes, "Salón:", salon);
            return;
        }

        const docId = `${anio}-${mes.toLowerCase()}-${salon}`;

        console.log("guardarAsistenciaFirebase: Intentando guardar con docId:", docId);
        console.log("guardarAsistenciaFirebase: Datos a guardar:", datos);

        // Verificar que window.db existe
        if (!window.db) {
            console.error("guardarAsistenciaFirebase: window.db no está disponible");
            return;
        }

        const docRef = window.doc(window.db, "asistencia", docId);

        await window.setDoc(docRef, {
            anio: anio,
            mes: mes,
            grado: salon,
            estudiantes: datos,
            fechaActualizacion: new Date().getTime(),
            docId: docId
        });

        console.log("✅ Asistencia guardada en Firebase para:", salon, mes, anio);
        showMessage("Asistencia guardada en Firebase ✓", "success", 1500);
    } catch (error) {
        console.error("❌ Error al guardar asistencia en Firebase:", error);
        console.error("Detalles del error:", error.message, error.code);
        showMessage("Error al guardar en Firebase: " + error.message, "error", 3000);
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

        // Validar valores
        if (!anio || !mes || !salon) {
            console.warn("cargarAsistenciaFirebase: Faltan valores");
            return null;
        }

        const docId = `${anio}-${mes.toLowerCase()}-${salon}`;

        console.log("cargarAsistenciaFirebase: Intentando cargar con docId:", docId);

        if (!window.db || !window.getDoc || !window.doc) {
            console.error("cargarAsistenciaFirebase: Firebase no está disponible");
            return null;
        }

        const docRef = window.doc(window.db, "asistencia", docId);
        const docSnap = await window.getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("✅ Datos cargados de Firebase:", data);
            console.log("Estudiantes encontrados:", data.estudiantes ? data.estudiantes.length : 0);
            return data.estudiantes;
        } else {
            console.log("⚠️ No hay datos en Firebase para docId:", docId);
            return null;
        }
    } catch (error) {
        console.error("❌ Error al cargar asistencia de Firebase:", error);
        console.error("Detalles:", error.message, error.code);
        return null;
    }
}

async function cargarSilent() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) {
        console.error("cargarSilent: tabla no encontrada");
        return;
    }

    const key = clave();
    console.log("📂 cargarSilent: Iniciando carga con clave:", key);

    // Intentar cargar de Firebase primero
    console.log("🔍 cargarSilent: Buscando datos en Firebase...");
    const datosFirebase = await cargarAsistenciaFirebase();
    
    if (datosFirebase && datosFirebase.length > 0) {
        console.log("✅ cargarSilent: Datos encontrados en Firebase, cargando en tabla");
        cargarEstudiantesEnTabla(datosFirebase);
        localStorage.setItem(key, JSON.stringify(datosFirebase));
        actualizar();
        escucharActualizacionesFirebase();
        return;
    }

    // Si no hay en Firebase, intentar de localStorage
    console.log("🔍 cargarSilent: Buscando datos en localStorage...");
    const datosLocal = JSON.parse(localStorage.getItem(key));
    
    if (datosLocal && datosLocal.length > 0) {
        console.log("✅ cargarSilent: Datos encontrados en localStorage, cargando en tabla");
        cargarEstudiantesEnTabla(datosLocal);
        // Subir a Firebase si no estaba
        guardarAsistenciaFirebase(datosLocal);
        actualizar();
        escucharActualizacionesFirebase();
        return;
    }

    // Si no hay datos, cargar estudiantes de Firebase para inicializar
    console.log("ℹ️ cargarSilent: Sin asistencia previa, cargando estudiantes del grado");
    const estudiantesFirebase = await cargarEstudiantes();
    if (estudiantesFirebase.length > 0) {
        buildHeaders();
        contador = 0;

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

    // Usar thead/tbody para compatibilidad completa con sticky
    let headerHtml = "<thead><tr><th>#</th><th>Nombre</th>";
    for (let d = 1; d <= days; d++) {
        headerHtml += `<th>${d}</th>`;
    }
    headerHtml += "<th>Acciones</th></tr></thead><tbody></tbody>";

    tabla.innerHTML = headerHtml;
}

function onPeriodoChange() {
    // Guardar estado actual antes de cambiar.
    autoSave();

    // Actualiza días de la cabecera y carga datos del mes/salón seleccionado.
    buildHeaders();
    cargarSilent();
}

function inicializar() {
    // Solo inicializar si estamos en la página principal (index.html)
    if (document.getElementById("panel")) {
        const anioSelect = document.getElementById("anio");

        const anoActual = new Date().getFullYear();
        anioSelect.innerHTML = "";

        for (let y = anoActual - 2; y <= anoActual + 1; y++) {
            const opt = document.createElement("option");
            opt.value = y;
            opt.text = y;
            if (y === anoActual) opt.selected = true;
            anioSelect.appendChild(opt);
        }

        document.getElementById("mes").addEventListener("change", onPeriodoChange);
        anioSelect.addEventListener("change", onPeriodoChange);
        document.getElementById("salon").addEventListener("change", onPeriodoChange);

        buildHeaders();
        verificarSesion();
        cargarSilent();

        // Auto-guardado periódico cada 30 segundos para asegurar persistencia
        setInterval(() => {
            if (tabla && tabla.rows.length > 1) { // Solo si hay estudiantes
                autoSave();
            }
        }, 30000);
    }
}

window.addEventListener("DOMContentLoaded", inicializar);

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
        showMessage("Por favor escribe los nombres en la lista", "warning");
        return;
    }

    const nombres = lista.split('\n').filter(n => n.trim().length > 0);

    if (nombres.length === 0) {
        showMessage("No hay nombres válidos para agregar", "warning");
        return;
    }

    nombres.forEach(nombre => {
        document.getElementById("nombreEstudiante").value = nombre.trim();
        agregar();
    });

    document.getElementById("listaEstudiantes").value = "";
    showMessage(`Se agregaron ${nombres.length} estudiantes`, "success");
}

function guardar() {
    autoSave();
    showMessage("Datos guardados correctamente", "success");
}

function exportar() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) {
        showMessage("Error: tabla no encontrada", "error");
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
        .content { padding: 12px; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h2 { margin: 5px 0; color: #1e3a8a; font-size: 16px; font-weight: bold; }
        .header p { margin: 3px 0; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #000; padding: 6px 3px; text-align: center; font-size: 10px; }
        th { background-color: #2563eb; color: white; font-weight: bold; height: auto; line-height: 1.3; }
        td { height: 22px; }
        .nombre-col { text-align: left; padding-left: 5px; }
        .numero-col { width: 28px; }
        .leyenda { margin-top: 12px; page-break-before: avoid; }
        .leyenda h3 { color: #1e3a8a; font-size: 11px; margin: 5px 0 5px 0; border-bottom: 1px solid #2563eb; padding-bottom: 3px; }
        .leyenda-items { display: flex; flex-wrap: wrap; gap: 10px; font-size: 9px; line-height: 1.3; }
        .leyenda-item { display: inline-block; }
        .pie { margin-top: 12px; font-size: 9px; text-align: center; color: #999; }
        @media print {
            .no-print { display: none; }
            body { padding: 0; margin: 0; }
            .content { padding: 10px; }
            @page { margin: 12mm; size: 8.5in 14in; }
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

async function eliminarTodosCurso() {
    if (!tabla) tabla = document.getElementById("tabla");
    if (!tabla) return;

    const salon = document.getElementById("salon").value;

    if (!salon) {
        showMessage("Por favor selecciona un salón primero", "warning");
        return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar TODOS los estudiantes del ${salon}?`)) {
        const key = clave();
        localStorage.removeItem(key);
        await eliminarEstudiantesPorCurso(salon);
        buildHeaders();
        contador = 0;
        actualizar();
        llenarSelectorEstudiantes();
        showMessage(`Se han eliminado todos los estudiantes del ${salon}`, "success");
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
async function guardarObservacionFirebase(observacion, isEdit = false) {
    try {
        const grado = observacion.grado || "sin-grado";
        const docRef = window.doc(window.db, "observaciones", grado);

        // Obtener el documento actual
        const docSnap = await window.getDoc(docRef);
        let registros = [];

        if (docSnap.exists()) {
            registros = docSnap.data().registros || [];
        }

        if (isEdit) {
            // Reemplazar la observación existente
            const index = registros.findIndex(obs => obs.id === observacion.id);
            if (index !== -1) {
                registros[index] = observacion;
            } else {
                registros.push(observacion); // Si no se encuentra, agregar
            }
        } else {
            // Agregar la nueva observación
            registros.push(observacion);
        }

        // Guardar de vuelta
        await window.setDoc(docRef, {
            grado: grado,
            registros: registros,
            fechaActualizacion: new Date().getTime()
        });

        console.log(isEdit ? "Observación editada en Firebase para" : "Observación guardada en Firebase para", grado);
    } catch (error) {
        console.error("Error al guardar observación en Firebase:", error);
    }
}

async function cargarObservacionesFirebase() {
    try {
        console.log("Iniciando carga de observaciones desde Firebase...");
        const observaciones = [];
        const querySnapshot = await window.getDocs(window.collection(window.db, "observaciones"));
        console.log("Documentos obtenidos:", querySnapshot.size);

        querySnapshot.forEach((doc) => {
            console.log("Documento:", doc.id, doc.data());
            const data = doc.data();
            if (data.registros && Array.isArray(data.registros)) {
                observaciones.push(...data.registros);
            }
        });

        console.log("Total observaciones cargadas:", observaciones.length);
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
        showMessage("Por favor completa al menos el nombre del estudiante y la fecha", "warning");
        return;
    }

    const editandoId = document.getElementById("editandoId") ? document.getElementById("editandoId").value : "";

    const observacion = {
        estudiante, grado, fecha, docente, desempeno, llamados, 
        anotaciones, acciones, ficha, sanciones, compromiso, observaciones,
        id: editandoId ? parseInt(editandoId) : Date.now()
    };

    let observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];

    if (editandoId) {
        // Editar existente
        const index = observaciones_list.findIndex(obs => obs.id === parseInt(editandoId));
        if (index !== -1) {
            observaciones_list[index] = observacion;
        }
    } else {
        // Nueva
        observaciones_list.push(observacion);
    }

    localStorage.setItem("observaciones", JSON.stringify(observaciones_list));

    // Guardar también en Firebase
    guardarObservacionFirebase(observacion, !!editandoId);

    showMessage(editandoId ? "Observación editada correctamente" : "Observación guardada correctamente", "success");

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
    if (document.getElementById("editandoId")) document.getElementById("editandoId").value = "";

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
        html += `<td style='border: 1px solid #ddd; padding: 8px;'><button onclick="editarObservacion(${obs.id})" style='background: #f59e0b; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; margin-right: 5px;'>Editar</button><button onclick="eliminarObservacion(${obs.id}, '${obs.grado}')" style='background: #ef4444; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;'>Eliminar</button></td>`;
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

function editarObservacion(id) {
    const observaciones_list = JSON.parse(localStorage.getItem("observaciones")) || [];
    const obs = observaciones_list.find(o => o.id === id);
    if (!obs) return;

    // Llenar el formulario
    document.getElementById("obsEstudiante").value = obs.estudiante;
    document.getElementById("obsGrado").value = obs.grado;
    document.getElementById("obsFecha").value = obs.fecha;
    document.getElementById("obsDocente").value = obs.docente;
    document.getElementById("obsDesempeno").value = obs.desempeno;
    document.getElementById("obsLlamados").value = obs.llamados;
    document.getElementById("obsAnotaciones").value = obs.anotaciones;
    document.getElementById("obsAcciones").value = obs.acciones;
    document.getElementById("obsFicha").value = obs.ficha;
    document.getElementById("obsSanciones").value = obs.sanciones;
    document.getElementById("obsCompromiso").value = obs.compromiso;
    document.getElementById("obsObservaciones").value = obs.observaciones;

    // Setear ID de edición
    if (document.getElementById("editandoId")) {
        document.getElementById("editandoId").value = id;
    } else {
        // Si no existe, crearlo
        const input = document.createElement("input");
        input.type = "hidden";
        input.id = "editandoId";
        input.value = id;
        document.querySelector("form").appendChild(input);
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

        showMessage("No hay observaciones para exportar", "info");

        return;
    }

    // Filtrar por curso si se selecciona uno
    const cursoSeleccionado = document.getElementById("searchCurso").value;
    if (cursoSeleccionado) {
        observaciones_list = observaciones_list.filter(obs => obs.grado === cursoSeleccionado);
        if (observaciones_list.length === 0) {
            showMessage(`No hay observaciones para el curso ${cursoSeleccionado}`, "info");
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
        showMessage("Por favor selecciona un curso", "warning");
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








