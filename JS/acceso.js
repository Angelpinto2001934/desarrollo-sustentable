import { auth, db, FIREBASE_CONFIGURADO } from "./firebase.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CLAVE_VISITANTE = "ds_visitante";
const CLAVE_ADMIN = "ds_admin_recordado";

const formulario = document.querySelector("#formulario-visita");
const nombre = document.querySelector("#nombre");
const escuela = document.querySelector("#escuela");
const campoActividad = document.querySelector("#campo-actividad");
const actividad = document.querySelector("#actividad");
const errorVisita = document.querySelector("#error-visita");
const botonAnonimo = document.querySelector("#continuar-anonimo");
const botonAdmin = document.querySelector("#abrir-admin");
const dialogoAdmin = document.querySelector("#dialogo-admin");
const cerrarAdmin = document.querySelector("#cerrar-admin");
const formularioAdmin = document.querySelector("#formulario-admin");
const correoAdmin = document.querySelector("#correo-admin");
const passwordAdmin = document.querySelector("#password-admin");
const errorAdmin = document.querySelector("#error-admin");

function destinoSeguro() {
  const params = new URLSearchParams(location.search);
  const siguiente = params.get("next");
  const permitidos = new Set(["index.html", "juego.html", "dimensiones.html", "principios.html", "agenda2030.html", "compartir.html"]);
  return permitidos.has(siguiente) ? siguiente : "index.html";
}

function mostrarError(elemento, mensaje) {
  elemento.textContent = mensaje;
}

function normalizar(texto) {
  return texto.trim().replace(/\s+/g, " ");
}

async function comprobarAdminRecordado(usuario) {
  if (!usuario || usuario.isAnonymous || !FIREBASE_CONFIGURADO) return false;

  try {
    const adminDoc = await getDoc(doc(db, "admins", usuario.uid));
    if (!adminDoc.exists()) return false;

    const datos = adminDoc.data();
    localStorage.setItem(CLAVE_ADMIN, JSON.stringify({
      uid: usuario.uid,
      nombre: datos.nombre || "Administrador",
      correo: usuario.email || ""
    }));
    location.replace("admin.html");
    return true;
  } catch {
    return false;
  }
}

if (FIREBASE_CONFIGURADO) {
  onAuthStateChanged(auth, (usuario) => {
    comprobarAdminRecordado(usuario);
  });
}

escuela.addEventListener("change", () => {
  const esOtro = escuela.value === "Otro";
  campoActividad.hidden = !esOtro;
  actividad.required = esOtro;
  if (!esOtro) actividad.value = "";
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarError(errorVisita, "");

  const nombreLimpio = normalizar(nombre.value);
  const escuelaLimpia = normalizar(escuela.value);
  const actividadLimpia = normalizar(actividad?.value || "");

  if (nombreLimpio.length < 2) {
    mostrarError(errorVisita, "Escribe un nombre válido.");
    nombre.focus();
    return;
  }

  if (escuelaLimpia.length < 2) {
    mostrarError(errorVisita, "Selecciona tu escuela.");
    escuela.focus();
    return;
  }

  if (escuelaLimpia === "Otro" && actividadLimpia.length < 3) {
    mostrarError(errorVisita, "Indica a qué te dedicas o de dónde nos visitas.");
    actividad.focus();
    return;
  }

  if (!FIREBASE_CONFIGURADO) {
    mostrarError(errorVisita, "Primero conecta el proyecto con Firebase en JS/firebase.js.");
    return;
  }

  const boton = formulario.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Registrando...";

  try {
    // Cada registro de visita recibe un UID nuevo para evitar que dos personas
    // que usen el mismo dispositivo sobrescriban sus datos en Firestore.
    if (auth.currentUser) {
      await signOut(auth);
    }

    await setPersistence(auth, browserSessionPersistence);
    const credencial = await signInAnonymously(auth);

    const visitante = {
      uid: credencial.user.uid,
      nombre: nombreLimpio,
      escuela: escuelaLimpia,
      actividad: escuelaLimpia === "Otro" ? actividadLimpia : "",
      tipo: "registrado"
    };

    await setDoc(doc(db, "visitantes", visitante.uid), {
      nombre: visitante.nombre,
      escuela: visitante.escuela,
      actividad: visitante.actividad,
      tipo: "registrado",
      fechaRegistro: serverTimestamp(),
      ultimoAcceso: serverTimestamp()
    }, { merge: true });

    sessionStorage.setItem(CLAVE_VISITANTE, JSON.stringify(visitante));
    localStorage.removeItem(CLAVE_ADMIN);
    location.href = destinoSeguro();
  } catch (error) {
    console.error(error);
    mostrarError(errorVisita, "No se pudo registrar la visita. Revisa Firebase y vuelve a intentarlo.");
  } finally {
    boton.disabled = false;
    boton.textContent = "Ingresar";
  }
});

botonAnonimo.addEventListener("click", async () => {
  try {
    if (FIREBASE_CONFIGURADO && auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }
  } catch {
    // El sitio puede continuar como anónimo aunque Firebase no responda.
  }

  sessionStorage.setItem(CLAVE_VISITANTE, JSON.stringify({ tipo: "anonimo" }));
  localStorage.removeItem(CLAVE_ADMIN);
  location.href = "index.html";
});

botonAdmin.addEventListener("click", () => {
  if (typeof dialogoAdmin.showModal === "function") dialogoAdmin.showModal();
  else dialogoAdmin.setAttribute("open", "");
  correoAdmin.focus();
});

cerrarAdmin.addEventListener("click", () => dialogoAdmin.close());

dialogoAdmin.addEventListener("click", (evento) => {
  if (evento.target === dialogoAdmin) dialogoAdmin.close();
});

formularioAdmin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mostrarError(errorAdmin, "");

  if (!FIREBASE_CONFIGURADO) {
    mostrarError(errorAdmin, "Primero conecta el proyecto con Firebase en JS/firebase.js.");
    return;
  }

  const correo = correoAdmin.value.trim();
  const password = passwordAdmin.value;
  const boton = formularioAdmin.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Verificando...";

  try {
    if (auth.currentUser) await signOut(auth);
    await setPersistence(auth, browserLocalPersistence);
    const credencial = await signInWithEmailAndPassword(auth, correo, password);
    const adminDoc = await getDoc(doc(db, "admins", credencial.user.uid));

    if (!adminDoc.exists()) {
      await signOut(auth);
      throw new Error("La cuenta no tiene permisos de administrador.");
    }

    const datos = adminDoc.data();
    localStorage.setItem(CLAVE_ADMIN, JSON.stringify({
      uid: credencial.user.uid,
      nombre: datos.nombre || "Administrador",
      correo: credencial.user.email || correo
    }));
    sessionStorage.removeItem(CLAVE_VISITANTE);
    location.href = "admin.html";
  } catch (error) {
    console.error(error);
    mostrarError(errorAdmin, error.message === "La cuenta no tiene permisos de administrador."
      ? error.message
      : "Correo o contraseña incorrectos, o Firebase aún no está configurado.");
  } finally {
    boton.disabled = false;
    boton.textContent = "Entrar como administrador";
  }
});
