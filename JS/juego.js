import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CLAVE_VISITANTE = "ds_visitante";
const CLAVE_ADMIN = "ds_admin_recordado";

const fases = [
  {
    numero: 1,
    nombre: "Construcción por bloques",
    corto: "🧱 Construcción",
    icono: "🧱",
    texto: "Empiezas con una comunidad que tiene pocos recursos. Elige qué construir para mejorarla sin gastar todo.",
    objetivo: "Objetivo: cuidar el ambiente, ayudar a las personas y usar bien el dinero."
  },
  {
    numero: 2,
    nombre: "Misiones 2030",
    corto: "🎮 Misiones 2030",
    icono: "🎮",
    texto: "Ahora aparecen retos sobre problemas que pueden pasar en una escuela o comunidad.",
    objetivo: "Objetivo: elegir la mejor solución usando lo que aprendiste en el sitio."
  },
  {
    numero: 3,
    nombre: "Zona de supervivencia",
    corto: "🔥 Supervivencia",
    icono: "🔥",
    texto: "Llegan calor extremo, lluvias fuertes e incendios. En esta fase tendrás 30 segundos para decidir qué hacer en cada reto.",
    objetivo: "Objetivo: proteger a las personas y cuidar los recursos de la comunidad."
  }
];

const misiones = [
  {
    id: "bloques-escuela",
    fase: 1,
    tipo: "Construcción · Tu escuela",
    pregunta: "En tu escuela quieren gastar menos agua y luz y producir menos basura. ¿Qué harías primero?",
    contexto: "Elige la opción que ayude a la escuela y también cuide sus recursos.",
    opciones: [
      {
        icono: "♻️", titulo: "Hacer un plan verde", texto: "Separar basura, reparar fugas, apagar luces que no se usan y pedir ayuda a los estudiantes.", costo: "🪙 -140",
        correcta: true, equilibrio: { ambiental: 12, social: 10, economica: 8 }, recursos: { creditos: -140, agua: 5, energia: 5, comunidad: 8 }
      },
      {
        icono: "💻", titulo: "Comprar cosas caras", texto: "Comprar tecnología nueva sin revisar primero qué problema tiene la escuela.", costo: "🪙 -260",
        correcta: false, equilibrio: { ambiental: 2, social: -7, economica: -10 }, recursos: { creditos: -260, energia: -8, comunidad: -7 }
      },
      {
        icono: "💵", titulo: "Solo gastar menos", texto: "Ahorrar dinero aunque se desperdicie agua o se produzca más basura.", costo: "🪙 +80",
        correcta: false, equilibrio: { ambiental: -12, social: -4, economica: 4 }, recursos: { creditos: 80, agua: -8, comunidad: -4 }
      }
    ],
    explicacion: "Una decisión sustentable trata de cuidar el ambiente, a las personas y el dinero al mismo tiempo."
  },
  {
    id: "bloques-agua",
    fase: 1,
    tipo: "Construcción · Agua",
    pregunta: "El río cerca de la comunidad está sucio por aguas usadas. ¿Qué solución escogerías?",
    contexto: "Piensa en una solución que limpie el agua antes de devolverla al ambiente.",
    opciones: [
      {
        icono: "💧", titulo: "Tratar el agua", texto: "Limpiar el agua usada y reutilizar parte de ella antes de devolverla al río.", costo: "🪙 -170 · ⚡ -8",
        correcta: true, equilibrio: { ambiental: 14, social: 8, economica: 5 }, recursos: { creditos: -170, agua: 15, energia: -8, comunidad: 7 }
      },
      {
        icono: "➡️", titulo: "Mandarla más lejos", texto: "Mover la tubería para que la contaminación quede lejos de las casas.", costo: "🪙 -40",
        correcta: false, equilibrio: { ambiental: -14, social: -8, economica: -3 }, recursos: { creditos: -40, agua: -15, comunidad: -8 }
      },
      {
        icono: "🙈", titulo: "No hacer nada", texto: "Seguir usando el río igual aunque el agua esté contaminada.", costo: "💧 -20",
        correcta: false, equilibrio: { ambiental: -16, social: -8, economica: -3 }, recursos: { agua: -20, comunidad: -6 }
      }
    ],
    explicacion: "Tratar el agua ayuda a reducir la contaminación y permite aprovechar mejor este recurso."
  },
  {
    id: "bloques-territorio",
    fase: 1,
    tipo: "Construcción · Elegir el lugar",
    pregunta: "Van a construir casas. Antes revisan si la zona se inunda, si hay agua y qué necesita la gente. ¿Qué están tomando en cuenta?",
    contexto: "Piensa en el lugar donde se construirá y en sus características.",
    opciones: [
      { icono: "🌿", titulo: "Solo el ambiente", texto: "Revisar únicamente plantas y animales.", costo: "", correcta: false, equilibrio: { ambiental: -2 }, recursos: {} },
      { icono: "👥", titulo: "Solo a las personas", texto: "Revisar únicamente lo que quiere la comunidad.", costo: "", correcta: false, equilibrio: { social: -2 }, recursos: {} },
      { icono: "🗺️", titulo: "El territorio", texto: "Revisar riesgos, recursos y necesidades del lugar antes de construir.", costo: "+150 XP", correcta: true, equilibrio: { ambiental: 6, social: 6, economica: 6 }, recursos: { comunidad: 4 } },
      { icono: "💰", titulo: "Solo el dinero", texto: "Elegir únicamente el terreno más barato.", costo: "", correcta: false, equilibrio: { economica: -2 }, recursos: {} }
    ],
    explicacion: "Eso se llama dimensión geográfica: tomar en cuenta el territorio, sus riesgos, recursos y necesidades."
  },

  {
    id: "mision-precaucion",
    fase: 2,
    tipo: "Misión rápida · Cuidar antes de dañar",
    pregunta: "Quieren hacer un proyecto cerca de un bosque, pero todavía no saben si podría dañarlo. ¿Qué harías?",
    contexto: "Elige la opción más segura para evitar un daño difícil de reparar.",
    opciones: [
      { icono: "🛡️", titulo: "Revisar y prevenir", texto: "Estudiar el riesgo y poner medidas de protección antes de empezar.", costo: "+150 XP", correcta: true, equilibrio: { ambiental: 12, social: 5 }, recursos: { comunidad: 6 } },
      { icono: "🎲", titulo: "Probar y ver qué pasa", texto: "Empezar el proyecto y actuar solo si después ocurre un daño.", costo: "Riesgo alto", correcta: false, equilibrio: { ambiental: -10, social: -5 }, recursos: { comunidad: -8 } },
      { icono: "💸", titulo: "Pensar solo en el dinero", texto: "Aceptar el proyecto porque dará ganancias aunque no se conozca bien el riesgo.", costo: "🪙 +60", correcta: false, equilibrio: { ambiental: -12, social: -6, economica: 2 }, recursos: { creditos: 60, comunidad: -7 } }
    ],
    explicacion: "Esto se llama principio de precaución: si algo puede causar un daño grave, es mejor prevenir antes de arriesgarse."
  },
  {
    id: "mision-ods6",
    fase: 2,
    tipo: "Misión 2030 · Encuentra el ODS",
    pregunta: "En una colonia falta agua limpia y un buen sistema de drenaje. ¿Qué ODS se relaciona más con este problema?",
    contexto: "Busca el objetivo que habla directamente de agua y saneamiento.",
    opciones: [
      { icono: "3️⃣", titulo: "ODS 3 · Salud y bienestar", texto: "Busca que las personas tengan una vida sana.", costo: "", correcta: false, equilibrio: { social: -2 }, recursos: {} },
      { icono: "6️⃣", titulo: "ODS 6 · Agua limpia y saneamiento", texto: "Busca que todas las personas tengan agua segura y saneamiento.", costo: "+150 XP", correcta: true, equilibrio: { ambiental: 8, social: 10 }, recursos: { agua: 10, comunidad: 5 } },
      { icono: "1️⃣3️⃣", titulo: "ODS 13 · Acción por el clima", texto: "Busca actuar frente al cambio climático.", costo: "", correcta: false, equilibrio: { ambiental: -2 }, recursos: {} }
    ],
    explicacion: "El ODS 6 trata sobre agua limpia y saneamiento. Por eso es el que mejor responde a este problema."
  },
  {
    id: "mision-ods13",
    fase: 2,
    tipo: "Misión 2030 · Cambio climático",
    pregunta: "¿Cuál de estas acciones ayuda más a enfrentar el cambio climático?",
    contexto: "Piensa en cómo contaminar menos y también prepararnos para calor, sequías o lluvias fuertes.",
    opciones: [
      { icono: "🌡️", titulo: "Contaminar menos y prepararnos", texto: "Ahorrar energía, usar opciones más limpias y prepararse para calor o inundaciones.", costo: "+150 XP", correcta: true, equilibrio: { ambiental: 12, social: 6, economica: 4 }, recursos: { energia: 6, comunidad: 4 } },
      { icono: "🛍️", titulo: "Usar más desechables", texto: "Comprar más productos que se tiran después de usarlos una sola vez.", costo: "", correcta: false, equilibrio: { ambiental: -10, economica: -3 }, recursos: { creditos: -30 } },
      { icono: "🏭", titulo: "Quemar más combustibles", texto: "Usar más gasolina, carbón o petróleo para producir energía.", costo: "⚡ +15", correcta: false, equilibrio: { ambiental: -15, social: -4 }, recursos: { energia: 15, comunidad: -4 } }
    ],
    explicacion: "Reducir la contaminación ayuda a frenar el cambio climático. Prepararnos para sus efectos se llama adaptación."
  },

  {
    id: "supervivencia-calor",
    fase: 3,
    tipo: "Evento crítico · Mucho calor",
    pregunta: "Hace muchísimo calor y casi no hay sombra en la comunidad. ¿Qué harías?",
    contexto: "Tienes 30 segundos. Elige una opción que ayude a proteger a las personas del calor.",
    tiempo: 30,
    opciones: [
      { icono: "🌳", titulo: "Plantar árboles y crear sombra", texto: "Hacer zonas verdes y lugares con sombra para caminar y descansar.", costo: "🪙 -90 · 💧 -5", correcta: true, equilibrio: { ambiental: 10, social: 10, economica: 3 }, recursos: { creditos: -90, agua: -5, comunidad: 10 } },
      { icono: "🅿️", titulo: "Hacer más estacionamientos", texto: "Quitar áreas verdes para poner más piso y concreto.", costo: "🪙 -70", correcta: false, equilibrio: { ambiental: -12, social: -6, economica: -2 }, recursos: { creditos: -70, comunidad: -7 } },
      { icono: "🙈", titulo: "Esperar a que pase", texto: "No hacer nada y esperar a que baje la temperatura.", costo: "❤️ -15", correcta: false, equilibrio: { social: -10, ambiental: -4 }, recursos: { comunidad: -15, agua: -8 } }
    ],
    explicacion: "Los árboles y la sombra ayudan a proteger a las personas del calor. Prepararse para un problema climático se llama adaptación.",
    timeout: { equilibrio: { ambiental: -5, social: -10 }, recursos: { comunidad: -15, agua: -10 } }
  },
  {
    id: "supervivencia-inundacion",
    fase: 3,
    tipo: "Evento crítico · Lluvia fuerte",
    pregunta: "Llueve muchísimo y varias casas pueden inundarse. ¿Qué harías?",
    contexto: "Tienes 30 segundos. Primero piensa en proteger a las personas y luego en reducir el riesgo para la próxima vez.",
    tiempo: 30,
    opciones: [
      { icono: "🌧️", titulo: "Alertar y prevenir", texto: "Avisar a la gente, usar rutas seguras y mejorar zonas donde el agua pueda filtrarse.", costo: "🪙 -120 · ⚡ -5", correcta: true, equilibrio: { ambiental: 8, social: 12, economica: 5 }, recursos: { creditos: -120, energia: -5, comunidad: 12 } },
      { icono: "🏘️", titulo: "Construir más ahí", texto: "Hacer más casas en la zona porque el terreno es barato.", costo: "🪙 +70", correcta: false, equilibrio: { ambiental: -7, social: -14, economica: -5 }, recursos: { creditos: 70, comunidad: -18 } },
      { icono: "🧱", titulo: "Poner un muro y ya", texto: "Construir una sola barrera sin revisar drenaje, terreno ni zonas de riesgo.", costo: "🪙 -160", correcta: false, equilibrio: { ambiental: -4, social: -6, economica: -7 }, recursos: { creditos: -160, comunidad: -6 } }
    ],
    explicacion: "Una buena respuesta combina avisos, rutas seguras y cambios en el lugar para que una futura lluvia cause menos daño.",
    timeout: { equilibrio: { social: -12, economica: -5 }, recursos: { comunidad: -18, creditos: -60 } }
  },
  {
    id: "supervivencia-bosque",
    fase: 3,
    tipo: "Evento final · Incendio forestal",
    pregunta: "Después de apagar un incendio en el bosque, ¿qué conviene hacer?",
    contexto: "Tienes 30 segundos. Piensa en cómo recuperar el bosque y evitar otro incendio.",
    tiempo: 30,
    opciones: [
      { icono: "🌲", titulo: "Recuperar y prevenir", texto: "Reforestar, cuidar el área, prevenir nuevos incendios e involucrar a la comunidad.", costo: "🪙 -130 · 💧 -8", correcta: true, equilibrio: { ambiental: 15, social: 8, economica: 6 }, recursos: { creditos: -130, agua: -8, comunidad: 10 } },
      { icono: "🪵", titulo: "Sacar toda la madera", texto: "Aprovechar lo que quede sin hacer un plan para recuperar el bosque.", costo: "🪙 +110", correcta: false, equilibrio: { ambiental: -16, social: -5, economica: 4 }, recursos: { creditos: 110, comunidad: -6 } },
      { icono: "🏗️", titulo: "Construir encima", texto: "Usar la zona quemada para hacer edificios porque ya perdió árboles.", costo: "🪙 +150", correcta: false, equilibrio: { ambiental: -18, social: -6, economica: 3 }, recursos: { creditos: 150, comunidad: -8 } }
    ],
    explicacion: "Recuperar el bosque y prevenir nuevos incendios ayuda a cuidar animales, plantas, agua y también a la comunidad.",
    timeout: { equilibrio: { ambiental: -15, social: -6 }, recursos: { comunidad: -10, agua: -8 } }
  }
];

