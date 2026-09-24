import { auth, db, FIREBASE_CONFIGURADO } from "./firebase.js";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CLAVE_ADMIN = "ds_admin_recordado";

const accesoPanel = document.querySelector("#acceso-admin-panel");
const panelAdmin = document.querySelector("#panel-admin");
const formularioAdmin = document.querySelector("#formulario-admin-directo");
const correoAdmin = document.querySelector("#correo-admin-directo");
const passwordAdmin = document.querySelector("#password-admin-directo");
const errorAdmin = document.querySelector("#error-admin-directo");

const estado = document.querySelector("#estado-admin");
const contenido = document.querySelector("#contenido-admin");
const totalVisitantes = document.querySelector("#total-visitantes");
const totalResultados = document.querySelector("#total-resultados");
const promedio = document.querySelector("#promedio-resultados");
const cuerpo = document.querySelector("#tabla-visitantes");
const cuerpoResultados = document.querySelector("#tabla-resultados");
const nombreAdmin = document.querySelector("#nombre-admin");
const cerrarSesion = document.querySelector("#cerrar-sesion-admin");

function fechaLegible(valor) {
  if (!valor) return "—";
  const fecha = valor.toDate ? valor.toDate() : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(fecha);
}

function mostrarAcceso(mensaje = "") {
  accesoPanel.hidden = false;
  panelAdmin.hidden = true;
  errorAdmin.textContent = mensaje;
}

function mostrarPanel() {
  accesoPanel.hidden = true;
  panelAdmin.hidden = false;
}

async function cargarPanel(usuario) {
  const adminDoc = await getDoc(doc(db, "admins", usuario.uid));
  if (!adminDoc.exists()) {
    await signOut(auth);
    localStorage.removeItem(CLAVE_ADMIN);
    mostrarAcceso("Esta cuenta no tiene permisos de administrador.");
    return false;
  }

  const admin = adminDoc.data();
  nombreAdmin.textContent = admin.nombre || usuario.email || "Administrador";
  localStorage.setItem(CLAVE_ADMIN, JSON.stringify({
    uid: usuario.uid,
    nombre: admin.nombre || "Administrador",
    correo: usuario.email || ""
  }));

  mostrarPanel();
  estado.hidden = false;
  estado.textContent = "Cargando información...";
  contenido.hidden = true;

  const [visitantesSnap, resultadosSnap] = await Promise.all([
    getDocs(collection(db, "visitantes")),
    getDocs(collection(db, "resultados"))
  ]);

  totalVisitantes.textContent = visitantesSnap.size;
  totalResultados.textContent = resultadosSnap.size;

  let suma = 0;
  let conPorcentaje = 0;
  resultadosSnap.forEach((documento) => {
    const dato = documento.data();
    if (typeof dato.porcentaje === "number") {
      suma += dato.porcentaje;
      conPorcentaje += 1;
    }
  });
  promedio.textContent = conPorcentaje ? `${Math.round(suma / conPorcentaje)} %` : "—";

  cuerpo.innerHTML = "";
  const visitantes = [];
  visitantesSnap.forEach((documento) => visitantes.push({ uid: documento.id, ...documento.data() }));
  visitantes.sort((a, b) => (b.fechaRegistro?.toMillis?.() || 0) - (a.fechaRegistro?.toMillis?.() || 0));

  if (!visitantes.length) {
    const fila = document.createElement("tr");
    fila.innerHTML = '<td colspan="5" class="sin-registros">Todavía no hay visitantes registrados.</td>';
    cuerpo.appendChild(fila);
  } else {
    visitantes.forEach((visitante) => {
      const fila = document.createElement("tr");
      [
        visitante.nombre || "—",
        visitante.escuela === "Otro" ? "Otra institución" : (visitante.escuela || "—"),
        visitante.actividad || "—",
        fechaLegible(visitante.fechaRegistro),
        visitante.uid.slice(0, 8) + "…"
      ].forEach((valor) => {
        const celda = document.createElement("td");
        celda.textContent = valor;
        fila.appendChild(celda);
      });
      cuerpo.appendChild(fila);
    });
  }

  cuerpoResultados.innerHTML = "";
  const resultados = [];
  resultadosSnap.forEach((documento) => resultados.push({ id: documento.id, ...documento.data() }));
  resultados.sort((a, b) => (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0));

  if (!resultados.length) {
    const fila = document.createElement("tr");
    fila.innerHTML = '<td colspan="6" class="sin-registros">Todavía no hay partidas guardadas.</td>';
    cuerpoResultados.appendChild(fila);
  } else {
    resultados.forEach((resultado) => {
      const fila = document.createElement("tr");
      const resultadoTexto = typeof resultado.porcentaje === "number"
        ? `${resultado.correctas ?? "—"}/${resultado.total ?? "—"} · ${resultado.porcentaje}%`
        : "—";
      [
        resultado.nombre || "—",
        resultado.escuela === "Otro" ? (resultado.actividad || "Otra institución") : (resultado.escuela || "—"),
        resultadoTexto,
        resultado.puntos ?? "—",
        resultado.insignia || "—",
        fechaLegible(resultado.fecha)
      ].forEach((valor) => {
        const celda = document.createElement("td");
        celda.textContent = valor;
        fila.appendChild(celda);
      });
      cuerpoResultados.appendChild(fila);
    });
  }

  estado.hidden = true;
  contenido.hidden = false;
  return true;
}

formularioAdmin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  errorAdmin.textContent = "";

  if (!FIREBASE_CONFIGURADO) {
    errorAdmin.textContent = "Firebase todavía no está configurado.";
    return;
  }

  const boton = formularioAdmin.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Verificando...";

  try {
    if (auth.currentUser) await signOut(auth);
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, correoAdmin.value.trim(), passwordAdmin.value);
    // onAuthStateChanged comprobará el UID y cargará el panel.
    formularioAdmin.reset();
  } catch (error) {
    console.error(error);
    errorAdmin.textContent = "Correo o contraseña incorrectos, o la cuenta no tiene acceso administrativo.";
  } finally {
    boton.disabled = false;
    boton.textContent = "Entrar al panel";
  }
});

cerrarSesion.addEventListener("click", async () => {
  try { await signOut(auth); } catch { /* sin acción adicional */ }
  localStorage.removeItem(CLAVE_ADMIN);
  mostrarAcceso();
  formularioAdmin.reset();
});

if (!FIREBASE_CONFIGURADO) {
  mostrarAcceso("Firebase todavía no está configurado.");
} else {
  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario || usuario.isAnonymous) {
      mostrarAcceso();
      return;
    }

    try {
      await cargarPanel(usuario);
    } catch (error) {
      console.error(error);
      await signOut(auth).catch(() => {});
      localStorage.removeItem(CLAVE_ADMIN);
      mostrarAcceso("No se pudo comprobar el acceso. Revisa la conexión e inténtalo de nuevo.");
    }
  });
}
