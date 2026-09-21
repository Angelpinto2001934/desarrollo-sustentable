(() => {
  "use strict";

  const CLAVES = {
    tema: "ds_tema",
    visitante: "ds_visitante",
    admin: "ds_admin_recordado"
  };

  const temasValidos = new Set(["system", "light", "dark"]);

  function leerJSON(storage, clave) {
    try {
      const valor = storage.getItem(clave);
      return valor ? JSON.parse(valor) : null;
    } catch {
      return null;
    }
  }

  function temaGuardado() {
    try {
      const tema = localStorage.getItem(CLAVES.tema) || "system";
      return temasValidos.has(tema) ? tema : "system";
    } catch {
      return "system";
    }
  }

  function aplicarTema(tema) {
    const valor = temasValidos.has(tema) ? tema : "system";
    if (valor === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", valor);

    try {
      localStorage.setItem(CLAVES.tema, valor);
    } catch {
      // Sin persistencia, el tema funciona solo durante esta carga.
    }
  }

  function obtenerEstado() {
    const admin = leerJSON(localStorage, CLAVES.admin);
    if (admin?.uid) return { tipo: "admin", ...admin };

    const visitante = leerJSON(sessionStorage, CLAVES.visitante);
    if (visitante?.tipo === "registrado" && visitante?.uid) return visitante;
    if (visitante?.tipo === "anonimo") return visitante;
    return null;
  }

  function irAAcceso(next = "index.html") {
    location.href = `acceso.html?next=${encodeURIComponent(next)}`;
  }

  function crearDialogoJuego() {
    if (document.querySelector("#dialogo-juego")) return;

    const dialogo = document.createElement("dialog");
    dialogo.id = "dialogo-juego";
    dialogo.className = "dialogo-sitio";
    dialogo.innerHTML = `
      <div class="dialogo-contenido">
        <button class="cerrar-dialogo" type="button" aria-label="Cerrar">×</button>
        <span class="dialogo-icono" aria-hidden="true">🎮</span>
        <h2>¿Quieres poner a prueba lo que aprendiste?</h2>
        <p>Para realizar el juego necesitas registrar tu nombre y escuela. El contenido del sitio puede seguir consultándose de forma anónima.</p>
        <div class="dialogo-acciones">
          <button class="boton" type="button" id="registrarse-juego">Registrarme para jugar</button>
          <button class="boton-secundario" type="button" id="seguir-sitio">Seguir viendo el sitio</button>
        </div>
      </div>`;

    document.body.appendChild(dialogo);
    dialogo.querySelector(".cerrar-dialogo").addEventListener("click", () => dialogo.close());
    dialogo.querySelector("#seguir-sitio").addEventListener("click", () => dialogo.close());
    dialogo.querySelector("#registrarse-juego").addEventListener("click", () => irAAcceso("juego.html"));
    dialogo.addEventListener("click", (evento) => {
      if (evento.target === dialogo) dialogo.close();
    });
  }

  function protegerJuego(estado) {
    document.querySelectorAll("a[href='juego.html'], .enlace-juego").forEach((enlace) => {
      enlace.addEventListener("click", (evento) => {
        if (estado?.tipo === "registrado" || estado?.tipo === "admin") return;
        evento.preventDefault();
        crearDialogoJuego();
        document.querySelector("#dialogo-juego").showModal();
      });
    });
  }

  function temaOscuroActivo() {
    const tema = temaGuardado();
    if (tema === "dark") return true;
    if (tema === "light") return false;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  }

  function crearControlTema() {
    const contenedor = document.createElement("div");
    contenedor.className = "control-tema";

    contenedor.innerHTML = `
      <label for="themeToggle" class="themeToggle st-sunMoonThemeToggleBtn"
        title="Cambiar entre tema claro y oscuro">
        <input type="checkbox" id="themeToggle" class="themeToggleInput"
          aria-label="Cambiar a tema claro">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" stroke="none"
          aria-hidden="true">
          <mask id="moon-mask">
            <rect x="0" y="0" width="20" height="20" fill="white"></rect>
            <circle cx="11" cy="3" r="8" fill="black"></circle>
          </mask>
          <circle class="sunMoon" cx="10" cy="10" r="8" mask="url(#moon-mask)"></circle>
          <g>
            <circle class="sunRay sunRay1" cx="18" cy="10" r="1.5"></circle>
            <circle class="sunRay sunRay2" cx="14" cy="16.928" r="1.5"></circle>
            <circle class="sunRay sunRay3" cx="6" cy="16.928" r="1.5"></circle>
            <circle class="sunRay sunRay4" cx="2" cy="10" r="1.5"></circle>
            <circle class="sunRay sunRay5" cx="6" cy="3.1718" r="1.5"></circle>
            <circle class="sunRay sunRay6" cx="14" cy="3.1718" r="1.5"></circle>
          </g>
        </svg>
      </label>`;

    const interruptor = contenedor.querySelector("#themeToggle");

    // En este diseño, checked representa el sol (tema claro) y
    // unchecked representa la luna (tema oscuro).
    interruptor.checked = !temaOscuroActivo();

    function actualizarEtiqueta() {
      interruptor.setAttribute(
        "aria-label",
        interruptor.checked ? "Cambiar a tema oscuro" : "Cambiar a tema claro"
      );
    }

    actualizarEtiqueta();

    interruptor.addEventListener("change", () => {
      aplicarTema(interruptor.checked ? "light" : "dark");
      actualizarEtiqueta();
    });

    document.body.appendChild(contenedor);
  }

  function iniciar() {
    aplicarTema(temaGuardado());
    const estado = obtenerEstado();

    if (!estado) {
      irAAcceso(location.pathname.split("/").pop() || "index.html");
      return;
    }

    crearControlTema();
    protegerJuego(estado);
    window.DSSitio = { aplicarTema, obtenerEstado, irAAcceso };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