const estado = document.querySelector("#estado-juego");
const bloqueado = document.querySelector("#juego-bloqueado");
const autorizado = document.querySelector("#juego-autorizado");
const pantallaInicio = document.querySelector("#pantalla-inicio");
const pantallaFase = document.querySelector("#pantalla-fase");
const pantallaJuego = document.querySelector("#pantalla-juego");
const pantallaFinal = document.querySelector("#pantalla-final");
const jugadorNombre = document.querySelector("#jugador-nombre");
const jugadorEscuela = document.querySelector("#jugador-escuela");
const notaAdmin = document.querySelector("#nota-admin");
const comenzar = document.querySelector("#comenzar-juego");
const entrarFase = document.querySelector("#entrar-fase");
const reintentar = document.querySelector("#reintentar-juego");

const chipFase = document.querySelector("#chip-fase");
const contadorReto = document.querySelector("#contador-reto");
const rachaElemento = document.querySelector("#racha");
const puntosElemento = document.querySelector("#puntos");
const barraProgreso = document.querySelector("#barra-progreso");
const tipoReto = document.querySelector("#tipo-reto");
const preguntaReto = document.querySelector("#pregunta-reto");
const contextoReto = document.querySelector("#contexto-reto");
const opcionesReto = document.querySelector("#opciones-reto");
const feedback = document.querySelector("#feedback-reto");
const continuar = document.querySelector("#continuar-reto");

