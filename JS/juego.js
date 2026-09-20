(() => {
  "use strict";

  function leerJSON(storage, clave) {
    try {
      const valor = storage.getItem(clave);
      return valor ? JSON.parse(valor) : null;
    } catch {
      return null;
    }
  }

  const visitante = leerJSON(sessionStorage, "ds_visitante");
  const admin = leerJSON(localStorage, "ds_admin_recordado");
  const autorizado = visitante?.tipo === "registrado" || Boolean(admin?.uid);

  const contenido = document.querySelector("#juego-autorizado");
  const bloqueo = document.querySelector("#juego-bloqueado");
  const nombre = document.querySelector("#jugador-nombre");
  const escuela = document.querySelector("#jugador-escuela");

  if (autorizado) {
    contenido.hidden = false;
    bloqueo.hidden = true;
    nombre.textContent = admin?.uid ? (admin.nombre || "Administrador") : visitante.nombre;
    escuela.textContent = admin?.uid ? "Administrador" : visitante.escuela;
  } else {
    contenido.hidden = true;
    bloqueo.hidden = false;
  }
})();
