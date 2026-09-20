(() => {
  "use strict";

  function escapeCSV(valor) {
    const texto = String(valor ?? "");
    return `"${texto.replaceAll('"', '""')}"`;
  }

  function fechaLegible(fechaISO) {
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) return "Fecha no disponible";

    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(fecha);
  }

  function renderizar() {
    const cuerpo = document.querySelector("#cuerpo-registros");
    const total = document.querySelector("#total-registros");
    if (!cuerpo || !window.DSSitio) return;

    const registros = window.DSSitio.obtenerRegistros();
    total.textContent = `${registros.length} registro${registros.length === 1 ? "" : "s"}`;
    cuerpo.innerHTML = "";

    if (registros.length === 0) {
      const fila = document.createElement("tr");
      fila.innerHTML = `<td class="sin-registros" colspan="4">Aún no hay registros guardados en este dispositivo.</td>`;
      cuerpo.appendChild(fila);
      return;
    }

    registros.slice().reverse().forEach((registro) => {
      const fila = document.createElement("tr");
      [
        registro.nombre,
        registro.escuela,
        fechaLegible(registro.fechaISO),
        registro.pagina || "—"
      ].forEach((valor) => {
        const celda = document.createElement("td");
        celda.textContent = valor;
        fila.appendChild(celda);
      });
      cuerpo.appendChild(fila);
    });
  }

  function exportarCSV() {
    const registros = window.DSSitio?.obtenerRegistros?.() ?? [];
    if (registros.length === 0) return;

    const filas = [
      ["Nombre", "Escuela", "Fecha ISO", "Página"],
      ...registros.map((r) => [r.nombre, r.escuela, r.fechaISO, r.pagina])
    ];

    const csv = filas.map((fila) => fila.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "registros-desarrollo-sustentable.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }

  function borrarRegistros() {
    const registros = window.DSSitio?.obtenerRegistros?.() ?? [];
    if (registros.length === 0) return;

    if (!confirm("¿Quieres borrar todos los registros guardados en este dispositivo?")) return;

    try {
      localStorage.removeItem(window.DSSitio.CLAVES.registros);
    } catch {
      return;
    }

    renderizar();
  }

  function iniciar() {
    document.querySelector("#exportar-registros")?.addEventListener("click", exportarCSV);
    document.querySelector("#borrar-registros")?.addEventListener("click", borrarRegistros);
    renderizar();
    document.addEventListener("ds:sesion-iniciada", renderizar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    iniciar();
  }
})();