const valorAmbiental = document.querySelector("#valor-ambiental");
const valorSocial = document.querySelector("#valor-social");
const valorEconomica = document.querySelector("#valor-economica");
const barraAmbiental = document.querySelector("#barra-ambiental");
const barraSocial = document.querySelector("#barra-social");
const barraEconomica = document.querySelector("#barra-economica");
const mundoGrid = document.querySelector("#mundo-grid");
const mundoClima = document.querySelector("#mundo-clima");
const estadoComunidad = document.querySelector("#estado-comunidad");
const nivelComunidad = document.querySelector("#nivel-comunidad");

const recursoCreditos = document.querySelector("#recurso-creditos");
const recursoAgua = document.querySelector("#recurso-agua");
const recursoEnergia = document.querySelector("#recurso-energia");
const recursoComunidad = document.querySelector("#recurso-comunidad");

const temporizador = document.querySelector("#temporizador");
const tiempoRestanteElemento = document.querySelector("#tiempo-restante");
const pausarTiempo = document.querySelector("#pausar-tiempo");

let sesion = null;
let indice = 0;
let correctas = 0;
let puntos = 0;
let racha = 0;
let respondido = false;
let detalleRespuestas = [];
let equilibrio = { ambiental: 45, social: 45, economica: 45 };
let recursos = { creditos: 600, agua: 100, energia: 100, comunidad: 100 };
let fasePendiente = 1;
let intervaloTiempo = null;
let tiempoRestante = 0;
let tiempoPausado = false;

