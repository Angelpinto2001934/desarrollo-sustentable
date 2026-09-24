import { auth, db, FIREBASE_CONFIGURADO } from "./firebase.js";
import {
  browserSessionPersistence,
  setPersistence,
  signInAnonymously,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
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

function normalizar(texto = "") {
  return texto.trim().replace(/\s+/g, " ");
}

escuela.addEventListener("change", () => {
  const esOtro = escuela.value === "Otro";
  campoActividad.hidden = !esOtro;
  actividad.required = esOtro;
  if (!esOtro) actividad.value = "";
});

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  errorVisita.textContent = "";

  const nombreLimpio = normalizar(nombre.value);
  const escuelaLimpia = normalizar(escuela.value);
  const actividadLimpia = normalizar(actividad.value);

  if (nombreLimpio.length < 2) {
    errorVisita.textContent = "Escribe un nombre válido.";
    nombre.focus();
    return;
  }

  if (!escuelaLimpia) {
    errorVisita.textContent = "Selecciona tu institución.";
    escuela.focus();
    return;
  }

  if (escuelaLimpia === "Otro" && actividadLimpia.length < 3) {
    errorVisita.textContent = "Indica a qué te dedicas.";
    actividad.focus();
    return;
  }

  if (!FIREBASE_CONFIGURADO) {
    errorVisita.textContent = "Firebase todavía no está configurado.";
    return;
  }

  const boton = formulario.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Registrando...";

  try {
    if (auth.currentUser) await signOut(auth);
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
    location.href = "juego.html";
  } catch (error) {
    console.error(error);
    errorVisita.textContent = "No se pudo registrar la participación. Revisa tu conexión e inténtalo de nuevo.";
  } finally {
    boton.disabled = false;
    boton.textContent = "Registrarme y jugar";
  }
});
