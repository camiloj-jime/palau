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
        html += `<option value="${code}">${code}</option>`;
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
        <select onchange="actualizarColor(this);autoSave();actualizar()" class="estado">
        ${createSelectOptions()}
        </select>
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

    select.style.background = color;
    select.style.color = "white";
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
            <select onchange="actualizarColor(this);autoSave();actualizar()" class="estado">
            ${createSelectOptions()}
            </select>
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
