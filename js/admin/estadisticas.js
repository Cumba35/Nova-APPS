/* js/admin/estadisticas.js */

import { supabase } from "../../admin-core.js";

const SELECTORES = {
registrados: [
"#usuariosRegistrados",
"#registeredUsers",
'[data-stat="usuarios-registrados"]'
],
activos: [
"#usuariosActivos",
"#activeUsers",
'[data-stat="usuarios-activos"]'
],
comentarios: [
"#totalComentarios",
"#totalComments",
'[data-stat="comentarios"]'
],
compartidos: [
"#totalCompartidos",
"#totalShares",
'[data-stat="compartidos"]'
],
valoracionGeneral: [
"#valoracionGeneral",
"#overallRating",
'[data-stat="valoracion-general"]'
],
valoracionMayor: [
"#valoracionMayor",
"#highestRating",
'[data-stat="valoracion-mayor"]'
],
valoracionMenor: [
"#valoracionMenor",
"#lowestRating",
'[data-stat="valoracion-menor"]'
],
nuevosUsuarios: [
"#nuevosUsuarios",
"#newUsers",
'[data-stat="nuevos-usuarios"]'
]
};

function buscarElemento(selectores) {
for (const selector of selectores) {
const elemento = document.querySelector(selector);
if (elemento) return elemento;
}

return null;
}

function mostrarValor(elemento, valor) {
if (!elemento) return;

elemento.textContent = valor;
}

function mostrarEstado(texto) {
const elementos = [
document.querySelector("#statsStatus"),
document.querySelector("#estadisticasEstado"),
document.querySelector('[data-stat="estado"]')
].filter(Boolean);

elementos.forEach(elemento => {
elemento.textContent = texto;
});
}

function prepararValoresPendientes() {
Object.values(SELECTORES).forEach(selectores => {
const elemento = buscarElemento(selectores);

if (elemento) {
  mostrarValor(elemento, "—");
}

});

mostrarEstado(
"Las estadísticas reales estarán disponibles cuando se conecten las fuentes de datos."
);
}

function prepararActualizacion() {
const boton = document.querySelector("#refreshStats");

if (!boton) return;

boton.disabled = true;
boton.title =
"La actualización estará disponible cuando se conecten las estadísticas a Supabase.";
}

async function verificarSesion() {
const { data, error } = await supabase.auth.getUser();

if (error || !data?.user) {
mostrarEstado(
"Inicia sesión con la cuenta autorizada para acceder a las estadísticas."
);
return false;
}

return true;
}

async function iniciarEstadisticas() {
prepararValoresPendientes();
prepararActualizacion();

const autorizado = await verificarSesion();

if (!autorizado) return;

/*

* No consultar tablas de estadísticas hasta confirmar
* sus nombres, columnas y políticas RLS en Supabase.
* 
* No se debe usar una clave service_role en el navegador.
  */

mostrarEstado(
"Sesión verificada. Las métricas están pendientes de conexión con las fuentes de datos."
);
}

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
iniciarEstadisticas,
{ once: true }
);
} else {
iniciarEstadisticas();
}