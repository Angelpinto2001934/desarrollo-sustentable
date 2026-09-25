import { auth, db } from "./firebase.js";
import {
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const CLAVE_VISITANTE = "ds_visitante";
const CLAVE_ADMIN = "ds_admin_recordado";
const TIEMPO_POR_MISION = 60;

const fases = [
  {
    numero: 1,
    nombre: "Diagnóstico y diseño sustentable",
    corto: "Diagnóstico",
    texto: "Analiza problemas escolares y urbanos. Tienes 60 segundos para identificar qué propuesta está mejor sustentada por datos y criterios integrales.",
    objetivo: "Objetivo: distinguir soluciones sistémicas de acciones aisladas que solo atienden una parte del problema."
  },
  {
    numero: 2,
    nombre: "Principios y Agenda 2030",
    corto: "Principios y ODS",
    texto: "Relaciona casos con principios de sustentabilidad, dimensiones y ODS. Todas las opciones son plausibles; compara alcance, evidencia y efectos.",
    objetivo: "Objetivo: aplicar conceptos, no repetir definiciones de memoria."
  },
  {
    numero: 3,
    nombre: "Decisiones ante riesgos climáticos",
    corto: "Riesgo climático",
    texto: "Evalúa respuestas frente a calor, inundaciones e incendios. Tienes 60 segundos por caso para elegir la estrategia con mayor prevención y resiliencia.",
    objetivo: "Objetivo: priorizar medidas integrales que reduzcan vulnerabilidad y consideren el territorio."
  }
];

const misiones = [
  {
    id: "bachiller-diagnostico",
    fase: 1,
    tipo: "Fase 1 · Gestión escolar",
    pregunta: "El plantel detecta un aumento del 18 % en consumo eléctrico, fugas recurrentes y mayor generación de residuos. El presupuesto solo permite iniciar una intervención. ¿Qué decisión ofrece una base más sólida para actuar?",
    contexto: "No elijas por intuición. Considera cómo se identifica una prioridad y cómo se comprobaría después si la intervención funcionó.",
    palabrasClave: ["línea base", "priorización", "indicadores"],
    concepto: "Diagnóstico y mejora continua",
    opciones: [
      { titulo: "Construir una línea base y priorizar impactos",
        texto: "Medir consumos, pérdidas y residuos; identificar causas; comparar impacto y costo; fijar metas e indicadores antes de asignar el presupuesto.",
        clave: "medir · priorizar · verificar", correcta: true,
        equilibrio: { ambiental: 12, social: 8, economica: 10 } },
      { titulo: "Sustituir primero los equipos de mayor consumo",
        texto: "Cambiar luminarias y aparatos antiguos por modelos eficientes porque la electricidad representa un gasto permanente del plantel.",
        clave: "eficiencia · tecnología", correcta: false,
        equilibrio: { ambiental: 7, social: 2, economica: 3 } },
      { titulo: "Iniciar una campaña de hábitos responsables",
        texto: "Promover ahorro de agua, separación de residuos y apagado de equipos antes de realizar inversiones en infraestructura.",
        clave: "hábitos · participación", correcta: false,
        equilibrio: { ambiental: 5, social: 8, economica: 4 } },
      { titulo: "Distribuir el presupuesto entre los tres problemas",
        texto: "Asignar una tercera parte a energía, agua y residuos para asegurar que ningún problema quede sin atención durante el ciclo escolar.",
        clave: "reparto · cobertura", correcta: false,
        equilibrio: { ambiental: 4, social: 4, economica: -1 } }
    ],
    explicacion: "Una línea base permite saber cuánto se consume, dónde se pierde y qué problema produce mayor impacto. Después se puede priorizar y medir resultados con indicadores, en lugar de invertir sin diagnóstico."
  },
  {
    id: "bachiller-agua",
    fase: 1,
    tipo: "Fase 1 · Gestión integral del agua",
    pregunta: "Una localidad descarga aguas residuales a un río y quiere reutilizar parte del recurso. ¿Qué propuesta se acerca más a una gestión integral del agua?",
    contexto: "Una solución completa debe considerar el tipo de contaminación, el uso posterior del agua y la verificación de su calidad.",
    palabrasClave: ["caracterización", "tratamiento", "reúso seguro"],
    concepto: "Gestión sostenible del agua",
    opciones: [
      { titulo: "Caracterizar, tratar, reutilizar y monitorear",
        texto: "Analizar la calidad del efluente, aplicar tratamiento según el riesgo, definir usos compatibles y monitorear antes del reúso o descarga.",
        clave: "calidad · tratamiento · control", correcta: true,
        equilibrio: { ambiental: 14, social: 10, economica: 8 } },
      { titulo: "Aplicar filtración y desinfección general",
        texto: "Usar filtros y desinfectantes para mejorar el agua y reutilizarla en actividades municipales que no requieran consumo humano.",
        clave: "filtración · desinfección", correcta: false,
        equilibrio: { ambiental: 7, social: 6, economica: 6 } },
      { titulo: "Construir una descarga más alejada del poblado",
        texto: "Mover el punto de descarga río abajo y establecer una zona de amortiguamiento para reducir el contacto directo con la población.",
        clave: "reubicar · amortiguar", correcta: false,
        equilibrio: { ambiental: -7, social: 1, economica: 4 } },
      { titulo: "Diluir el efluente antes de reutilizarlo",
        texto: "Mezclar el agua residual con agua de mejor calidad para reducir concentraciones y destinarla a riego de áreas verdes.",
        clave: "dilución · riego", correcta: false,
        equilibrio: { ambiental: -5, social: 2, economica: 5 } }
    ],
    explicacion: "La gestión integral no depende de que el agua se vea limpia. Requiere caracterizar contaminantes, tratar según el riesgo, definir un reúso compatible y comprobar la calidad mediante monitoreo."
  },
  {
    id: "bachiller-territorio",
    fase: 1,
    tipo: "Fase 1 · Planeación territorial",
    pregunta: "Se proyecta vivienda nueva en una zona con crecimiento urbano rápido y antecedentes de inundación. ¿Qué criterio debería tener mayor peso antes de autorizar el proyecto?",
    contexto: "La dimensión geográfica integra riesgos, servicios, condiciones ecológicas y necesidades de la población.",
    palabrasClave: ["ordenamiento", "vulnerabilidad", "servicios"],
    concepto: "Dimensión geográfica",
    opciones: [
      { titulo: "Evaluación territorial multicriterio",
        texto: "Cruzar mapas de riesgo, capacidad de servicios, movilidad, disponibilidad de agua, funciones ecológicas y necesidades sociales antes de decidir la ubicación.",
        clave: "territorio · riesgo · capacidad", correcta: true,
        equilibrio: { ambiental: 10, social: 11, economica: 8 } },
      { titulo: "Diseño hidráulico reforzado",
        texto: "Mantener el sitio previsto y exigir drenaje de mayor capacidad, bombeo y obras de protección para disminuir la exposición a inundaciones.",
        clave: "infraestructura · protección", correcta: false,
        equilibrio: { ambiental: 2, social: 6, economica: -2 } },
      { titulo: "Ubicación en el punto de mayor elevación",
        texto: "Mover el proyecto al terreno más alto disponible, aunque implique mayor distancia de transporte, escuelas y redes de servicios.",
        clave: "elevación · seguridad", correcta: false,
        equilibrio: { ambiental: 3, social: -3, economica: -2 } },
      { titulo: "Selección por costo total de construcción",
        texto: "Elegir el terreno con menor costo de adquisición y destinar el ahorro a infraestructura para reducir riesgos posteriores.",
        clave: "costo · compensación", correcta: false,
        equilibrio: { ambiental: -3, social: 2, economica: 5 } }
    ],
    explicacion: "La planeación territorial sustentable no compensa un sitio inadecuado únicamente con obras. Integra riesgo, recursos, servicios, movilidad y población desde la selección del lugar."
  },
  {
    id: "bachiller-precaucion",
    fase: 2,
    tipo: "Fase 2 · Principio de precaución",
    pregunta: "Una empresa quiere introducir una sustancia nueva cerca de un humedal. Los beneficios económicos son claros, pero la evidencia científica todavía no descarta daños graves y persistentes. ¿Qué decisión aplica mejor el principio de precaución?",
    contexto: "El principio no exige certeza absoluta para actuar, pero tampoco significa prohibir automáticamente cualquier innovación.",
    palabrasClave: ["incertidumbre", "daño grave", "medidas preventivas"],
    concepto: "Principio de precaución",
    opciones: [
      { titulo: "Condicionar el proyecto a evaluación y controles preventivos",
        texto: "Exigir estudios independientes, límites de uso, monitoreo y medidas reversibles antes de ampliar la operación mientras persista la incertidumbre relevante.",
        clave: "evaluar · prevenir · monitorear", correcta: true,
        equilibrio: { ambiental: 13, social: 8, economica: 6 } },
      { titulo: "Autorizar con un fondo de compensación ambiental",
        texto: "Permitir el proyecto si la empresa reserva recursos suficientes para restauración y reparación en caso de que aparezcan daños posteriores.",
        clave: "compensar · reparar", correcta: false,
        equilibrio: { ambiental: 1, social: 3, economica: 8 } },
      { titulo: "Autorizar una prueba comercial de escala reducida",
        texto: "Iniciar una operación menor para obtener evidencia real y suspenderla únicamente si el monitoreo detecta afectaciones claras al humedal.",
        clave: "probar · reaccionar", correcta: false,
        equilibrio: { ambiental: 3, social: 3, economica: 7 } },
      { titulo: "Prohibir cualquier uso de la sustancia",
        texto: "Cancelar de forma permanente la propuesta porque toda incertidumbre científica implica que el riesgo ambiental es inaceptable.",
        clave: "prohibición · incertidumbre", correcta: false,
        equilibrio: { ambiental: 8, social: 2, economica: -7 } }
    ],
    explicacion: "La precaución permite adoptar medidas proporcionales ante riesgo grave aun cuando exista incertidumbre. La respuesta más sólida combina evaluación, prevención, límites y monitoreo."
  },
  {
    id: "bachiller-interdependencia",
    fase: 2,
    tipo: "Fase 2 · Interdependencia y capacidad de carga",
    pregunta: "Un destino turístico costero genera empleo, pero en temporada alta aumenta la extracción de agua, los residuos y la presión sobre manglares. ¿Qué evaluación refleja mejor la sustentabilidad del proyecto?",
    contexto: "El análisis debe reconocer que economía, sociedad y ecosistemas están conectados y tienen límites.",
    palabrasClave: ["capacidad de carga", "interdependencia", "límites"],
    concepto: "Interdependencia y capacidad de carga",
    opciones: [
      { titulo: "Definir límites con indicadores ambientales, sociales y económicos",
        texto: "Estimar disponibilidad de agua, residuos, estado de ecosistemas, empleo y bienestar local para fijar una capacidad operativa y revisarla periódicamente.",
        clave: "límites · indicadores · revisión", correcta: true,
        equilibrio: { ambiental: 12, social: 9, economica: 9 } },
      { titulo: "Mantener el crecimiento mientras cumpla la normativa",
        texto: "Permitir nuevas inversiones siempre que cada establecimiento tenga permisos vigentes y cumpla individualmente las normas ambientales aplicables.",
        clave: "cumplimiento · crecimiento", correcta: false,
        equilibrio: { ambiental: 1, social: 5, economica: 10 } },
      { titulo: "Priorizar la conservación del manglar",
        texto: "Limitar nuevas obras cerca de ecosistemas sensibles y concentrar el crecimiento turístico en áreas que ya estén urbanizadas.",
        clave: "conservación · zonificación", correcta: false,
        equilibrio: { ambiental: 10, social: 3, economica: 2 } },
      { titulo: "Medir principalmente empleo e ingreso local",
        texto: "Usar generación de empleo, recaudación y derrama económica como indicadores principales y atender impactos ambientales mediante compensaciones.",
        clave: "empleo · compensación", correcta: false,
        equilibrio: { ambiental: -4, social: 6, economica: 11 } }
    ],
    explicacion: "La capacidad de carga considera límites acumulativos. No basta evaluar cada negocio por separado: deben analizarse simultáneamente agua, residuos, ecosistemas, empleo y bienestar."
  },
  {
    id: "bachiller-ods",
    fase: 2,
    tipo: "Fase 2 · ODS integrados",
    pregunta: "Un municipio enfrenta agua intermitente, descargas sin tratamiento, inundaciones urbanas y olas de calor. ¿Qué programa vincula de forma más coherente los ODS 6, 11 y 13?",
    contexto: "Busca una intervención que conecte agua y saneamiento, ciudades resilientes y acción climática.",
    palabrasClave: ["ODS 6", "ODS 11", "ODS 13"],
    concepto: "Integración de los ODS",
    opciones: [
      { titulo: "Gestión hídrica + infraestructura verde + adaptación climática",
        texto: "Reducir fugas, tratar aguas residuales, recuperar superficies permeables, mejorar alertas y ampliar sombra y eficiencia energética en zonas vulnerables.",
        clave: "agua · resiliencia · clima", correcta: true,
        equilibrio: { ambiental: 13, social: 13, economica: 7 } },
      { titulo: "Ampliación de redes de agua y drenaje",
        texto: "Invertir en tuberías, almacenamiento y drenaje pluvial para mejorar continuidad del servicio y reducir encharcamientos en las zonas urbanas.",
        clave: "infraestructura · agua", correcta: false,
        equilibrio: { ambiental: 6, social: 10, economica: 5 } },
      { titulo: "Programa municipal de energía limpia",
        texto: "Instalar paneles solares en edificios públicos, sustituir luminarias y promover movilidad eléctrica para reducir emisiones locales.",
        clave: "mitigación · energía", correcta: false,
        equilibrio: { ambiental: 10, social: 4, economica: 6 } },
      { titulo: "Plan de protección civil y refugios temporales",
        texto: "Fortalecer alertas, rutas de evacuación y centros de atención para responder a inundaciones y olas de calor durante emergencias.",
        clave: "respuesta · adaptación", correcta: false,
        equilibrio: { ambiental: 3, social: 11, economica: 3 } }
    ],
    explicacion: "Los ODS son interdependientes. La respuesta más completa atiende simultáneamente acceso y saneamiento del agua, resiliencia urbana y mitigación/adaptación climática."
  },
  {
    id: "bachiller-calor",
    fase: 3,
    tipo: "Fase 3 · Ola de calor",
    pregunta: "Una ciudad registra noches cada vez más cálidas y aumento de golpes de calor en zonas con poca vegetación. ¿Qué estrategia reduce mejor la vulnerabilidad sin depender únicamente del aire acondicionado?",
    contexto: "Tienes 60 segundos. Considera exposición, población vulnerable y características del entorno urbano.",
    palabrasClave: ["vulnerabilidad", "isla de calor", "adaptación"],
    concepto: "Adaptación al calor extremo",
    opciones: [
      { titulo: "Sistema de alerta + refugios + sombra + reducción de isla de calor",
        texto: "Mapear población vulnerable, activar alertas, habilitar espacios frescos, aumentar arbolado y sombra y usar superficies que acumulen menos calor.",
        clave: "vulnerabilidad · entorno · alerta", correcta: true,
        equilibrio: { ambiental: 10, social: 14, economica: 6 } },
      { titulo: "Ampliar climatización en edificios públicos",
        texto: "Instalar equipos de aire acondicionado de alta eficiencia en escuelas, centros de salud y oficinas para disponer de espacios seguros durante eventos extremos.",
        clave: "refrigeración · refugio", correcta: false,
        equilibrio: { ambiental: 1, social: 10, economica: -2 } },
      { titulo: "Modificar horarios escolares y laborales",
        texto: "Reducir actividades entre las 12:00 y 16:00 y desplazar tareas al exterior hacia primeras horas de la mañana y al final de la tarde.",
        clave: "exposición · horarios", correcta: false,
        equilibrio: { ambiental: 1, social: 9, economica: 3 } },
      { titulo: "Programa masivo de arborización urbana",
        texto: "Priorizar plantación de árboles en calles y parques para aumentar sombra y evapotranspiración en zonas con temperaturas elevadas.",
        clave: "arbolado · sombra", correcta: false,
        equilibrio: { ambiental: 9, social: 6, economica: 3 } }
    ],
    explicacion: "La adaptación efectiva combina información, atención a grupos vulnerables y cambios físicos del entorno. Una sola medida puede ayudar, pero no cubre todas las fuentes de vulnerabilidad.",
    timeout: { equilibrio: { social: -10, economica: -3, ambiental: -3 } }
  },
  {
    id: "bachiller-inundacion",
    fase: 3,
    tipo: "Fase 3 · Inundación urbana",
    pregunta: "Un barrio se inunda varias veces al año porque el drenaje se satura y gran parte del suelo está impermeabilizado. ¿Qué estrategia es más consistente con una gestión integral del riesgo?",
    contexto: "Tienes 60 segundos. Distingue entre reducir el peligro, reducir la exposición y mejorar la capacidad de respuesta.",
    palabrasClave: ["prevención", "infiltración", "ordenamiento"],
    concepto: "Gestión integral del riesgo",
    opciones: [
      { titulo: "Alertas + mantenimiento + infiltración + control de nuevas construcciones",
        texto: "Mejorar avisos y rutas, mantener drenajes, recuperar áreas permeables y humedales y evitar nuevas viviendas en sectores de alto riesgo.",
        clave: "respuesta · naturaleza · territorio", correcta: true,
        equilibrio: { ambiental: 11, social: 14, economica: 7 } },
      { titulo: "Ampliar la capacidad del drenaje pluvial",
        texto: "Construir colectores y estaciones de bombeo de mayor capacidad para desalojar más rápido los volúmenes de lluvia durante tormentas intensas.",
        clave: "infraestructura · desalojo", correcta: false,
        equilibrio: { ambiental: 2, social: 9, economica: 3 } },
      { titulo: "Construir bordos y muros de protección",
        texto: "Crear barreras en los puntos de entrada del agua y elevar vialidades estratégicas para mantener operativa la zona durante las inundaciones.",
        clave: "contención · protección", correcta: false,
        equilibrio: { ambiental: 1, social: 8, economica: 1 } },
      { titulo: "Fortalecer seguros y fondos de recuperación",
        texto: "Crear mecanismos financieros para reparar viviendas e infraestructura más rápido después de cada inundación y reducir pérdidas económicas familiares.",
        clave: "recuperación · finanzas", correcta: false,
        equilibrio: { ambiental: 0, social: 6, economica: 8 } }
    ],
    explicacion: "La gestión integral combina prevención, adaptación territorial, mantenimiento, soluciones basadas en la naturaleza y preparación. Aumentar drenaje por sí solo no elimina exposición ni vulnerabilidad.",
    timeout: { equilibrio: { social: -12, economica: -5, ambiental: -4 } }
  },
  {
    id: "bachiller-incendio",
    fase: 3,
    tipo: "Fase 3 · Restauración después de incendio",
    pregunta: "Después de un incendio forestal de alta intensidad, ¿qué criterio debería orientar la restauración para evitar que la intervención cause nuevos daños?",
    contexto: "Tienes 60 segundos. Restaurar no significa simplemente plantar el mayor número de árboles posible.",
    palabrasClave: ["severidad", "regeneración", "especies nativas"],
    concepto: "Restauración ecológica",
    opciones: [
      { titulo: "Diagnóstico de severidad y restauración adaptativa",
        texto: "Evaluar suelo y regeneración natural, proteger zonas frágiles, favorecer especies nativas, controlar erosión y combustibles y monitorear la recuperación.",
        clave: "diagnóstico · nativas · seguimiento", correcta: true,
        equilibrio: { ambiental: 15, social: 8, economica: 6 } },
      { titulo: "Reforestación rápida con especies de crecimiento acelerado",
        texto: "Cubrir pronto las áreas quemadas con especies de rápido crecimiento para recuperar biomasa y reducir la pérdida visual de vegetación.",
        clave: "rapidez · cobertura", correcta: false,
        equilibrio: { ambiental: 4, social: 4, economica: 5 } },
      { titulo: "Retiro generalizado de madera y material quemado",
        texto: "Extraer troncos y residuos para disminuir combustible disponible y preparar el terreno para una reforestación ordenada durante la siguiente temporada.",
        clave: "extracción · combustible", correcta: false,
        equilibrio: { ambiental: -5, social: 2, economica: 7 } },
      { titulo: "Excluir toda intervención durante varios años",
        texto: "Cerrar el área y permitir que los procesos naturales actúen sin manejo, monitoreo o participación humana hasta recuperar cobertura suficiente.",
        clave: "regeneración · no intervención", correcta: false,
        equilibrio: { ambiental: 5, social: -2, economica: -1 } }
    ],
    explicacion: "La restauración debe responder a la severidad y al estado del sitio. Algunas áreas pueden regenerarse solas y otras requieren intervención; por eso se necesita diagnóstico, especies apropiadas, control de erosión y seguimiento.",
    timeout: { equilibrio: { ambiental: -12, social: -5, economica: -3 } }
  }
];

const autorizado = document.querySelector("#juego-autorizado");
const pantallaInicio = document.querySelector("#pantalla-inicio");
const pantallaFase = document.querySelector("#pantalla-fase");
const pantallaJuego = document.querySelector("#pantalla-juego");
const pantallaFinal = document.querySelector("#pantalla-final");
const datosJugador = document.querySelector("#datos-jugador");
const jugadorNombre = document.querySelector("#jugador-nombre");
const jugadorEscuela = document.querySelector("#jugador-escuela");
const notaAdmin = document.querySelector("#nota-admin");
const comenzar = document.querySelector("#comenzar-juego");
const entrarFase = document.querySelector("#entrar-fase");
const reintentar = document.querySelector("#reintentar-juego");
const dialogoRegistro = document.querySelector("#dialogo-registro-juego");
const formularioRegistro = document.querySelector("#formulario-registro-juego");
const cerrarRegistro = document.querySelector("#cerrar-registro-juego");
const cancelarRegistro = document.querySelector("#cancelar-registro-juego");
const nombreRegistro = document.querySelector("#nombre-juego");
const escuelaRegistro = document.querySelector("#escuela-juego");
const campoActividad = document.querySelector("#campo-actividad-juego");
const actividadRegistro = document.querySelector("#actividad-juego");
const errorRegistro = document.querySelector("#error-registro-juego");

const chipFase = document.querySelector("#chip-fase");
const contadorReto = document.querySelector("#contador-reto");
const rachaElemento = document.querySelector("#racha");
const puntosElemento = document.querySelector("#puntos");
const barraProgreso = document.querySelector("#barra-progreso");
const tipoReto = document.querySelector("#tipo-reto");
const preguntaReto = document.querySelector("#pregunta-reto");
const contextoReto = document.querySelector("#contexto-reto");
const palabrasClave = document.querySelector("#palabras-clave");
const opcionesReto = document.querySelector("#opciones-reto");
const feedback = document.querySelector("#feedback-reto");
const continuar = document.querySelector("#continuar-reto");
const temporizador = document.querySelector("#temporizador");
const tiempoRestanteElemento = document.querySelector("#tiempo-restante");
const pausarTiempo = document.querySelector("#pausar-tiempo");

let sesion = null;
let misionesPartida = [];
let indice = 0;
let correctas = 0;
let puntos = 0;
let racha = 0;
let respondido = false;
let detalleRespuestas = [];
let equilibrio = { ambiental: 45, social: 45, economica: 45 };
let fasePendiente = 1;
let intervaloTiempo = null;
let tiempoRestante = 0;
let tiempoPausado = false;
let ultimaPosicionCorrecta = -1;
let registrandoJugador = false;

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

function normalizar(texto = "") {
  return texto.trim().replace(/\s+/g, " ");
}

function actualizarDatosJugador() {
  if (!sesion) {
    datosJugador.hidden = true;
    notaAdmin.hidden = true;
    return;
  }

  jugadorNombre.textContent = sesion.nombre || "Participante";
  jugadorEscuela.textContent = sesion.escuela === "Otro" && sesion.actividad
    ? sesion.actividad
    : (sesion.escuela || "—");
  datosJugador.hidden = false;
  notaAdmin.hidden = sesion.tipo !== "admin";
}

function abrirRegistroJuego() {
  errorRegistro.textContent = "";

  // El campo de actividad solo debe aparecer si se eligió "Otra institución".
  const esOtraInstitucion = escuelaRegistro.value === "Otro";
  campoActividad.hidden = !esOtraInstitucion;
  campoActividad.style.display = esOtraInstitucion ? "grid" : "none";
  actividadRegistro.required = esOtraInstitucion;
  if (!esOtraInstitucion) actividadRegistro.value = "";

  if (typeof dialogoRegistro.showModal === "function") dialogoRegistro.showModal();
  else dialogoRegistro.setAttribute("open", "");
  nombreRegistro.focus();
}

function cerrarRegistroJuego() {
  if (dialogoRegistro.open && typeof dialogoRegistro.close === "function") dialogoRegistro.close();
  else dialogoRegistro.removeAttribute("open");
}

function mostrarPantalla(elemento) {
  [pantallaInicio, pantallaFase, pantallaJuego, pantallaFinal].forEach((el) => { el.hidden = el !== elemento; });
}

function promedioEquilibrio() {
  return Math.round((equilibrio.ambiental + equilibrio.social + equilibrio.economica) / 3);
}

function aplicarImpacto(opcion = {}) {
  Object.entries(opcion.equilibrio || {}).forEach(([clave, cantidad]) => {
    equilibrio[clave] = limitar(equilibrio[clave] + cantidad);
  });
}

function mezclar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function prepararMisionesPartida() {
  // Mantiene las tres etapas, pero cambia el orden de las preguntas dentro de cada una.
  return fases.flatMap((fase) => mezclar(misiones.filter((mision) => mision.fase === fase.numero)));
}

function mezclarOpciones(opciones) {
  const mezcladas = mezclar(opciones);
  let posicionCorrecta = mezcladas.findIndex((opcion) => opcion.correcta);

  // Evita que la respuesta correcta caiga en la misma posición en dos preguntas consecutivas.
  if (mezcladas.length > 1 && posicionCorrecta === ultimaPosicionCorrecta) {
    const candidatas = mezcladas.map((_, i) => i).filter((i) => i !== posicionCorrecta);
    const nuevaPosicion = candidatas[Math.floor(Math.random() * candidatas.length)];
    [mezcladas[posicionCorrecta], mezcladas[nuevaPosicion]] = [mezcladas[nuevaPosicion], mezcladas[posicionCorrecta]];
    posicionCorrecta = nuevaPosicion;
  }

  ultimaPosicionCorrecta = posicionCorrecta;
  return mezcladas;
}

function detenerTemporizador() {
  if (intervaloTiempo) clearInterval(intervaloTiempo);
  intervaloTiempo = null;
  if (temporizador) temporizador.hidden = true;
  tiempoPausado = false;
  if (pausarTiempo) pausarTiempo.textContent = "Pausar";
}

function iniciarTemporizador(segundos, mision) {
  detenerTemporizador();
  if (!temporizador || !tiempoRestanteElemento) return;
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

  const contenido = document.createElement("span");
  contenido.className = "opcion-contenido";
  const titulo = document.createElement("strong");
  titulo.textContent = opcion.titulo;
  const texto = document.createElement("small");
  texto.textContent = opcion.texto;
  contenido.append(titulo, texto);

  const clave = document.createElement("span");
  clave.className = "opcion-costo opcion-clave";
  clave.textContent = opcion.clave || "";

  boton.append(contenido, clave);
  boton.addEventListener("click", () => responderOpcion(indiceOpcion, mision));
  return boton;
}

function renderizarPalabrasClave(mision) {
  palabrasClave.innerHTML = "";
  const titulo = document.createElement("strong");
  titulo.textContent = "Criterios de análisis:";
  palabrasClave.appendChild(titulo);
  (mision.palabrasClave || []).forEach((palabra) => {
    const chip = document.createElement("span");
    chip.textContent = palabra;
    palabrasClave.appendChild(chip);
  });
}

function renderizarMision() {
  respondido = false;
  feedback.hidden = true;
  feedback.className = "feedback-reto";
  feedback.innerHTML = "";
  continuar.hidden = true;
  opcionesReto.innerHTML = "";

  const mision = misionesPartida[indice];
  const fase = fases[mision.fase - 1];
  chipFase.textContent = fase.corto;
  contadorReto.textContent = `Misión ${indice + 1} de ${misionesPartida.length}`;
  barraProgreso.style.width = `${(indice / misionesPartida.length) * 100}%`;
  tipoReto.textContent = mision.tipo;
  preguntaReto.textContent = mision.pregunta;
  contextoReto.textContent = mision.contexto || "";
  puntosElemento.textContent = puntos;
  rachaElemento.textContent = `Racha ${racha}`;
  renderizarPalabrasClave(mision);

  // Baraja nuevamente las respuestas cada vez que se muestra el reto.
  delete mision._opcionesActuales;
  const opciones = mezclarOpciones(mision.opciones);
  mision._opcionesActuales = opciones;
  opciones.forEach((opcion, i) => opcionesReto.appendChild(crearBotonOpcion(opcion, i, mision)));

  // Todas las fases usan el mismo contador para mantener un ritmo de juego constante.
  iniciarTemporizador(mision.tiempo || TIEMPO_POR_MISION, mision);
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

  aplicarImpacto(opcion);
  puntosElemento.textContent = puntos;
  rachaElemento.textContent = `Racha ${racha}`;
  detalleRespuestas.push({
    id: mision.id,
    fase: mision.fase,
    correcta: acierto,
    respuesta,
    motivo,
    concepto: mision.concepto
  });

  feedback.hidden = false;
  feedback.classList.toggle("error", !acierto);

  if (motivo === "tiempo") {
    feedback.innerHTML = `<strong>Tiempo terminado</strong><span><b>Concepto clave: ${mision.concepto}.</b> ${mision.explicacion}</span>`;
  } else {
    feedback.innerHTML = `<strong>${acierto ? "✓ Análisis correcto" : "✕ Revisa el criterio"}</strong><span><b>Concepto clave: ${mision.concepto}.</b> ${mision.explicacion}</span>`;
  }

  continuar.hidden = false;
  opcionesReto.querySelectorAll("button").forEach((boton) => { boton.disabled = true; });
}

function responderOpcion(indiceOpcion, mision) {
  if (respondido) return;
  const opciones = mision._opcionesActuales || mision.opciones;
  const opcion = opciones[indiceOpcion];
  const acierto = Boolean(opcion.correcta);

  opcionesReto.querySelectorAll(".opcion-reto").forEach((boton) => {
    const valor = Number(boton.dataset.indice);
    if (opciones[valor]?.correcta) boton.classList.add("correcta");
    if (valor === indiceOpcion && !acierto) boton.classList.add("incorrecta");
  });

  registrarRespuesta(mision, opcion, acierto, opcion.titulo);
}

function resolverTiempoAgotado(mision) {
  if (respondido) return;
  registrarRespuesta(mision, { equilibrio: mision.timeout?.equilibrio || { social: -8 } }, false, "Sin respuesta", "tiempo");
}

function obtenerRango(porcentaje, promedio) {
  const combinado = Math.round((porcentaje * .8) + (promedio * .2));
  if (combinado >= 90) return { nombre: "Maestro de la Sustentabilidad" };
  if (combinado >= 80) return { nombre: "Guardián Ambiental" };
  if (combinado >= 60) return { nombre: "Agente del Cambio" };
  if (combinado >= 40) return { nombre: "Explorador Sustentable" };
  return { nombre: "Novato Verde" };
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
      actividad: sesion.actividad || "",
      juego: "EcoSurvival: Misión 2030",
      nivel: "Bachillerato",
      correctas: datos.correctas,
      total: misionesPartida.length,
      porcentaje: datos.porcentaje,
      puntos: datos.puntos,
      insignia: datos.rango,
      equilibrio: { ...equilibrio },
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
  const porcentaje = Math.round((correctas / misionesPartida.length) * 100);
  const promedio = promedioEquilibrio();
  const rango = obtenerRango(porcentaje, promedio);

  document.querySelector("#correctas-final").textContent = `${correctas}/${misionesPartida.length}`;
  document.querySelector("#puntos-final").textContent = puntos;
  document.querySelector("#porcentaje-final").textContent = `${porcentaje}%`;
  document.querySelector("#insignia-final").textContent = rango.nombre;
  document.querySelector("#ambiental-final").textContent = `${equilibrio.ambiental}%`;
  document.querySelector("#social-final").textContent = `${equilibrio.social}%`;
  document.querySelector("#economica-final").textContent = `${equilibrio.economica}%`;

  const titulo = document.querySelector("#titulo-final");
  const mensaje = document.querySelector("#mensaje-final");

  if (porcentaje >= 80) {
    titulo.textContent = "¡Misión completada con estrategia!";
    mensaje.textContent = "No solo reconociste conceptos: lograste aplicarlos a situaciones donde varias respuestas parecían razonables.";
  } else if (porcentaje >= 60) {
    titulo.textContent = "¡Buen análisis!";
    mensaje.textContent = "Comprendes buena parte de los conceptos. Revisa las explicaciones de los retos que fallaste y vuelve a intentarlo.";
  } else {
    titulo.textContent = "La misión necesita otra estrategia";
    mensaje.textContent = "Los distractores eran parecidos a la respuesta correcta. Repasa principios, dimensiones, ODS y cambio climático antes de volver a jugar.";
  }

  mostrarPantalla(pantallaFinal);
  pantallaFinal.scrollIntoView({ behavior: "smooth", block: "start" });
  guardarResultado({ correctas, porcentaje, puntos, rango: rango.nombre });
}

function siguienteMision() {
  if (!respondido) return;
  const faseAnterior = misionesPartida[indice].fase;
  indice += 1;

  if (indice >= misionesPartida.length) {
    terminarJuego();
    return;
  }

  const faseNueva = misionesPartida[indice].fase;
  if (faseNueva !== faseAnterior) presentarFase(faseNueva);
  else {
    renderizarMision();
    document.querySelector("#reto-actual").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function reiniciarPartida() {
  detenerTemporizador();
  misionesPartida = prepararMisionesPartida();
  ultimaPosicionCorrecta = -1;
  indice = 0;
  correctas = 0;
  puntos = 0;
  racha = 0;
  respondido = false;
  detalleRespuestas = [];
  equilibrio = { ambiental: 45, social: 45, economica: 45 };
  document.querySelector("#estado-guardado").textContent = "";
  presentarFase(1);
}

comenzar.addEventListener("click", () => {
  if (sesion?.tipo === "registrado" || sesion?.tipo === "admin") reiniciarPartida();
  else abrirRegistroJuego();
});

reintentar.addEventListener("click", () => {
  if (sesion?.tipo === "registrado" || sesion?.tipo === "admin") reiniciarPartida();
  else abrirRegistroJuego();
});

continuar.addEventListener("click", siguienteMision);

function actualizarCampoActividadRegistro() {
  const esOtro = escuelaRegistro.value === "Otro";
  campoActividad.hidden = !esOtro;
  campoActividad.style.display = esOtro ? "grid" : "none";
  actividadRegistro.required = esOtro;
  if (!esOtro) actividadRegistro.value = "";
}

escuelaRegistro.addEventListener("change", actualizarCampoActividadRegistro);
actualizarCampoActividadRegistro();

cerrarRegistro.addEventListener("click", cerrarRegistroJuego);
cancelarRegistro.addEventListener("click", cerrarRegistroJuego);
dialogoRegistro.addEventListener("click", (evento) => {
  if (evento.target === dialogoRegistro) cerrarRegistroJuego();
});

formularioRegistro.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  errorRegistro.textContent = "";

  const nombreLimpio = normalizar(nombreRegistro.value);
  const escuelaLimpia = normalizar(escuelaRegistro.value);
  const actividadLimpia = normalizar(actividadRegistro.value);

  const partesNombre = nombreLimpio.split(" ").filter(Boolean);
  const palabraNombreValida = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'-]{2,}$/u;

  if (partesNombre.length !== 2 || !partesNombre.every((parte) => palabraNombreValida.test(parte))) {
    errorRegistro.textContent = "Escribe solo tu nombre y un apellido. Ejemplo: Ana López.";
    nombreRegistro.focus();
    return;
  }

  if (!escuelaLimpia) {
    errorRegistro.textContent = "Selecciona tu institución.";
    escuelaRegistro.focus();
    return;
  }

  if (escuelaLimpia === "Otro" && actividadLimpia.length < 3) {
    errorRegistro.textContent = "Indica a qué te dedicas.";
    actividadRegistro.focus();
    return;
  }

  const boton = formularioRegistro.querySelector("button[type='submit']");
  boton.disabled = true;
  boton.textContent = "Registrando...";

  registrandoJugador = true;

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
    sesion = visitante;
    actualizarDatosJugador();
    cerrarRegistroJuego();
    reiniciarPartida();
  } catch (error) {
    console.error(error);
    errorRegistro.textContent = "No se pudo registrar la participación. Revisa la conexión con Firebase e inténtalo de nuevo.";
  } finally {
    registrandoJugador = false;
    boton.disabled = false;
    boton.textContent = "Comenzar partida";
  }
});