function leerJSON(storage, clave) {
  try {
    const valor = storage.getItem(clave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function limitar(valor, minimo = 0, maximo = 100) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function mostrarSolo(elemento) {
  [estado, bloqueado, autorizado].forEach((el) => { el.hidden = el !== elemento; });
}

function mostrarPantalla(elemento) {
  [pantallaInicio, pantallaFase, pantallaJuego, pantallaFinal].forEach((el) => { el.hidden = el !== elemento; });
}

function promedioEquilibrio() {
  return Math.round((equilibrio.ambiental + equilibrio.social + equilibrio.economica) / 3);
}

function actualizarRecursos() {
  recursoCreditos.textContent = recursos.creditos;
  recursoAgua.textContent = recursos.agua;
  recursoEnergia.textContent = recursos.energia;
  recursoComunidad.textContent = recursos.comunidad;

  [
    [recursoCreditos.closest(".recurso"), recursos.creditos, 120],
    [recursoAgua.closest(".recurso"), recursos.agua, 25],
    [recursoEnergia.closest(".recurso"), recursos.energia, 25],
    [recursoComunidad.closest(".recurso"), recursos.comunidad, 35]
  ].forEach(([elemento, valor, umbral]) => elemento?.classList.toggle("critico", valor <= umbral));
}

function construirMundo() {
  const promedio = promedioEquilibrio();
  let piezas;
  let clima;
  let estadoTexto;
  let nivelTexto;

  if (promedio >= 80 && recursos.comunidad >= 60) {
    piezas = ["🌳", "🏡", "☀️", "🌳", "🚲", "💧", "🌱", "🏫", "♻️", "🏠", "🌻", "🌳", "💧", "🌿", "🏡", "🚲", "🌳", "☀️"];
    clima = "☀️";
    estadoTexto = "Comunidad resiliente y en equilibrio";
    nivelTexto = "Nivel 4 · Mundo sustentable";
  } else if (promedio >= 65) {
    piezas = ["🌳", "🏠", "🌤️", "♻️", "🌱", "💧", "🏫", "🏠", "🚲", "🌿", "🏘️", "🌳", "💧", "🌱", "🏠", "♻️", "🌤️", "🌿"];
    clima = "🌤️";
    estadoTexto = "La comunidad está recuperando su equilibrio";
    nivelTexto = "Nivel 3 · Zona en mejora";
  } else if (promedio >= 50) {
    piezas = ["🌿", "🏠", "🌥️", "🗑️", "🌱", "💧", "🏘️", "🏭", "🚲", "🌱", "🏚️", "🌳", "💧", "🗑️", "🏠", "🌥️", "🌿", "🏭"];
    clima = "🌥️";
    estadoTexto = "Hay avances, pero todavía existen riesgos";
    nivelTexto = "Nivel 2 · Zona inestable";
  } else {
    piezas = ["🏭", "💨", "☁️", "🗑️", "🏚️", "🟫", "🏭", "💨", "🗑️", "🏚️", "🟫", "💧", "🗑️", "🏭", "🏚️", "💨", "🟫", "🗑️"];
    clima = "☁️";
    estadoTexto = "El territorio sigue en situación crítica";
    nivelTexto = "Nivel 1 · Zona vulnerable";
  }

  mundoClima.textContent = clima;
  estadoComunidad.textContent = estadoTexto;
  nivelComunidad.textContent = nivelTexto;
  mundoGrid.innerHTML = "";

  piezas.forEach((pieza) => {
    const bloque = document.createElement("span");
    bloque.className = "bloque-mundo";
    if (pieza === "💧") bloque.classList.add("agua");
    if (["🏠", "🏡", "🏘️", "🏫", "🏭", "🚲", "♻️"].includes(pieza)) bloque.classList.add("urbano");
    if (["💨", "🗑️", "🏚️", "🟫"].includes(pieza)) bloque.classList.add("alerta");
    bloque.textContent = pieza;
    mundoGrid.appendChild(bloque);
  });
}

function actualizarEquilibrio() {
  valorAmbiental.textContent = `${equilibrio.ambiental}%`;
  valorSocial.textContent = `${equilibrio.social}%`;
  valorEconomica.textContent = `${equilibrio.economica}%`;
  barraAmbiental.style.width = `${equilibrio.ambiental}%`;
  barraSocial.style.width = `${equilibrio.social}%`;
  barraEconomica.style.width = `${equilibrio.economica}%`;
  construirMundo();
}

function aplicarCambios(cambios = {}) {
  const equilibrioCambios = cambios.equilibrio || {};
  const recursosCambios = cambios.recursos || {};

  Object.entries(equilibrioCambios).forEach(([clave, cantidad]) => {
    equilibrio[clave] = limitar(equilibrio[clave] + cantidad);
  });

  Object.entries(recursosCambios).forEach(([clave, cantidad]) => {
    const maximo = clave === "creditos" ? 9999 : 100;
    recursos[clave] = limitar(recursos[clave] + cantidad, 0, maximo);
  });

  actualizarEquilibrio();
  actualizarRecursos();
}

function describirCambios(opcion) {
  const items = [];
  const nombresEq = { ambiental: "🌿 Ambiente", social: "👥 Sociedad", economica: "💰 Economía" };
  const nombresRec = { creditos: "🪙 Créditos", agua: "💧 Agua", energia: "⚡ Energía", comunidad: "❤️ Comunidad" };

  Object.entries(opcion.equilibrio || {}).forEach(([clave, valor]) => {
    items.push(`${nombresEq[clave]} ${valor > 0 ? "+" : ""}${valor}`);
  });
  Object.entries(opcion.recursos || {}).forEach(([clave, valor]) => {
    items.push(`${nombresRec[clave]} ${valor > 0 ? "+" : ""}${valor}`);
  });
  return items;
}

function detenerTemporizador() {
  if (intervaloTiempo) clearInterval(intervaloTiempo);
  intervaloTiempo = null;
  temporizador.hidden = true;
  tiempoPausado = false;
  pausarTiempo.textContent = "Pausar";
}

function iniciarTemporizador(segundos, mision) {
  detenerTemporizador();
  temporizador.hidden = false;
  tiempoRestante = segundos;
  tiempoRestanteElemento.textContent = tiempoRestante;

  intervaloTiempo = setInterval(() => {
    if (tiempoPausado || respondido) return;
    tiempoRestante -= 1;
    tiempoRestanteElemento.textContent = tiempoRestante;
    if (tiempoRestante <= 0) {
      detenerTemporizador();
      resolverTiempoAgotado(mision);
    }
  }, 1000);
}

function presentarFase(numeroFase) {
  detenerTemporizador();
  const fase = fases[numeroFase - 1];
  fasePendiente = numeroFase;
  document.querySelector("#fase-presentacion-icono").textContent = fase.icono;
  document.querySelector("#fase-presentacion-numero").textContent = `Fase ${fase.numero} de ${fases.length}`;
  document.querySelector("#fase-presentacion-titulo").textContent = fase.nombre;
  document.querySelector("#fase-presentacion-texto").textContent = fase.texto;
  document.querySelector("#fase-presentacion-objetivo").textContent = fase.objetivo;
  mostrarPantalla(pantallaFase);
  pantallaFase.scrollIntoView({ behavior: "smooth", block: "start" });
}

function crearBotonOpcion(opcion, indiceOpcion, mision) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "opcion-reto";
  boton.dataset.indice = String(indiceOpcion);

  const icono = document.createElement("span");
  icono.className = "opcion-icono";
  icono.textContent = opcion.icono || "🎯";

  const contenido = document.createElement("span");
  contenido.className = "opcion-contenido";
  const titulo = document.createElement("strong");
  titulo.textContent = opcion.titulo;
  const texto = document.createElement("small");
  texto.textContent = opcion.texto;
  contenido.append(titulo, texto);

  const costo = document.createElement("span");
  costo.className = "opcion-costo";
  costo.textContent = opcion.costo || "";

  boton.append(icono, contenido, costo);
  boton.addEventListener("click", () => responderOpcion(indiceOpcion, mision));
  return boton;
}

function renderizarMision() {
  respondido = false;
  feedback.hidden = true;
  feedback.className = "feedback-reto";
  feedback.innerHTML = "";
  continuar.hidden = true;
  opcionesReto.innerHTML = "";

  const mision = misiones[indice];
  const fase = fases[mision.fase - 1];
  chipFase.textContent = fase.corto;
  contadorReto.textContent = `Misión ${indice + 1} de ${misiones.length}`;
  barraProgreso.style.width = `${(indice / misiones.length) * 100}%`;
  tipoReto.textContent = mision.tipo;
  preguntaReto.textContent = mision.pregunta;
  contextoReto.textContent = mision.contexto || "";
  puntosElemento.textContent = puntos;
  rachaElemento.textContent = `🔥 Racha ${racha}`;

  mision.opciones.forEach((opcion, i) => opcionesReto.appendChild(crearBotonOpcion(opcion, i, mision)));

  if (mision.tiempo) iniciarTemporizador(mision.tiempo, mision);
  else detenerTemporizador();
}

function registrarRespuesta(mision, opcion, acierto, respuesta, motivo = "respuesta") {
  if (respondido) return;
  respondido = true;
  detenerTemporizador();

  if (acierto) {
    correctas += 1;
    racha += 1;
    puntos += 150 + Math.min(75, (racha - 1) * 15);
  } else {
    racha = 0;
  }

  aplicarCambios(opcion);
  puntosElemento.textContent = puntos;
  rachaElemento.textContent = `🔥 Racha ${racha}`;
  detalleRespuestas.push({
    id: mision.id,
    fase: mision.fase,
    correcta: acierto,
    respuesta,
    motivo
  });

  feedback.hidden = false;
  feedback.classList.toggle("error", !acierto);
  const cambios = describirCambios(opcion);
  if (motivo === "tiempo") {
    feedback.innerHTML = `<strong>⏱ Tiempo terminado</strong><span>No elegiste a tiempo. La comunidad tuvo que actuar sin tu decisión. ${mision.explicacion}</span>`;
  } else {
    feedback.innerHTML = `<strong>${acierto ? "✓ Misión superada" : "✕ Decisión de riesgo"}</strong><span>${mision.explicacion}</span>`;
  }

  if (cambios.length) {
    const cont = document.createElement("div");
    cont.className = "feedback-cambios";
    cambios.forEach((cambio) => {
      const chip = document.createElement("span");
      chip.textContent = cambio;
      cont.appendChild(chip);
    });
    feedback.appendChild(cont);
  }

  continuar.hidden = false;
  opcionesReto.querySelectorAll("button").forEach((boton) => { boton.disabled = true; });
}

function responderOpcion(indiceOpcion, mision) {
  if (respondido) return;
  const opcion = mision.opciones[indiceOpcion];
  const acierto = Boolean(opcion.correcta);

  opcionesReto.querySelectorAll(".opcion-reto").forEach((boton) => {
    const valor = Number(boton.dataset.indice);
    if (mision.opciones[valor]?.correcta) boton.classList.add("correcta");
    if (valor === indiceOpcion && !acierto) boton.classList.add("incorrecta");
  });

  registrarRespuesta(mision, opcion, acierto, opcion.titulo);
}

function resolverTiempoAgotado(mision) {
  if (respondido) return;
  const penalizacion = {
    equilibrio: mision.timeout?.equilibrio || { social: -8 },
    recursos: mision.timeout?.recursos || { comunidad: -10 }
  };
  registrarRespuesta(mision, penalizacion, false, "Sin respuesta", "tiempo");
}

function obtenerRango(porcentaje, promedio) {
  const combinado = Math.round((porcentaje * .7) + (promedio * .3));
  if (combinado >= 90) return { nombre: "Maestro de la Sustentabilidad", icono: "🏆" };
  if (combinado >= 80) return { nombre: "Guardián Ambiental", icono: "💎" };
  if (combinado >= 60) return { nombre: "Agente del Cambio", icono: "♻️" };
  if (combinado >= 40) return { nombre: "Explorador Sustentable", icono: "🌿" };
  return { nombre: "Novato Verde", icono: "🌱" };
}

async function guardarResultado(datos) {
  const estadoGuardado = document.querySelector("#estado-guardado");

  if (sesion.tipo === "admin") {
    estadoGuardado.textContent = "Modo administrador: esta partida no se agregó a las estadísticas.";
    return;
  }

  if (!auth.currentUser || auth.currentUser.uid !== sesion.uid) {
    estadoGuardado.textContent = "La partida terminó, pero no se pudo guardar porque cambió la sesión de Firebase.";
    return;
  }

  estadoGuardado.textContent = "Guardando partida...";
  try {
    await addDoc(collection(db, "resultados"), {
      uid: sesion.uid,
      nombre: sesion.nombre,
      escuela: sesion.escuela,
      juego: "EcoSurvival: Misión 2030",
      correctas: datos.correctas,
      total: misiones.length,
      porcentaje: datos.porcentaje,
      puntos: datos.puntos,
      insignia: datos.rango,
      equilibrio: { ...equilibrio },
      recursos: { ...recursos },
      respuestas: detalleRespuestas,
      fecha: serverTimestamp()
    });
    estadoGuardado.textContent = "✓ Partida guardada correctamente.";
  } catch (error) {
    console.error(error);
    estadoGuardado.textContent = "La partida terminó, pero Firebase no pudo guardarla. Revisa las reglas de Firestore.";
  }
}

function terminarJuego() {
  detenerTemporizador();
  barraProgreso.style.width = "100%";
  const porcentaje = Math.round((correctas / misiones.length) * 100);
  const promedio = promedioEquilibrio();
  const rango = obtenerRango(porcentaje, promedio);

  document.querySelector("#icono-insignia").textContent = rango.icono;
  document.querySelector("#correctas-final").textContent = `${correctas}/${misiones.length}`;
  document.querySelector("#puntos-final").textContent = puntos;
  document.querySelector("#porcentaje-final").textContent = `${porcentaje}%`;
  document.querySelector("#insignia-final").textContent = rango.nombre;
  document.querySelector("#ambiental-final").textContent = `${equilibrio.ambiental}%`;
  document.querySelector("#social-final").textContent = `${equilibrio.social}%`;
  document.querySelector("#economica-final").textContent = `${equilibrio.economica}%`;
  document.querySelector("#creditos-final").textContent = recursos.creditos;
  document.querySelector("#agua-final").textContent = recursos.agua;
  document.querySelector("#energia-final").textContent = recursos.energia;
  document.querySelector("#comunidad-final").textContent = recursos.comunidad;

  const titulo = document.querySelector("#titulo-final");
  const mensaje = document.querySelector("#mensaje-final");

  if (porcentaje >= 80 && promedio >= 70 && recursos.comunidad >= 45) {
    titulo.textContent = "¡Mundo sustentable desbloqueado!";
    mensaje.textContent = "Lograste equilibrar decisiones, recursos y bienestar. Tu comunidad quedó preparada para enfrentar nuevos retos.";
  } else if (porcentaje >= 60) {
    titulo.textContent = "¡La comunidad sobrevivió!";
    mensaje.textContent = "Superaste la misión, aunque todavía hay dimensiones y recursos que puedes mejorar en otra partida.";
  } else {
    titulo.textContent = "La zona necesita otra oportunidad";
    mensaje.textContent = "Algunas decisiones dejaron a la comunidad vulnerable. Repasa el contenido y vuelve a construir tu estrategia.";
  }

  mostrarPantalla(pantallaFinal);
  pantallaFinal.scrollIntoView({ behavior: "smooth", block: "start" });
  guardarResultado({ correctas, porcentaje, puntos, rango: rango.nombre });
}

function siguienteMision() {
  if (!respondido) return;
  const faseAnterior = misiones[indice].fase;
  indice += 1;

  if (indice >= misiones.length) {
    terminarJuego();
    return;
  }

  const faseNueva = misiones[indice].fase;
  if (faseNueva !== faseAnterior) {
    presentarFase(faseNueva);
  } else {
    renderizarMision();
    document.querySelector("#reto-actual").scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function reiniciarPartida() {
  detenerTemporizador();
  indice = 0;
  correctas = 0;
  puntos = 0;
  racha = 0;
  respondido = false;
  detalleRespuestas = [];
  equilibrio = { ambiental: 45, social: 45, economica: 45 };
  recursos = { creditos: 600, agua: 100, energia: 100, comunidad: 100 };
  document.querySelector("#estado-guardado").textContent = "";
  actualizarEquilibrio();
  actualizarRecursos();
  presentarFase(1);
}

comenzar.addEventListener("click", reiniciarPartida);
reintentar.addEventListener("click", reiniciarPartida);
continuar.addEventListener("click", siguienteMision);

entrarFase.addEventListener("click", () => {
  const mision = misiones[indice];
  if (mision.fase !== fasePendiente) return;
  mostrarPantalla(pantallaJuego);
  renderizarMision();
  pantallaJuego.scrollIntoView({ behavior: "smooth", block: "start" });
});

pausarTiempo.addEventListener("click", () => {
  if (temporizador.hidden || respondido) return;
  tiempoPausado = !tiempoPausado;
  pausarTiempo.textContent = tiempoPausado ? "Reanudar" : "Pausar";
  pausarTiempo.setAttribute("aria-label", tiempoPausado ? "Reanudar el temporizador" : "Pausar el temporizador");
});

onAuthStateChanged(auth, async (usuario) => {
  const visitante = leerJSON(sessionStorage, CLAVE_VISITANTE);
  const adminRecordado = leerJSON(localStorage, CLAVE_ADMIN);

  try {
    if (usuario && !usuario.isAnonymous) {
      const adminDoc = await getDoc(doc(db, "admins", usuario.uid));
      if (adminDoc.exists()) {
        const datos = adminDoc.data();
        sesion = {
          tipo: "admin",
          uid: usuario.uid,
          nombre: datos.nombre || adminRecordado?.nombre || "Administrador",
          escuela: "Administrador"
        };
      }
    }

    if (!sesion && usuario?.isAnonymous && visitante?.tipo === "registrado" && visitante.uid === usuario.uid) {
      const visitanteDoc = await getDoc(doc(db, "visitantes", usuario.uid));
      if (visitanteDoc.exists()) {
        const datos = visitanteDoc.data();
        sesion = {
          tipo: "registrado",
          uid: usuario.uid,
          nombre: datos.nombre || visitante.nombre,
          escuela: datos.escuela || visitante.escuela
        };
      }
    }
  } catch (error) {
    console.error(error);
  }

  if (!sesion) {
    mostrarSolo(bloqueado);
    return;
  }

  jugadorNombre.textContent = sesion.nombre;
  jugadorEscuela.textContent = sesion.escuela;
  notaAdmin.hidden = sesion.tipo !== "admin";
  actualizarEquilibrio();
  actualizarRecursos();
  mostrarSolo(autorizado);
});
