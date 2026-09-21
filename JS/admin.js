import { auth, db, FIREBASE_CONFIGURADO } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CLAVE_ADMIN = "ds_admin_recordado";
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

function irAccesoAdmin() {
  localStorage.removeItem(CLAVE_ADMIN);
  location.replace("acceso.html?admin=1");
}

async function cargarPanel(usuario) {
  const adminDoc = await getDoc(doc(db, "admins", usuario.uid));
  if (!adminDoc.exists()) {
    await signOut(auth);
    irAccesoAdmin();
    return;
  }

  const admin = adminDoc.data();
  nombreAdmin.textContent = admin.nombre || usuario.email || "Administrador";
  localStorage.setItem(CLAVE_ADMIN, JSON.stringify({
    uid: usuario.uid,
    nombre: admin.nombre || "Administrador",
    correo: usuario.email || ""
  }));

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
  visitantes.sort((a, b) => {
    const ta = a.fechaRegistro?.toMillis?.() || 0;
    const tb = b.fechaRegistro?.toMillis?.() || 0;
    return tb - ta;
  });

  if (!visitantes.length) {
    const fila = document.createElement("tr");
    fila.innerHTML = '<td colspan="4" class="sin-registros">Todavía no hay visitantes registrados.</td>';
    cuerpo.appendChild(fila);
  } else {
    visitantes.forEach((visitante) => {
      const fila = document.createElement("tr");
      [visitante.nombre || "—", visitante.escuela || "—", fechaLegible(visitante.fechaRegistro), visitante.uid.slice(0, 8) + "…"]
        .forEach((valor) => {
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
  resultados.sort((a, b) => {
    const ta = a.fecha?.toMillis?.() || 0;
    const tb = b.fecha?.toMillis?.() || 0;
    return tb - ta;
  });

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
        resultado.escuela || "—",
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
}

cerrarSesion.addEventListener("click", async () => {
  try { await signOut(auth); } catch { /* sin acción adicional */ }
  localStorage.removeItem(CLAVE_ADMIN);
  location.replace("acceso.html");
});

if (!FIREBASE_CONFIGURADO) {
  estado.textContent = "Firebase todavía no está configurado. Completa JS/firebase.js.";
} else {
  onAuthStateChanged(auth, async (usuario) => {
    if (!usuario || usuario.isAnonymous) {
      irAccesoAdmin();
      return;
    }

    try {
      await cargarPanel(usuario);
    } catch (error) {
      console.error(error);
      estado.textContent = "No se pudo cargar el panel. Revisa Firestore y sus reglas de seguridad.";
    }
  });
}
