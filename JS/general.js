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


  function crearNavegacionResponsive() {
    const nav = document.querySelector("nav[aria-label='Navegación principal']");
    if (!nav || nav.dataset.preparada === "true") return;
    nav.dataset.preparada = "true";

    const marca = document.createElement("a");
    marca.className = "marca-nav";
    marca.href = "index.html";
    marca.setAttribute("aria-label", "Ir al inicio");
    marca.innerHTML = `<img src="IMG/logo-desarrollo.png" alt="Desarrollo Sustentable" width="150" height="115">`;
    nav.prepend(marca);

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "cerrar-menu-movil";
    cerrar.setAttribute("aria-label", "Cerrar menú");
    cerrar.textContent = "×";
    nav.appendChild(cerrar);

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "menu-movil";
    boton.setAttribute("aria-label", "Abrir menú");
    boton.setAttribute("aria-expanded", "false");
    boton.textContent = "☰";

    const fondo = document.createElement("div");
    fondo.className = "fondo-menu-movil";
    fondo.setAttribute("aria-hidden", "true");

    document.body.appendChild(fondo);
    document.body.appendChild(boton);

    const abrir = () => {
      nav.classList.add("abierto");
      document.body.classList.add("menu-abierto");
      boton.setAttribute("aria-expanded", "true");
      cerrar.focus();
    };

    const cerrarMenu = () => {
      nav.classList.remove("abierto");
      document.body.classList.remove("menu-abierto");
      boton.setAttribute("aria-expanded", "false");
    };

    boton.addEventListener("click", abrir);
    cerrar.addEventListener("click", cerrarMenu);
    fondo.addEventListener("click", cerrarMenu);
    nav.querySelectorAll("a").forEach((enlace) => enlace.addEventListener("click", cerrarMenu));
    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && nav.classList.contains("abierto")) cerrarMenu();
    });
  }

  function iniciar() {
    aplicarTema(temaGuardado());

    // El contenido del sitio es público. El registro solo se solicita
    // al comenzar una partida dentro de juego.html.
    crearNavegacionResponsive();
    crearControlTema();
    window.DSSitio = { aplicarTema, obtenerEstado, irAAcceso };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
