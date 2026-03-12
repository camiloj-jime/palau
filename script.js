const usuarios = [
{user:"admin",pass:"admin"},
{user:"profesor",pass:"1234"}
];

const estadosConfig={
"P":{label:"Presente",color:"#22c55e"},
"I":{label:"Inasistencia",color:"#ef4444"},
"IE":{label:"Excusa escrita",color:"#f97316"},
"LTS":{label:"Llegada tarde salón",color:"#eab308"},
"LTC":{label:"Llegada tarde colegio",color:"#fde047"},
"SA":{label:"Suspensión académica",color:"#a855f7"},
"E":{label:"Enfermedad",color:"#3b82f6"},
"SAu":{label:"Salida autorizada",color:"#06b6d4"},
"IET":{label:"Excusa telefónica",color:"#ec4899"}
};

let tabla;
let contador=0;

function createSelectOptions(){

let html='<option value="">-</option>';

Object.keys(estadosConfig).forEach(code=>{

html+=`<option value="${code}">${estadosConfig[code].label}</option>`;

});

return html;

}

function getStateColor(code){

return estadosConfig[code]?.color||"#fff";

}

function actualizarColor(select){

const color=getStateColor(select.value);

select.style.background=color;

select.style.color="white";

}

function login(){

const u=document.getElementById("usuario").value;
const p=document.getElementById("clave").value;

const acceso=usuarios.some(x=>x.user===u&&x.pass===p);

if(acceso){

sessionStorage.setItem("usuarioLogueado",u);

document.getElementById("login").style.display="none";
document.getElementById("panel").style.display="block";

}else{

alert("Datos incorrectos");

}

}

function logout(){

sessionStorage.clear();
location.reload();

}

function verificarSesion(){

if(sessionStorage.getItem("usuarioLogueado")){

document.getElementById("login").style.display="none";
document.getElementById("panel").style.display="block";

}

}

function daysInMonth(year,month){

return new Date(year,month,0).getDate();

}

function currentDaysCount(){

const y=document.getElementById("anio").value;
const m=document.getElementById("mes").selectedIndex+1;

return daysInMonth(y,m);

}

function buildHeaders(){

tabla.innerHTML="";

const header=tabla.insertRow();

header.innerHTML="<th>#</th><th>Nombre</th>";

const days=currentDaysCount();

for(let i=1;i<=days;i++){

header.innerHTML+=`<th>${i}</th>`;

}

header.innerHTML+="<th>Acciones</th>";

}

function agregar(){

const nombre=document.getElementById("nombreEstudiante").value.trim();

if(!nombre)return;

contador++;

const fila=tabla.insertRow();

fila.insertCell(0).innerText=contador;

fila.insertCell(1).innerText=nombre;

const days=currentDaysCount();

for(let i=0;i<days;i++){

const celda=fila.insertCell();

celda.innerHTML=`
<select class="estado" onchange="actualizarColor(this);autoSave()">
${createSelectOptions()}
</select>
`;

}

fila.insertCell().innerHTML=`<button onclick="eliminarFila(this)">Eliminar</button>`;

document.getElementById("nombreEstudiante").value="";

autoSave();

}

function eliminarFila(btn){

const fila=btn.parentNode.parentNode;

tabla.deleteRow(fila.rowIndex);

renumerar();

autoSave();

}

function renumerar(){

for(let i=1;i<tabla.rows.length;i++){

tabla.rows[i].cells[0].innerText=i;

}

contador=tabla.rows.length-1;

}

function obtenerDatosTabla(){

let datos=[];

const days=currentDaysCount();

for(let i=1;i<tabla.rows.length;i++){

const nombre=tabla.rows[i].cells[1].innerText;

let estados=[];

for(let d=0;d<days;d++){

estados.push(tabla.rows[i].cells[2+d].querySelector("select").value);

}

datos.push({nombre,estados});

}

return datos;

}

function clave(){

const anio=document.getElementById("anio").value;
const mes=document.getElementById("mes").value;
const salon=document.getElementById("salon").value;

return `${anio}-${mes}-${salon}`;

}

async function guardarAsistenciaFirebase(){

try{

const datos=obtenerDatosTabla();

const id=clave();

const ref=window.doc(window.db,"asistencia",id);

await window.setDoc(ref,{
curso:id,
estudiantes:datos
});

console.log("Guardado en Firebase");

}catch(e){

console.error(e);

}

}

async function cargarAsistenciaFirebase(){

try{

const id=clave();

const ref=window.doc(window.db,"asistencia",id);

const snap=await window.getDoc(ref);

if(snap.exists()){

return snap.data().estudiantes;

}

return null;

}catch(e){

console.error(e);
return null;

}

}

function cargarEstudiantesTabla(datos){

buildHeaders();

contador=0;

datos.forEach(est=>{

contador++;

const fila=tabla.insertRow();

fila.insertCell(0).innerText=contador;

fila.insertCell(1).innerText=est.nombre;

const days=currentDaysCount();

for(let i=0;i<days;i++){

const celda=fila.insertCell();

celda.innerHTML=`
<select class="estado" onchange="actualizarColor(this);autoSave()">
${createSelectOptions()}
</select>
`;

const select=celda.querySelector("select");

if(est.estados[i]){

select.value=est.estados[i];

actualizarColor(select);

}

}

fila.insertCell().innerHTML=`<button onclick="eliminarFila(this)">Eliminar</button>`;

});

}

async function cargarTodo(){

const datos=await cargarAsistenciaFirebase();

if(datos){

cargarEstudiantesTabla(datos);

}

}

function autoSave(){

guardarAsistenciaFirebase();

}

["anio","mes","salon"].forEach(id=>{

const el=document.getElementById(id);

if(el){

el.addEventListener("change",async()=>{

await cargarTodo();

});

}

});

(async function(){

tabla=document.getElementById("tabla");

const anio=document.getElementById("anio");

if(anio){

const actual=new Date().getFullYear();

for(let i=2024;i<=2035;i++){

const op=document.createElement("option");

op.value=i;

op.text=i;

if(i===actual)op.selected=true;

anio.appendChild(op);

}

}

buildHeaders();

verificarSesion();

await cargarTodo();

})();