entrarFase.addEventListener("click", () => {
  const mision = misionesPartida[indice];
  if (mision.fase !== fasePendiente) return;
  mostrarPantalla(pantallaJuego);
  renderizarMision();
  pantallaJuego.scrollIntoView({ behavior: "smooth", block: "start" });
});

pausarTiempo?.addEventListener("click", () => {
  if (temporizador.hidden || respondido) return;
  tiempoPausado = !tiempoPausado;
  pausarTiempo.textContent = tiempoPausado ? "Reanudar" : "Pausar";
  pausarTiempo.setAttribute("aria-label", tiempoPausado ? "Reanudar el temporizador" : "Pausar el temporizador");
});

onAuthStateChanged(auth, async (usuario) => {
  if (registrandoJugador) return;

  const visitante = leerJSON(sessionStorage, CLAVE_VISITANTE);
  const adminRecordado = leerJSON(localStorage, CLAVE_ADMIN);
  sesion = null;

  try {
    if (usuario && !usuario.isAnonymous) {
      const adminDoc = await getDoc(doc(db, "admins", usuario.uid));
      if (adminDoc.exists()) {
        const datos = adminDoc.data();
        sesion = {
          tipo: "admin",
          uid: usuario.uid,
          nombre: datos.nombre || adminRecordado?.nombre || "Administrador",
          escuela: "Administrador",
          actividad: ""
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
          escuela: datos.escuela || visitante.escuela,
          actividad: datos.actividad || visitante.actividad || ""
        };
      }
    }
  } catch (error) {
    console.error(error);
  }

  // El sitio es público. Solo el juego solicita registro.
  autorizado.hidden = false;
  actualizarDatosJugador();

  if (!sesion) {
    // Al entrar a Juego se solicita el registro de inmediato.
    setTimeout(() => abrirRegistroJuego(), 120);
  }
});
