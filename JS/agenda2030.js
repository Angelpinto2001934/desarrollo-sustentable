(() => {
  "use strict";

  function iniciarODS() {
    const items = [...document.querySelectorAll(".ods-item")];

    items.forEach((item) => {
      const boton = item.querySelector(".ods-boton");
      const detalle = item.querySelector(".ods-detalle");
      if (!boton || !detalle) return;

      boton.addEventListener("click", () => {
        const estabaAbierto = item.classList.contains("abierto");

        items.forEach((otro) => {
          otro.classList.remove("abierto");
          otro.querySelector(".ods-boton")?.setAttribute("aria-expanded", "false");
        });

        if (!estabaAbierto) {
          item.classList.add("abierto");
          boton.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarODS, { once: true });
  } else {
    iniciarODS();
  }
})();
