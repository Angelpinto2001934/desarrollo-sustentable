import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Configuración de la app Web registrada en Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAtsixbcMuDDw84BYG0GFDyv7KfSYXYaMc",
  authDomain: "desarrollo-sustentable-3aj3.firebaseapp.com",
  projectId: "desarrollo-sustentable-3aj3",
  storageBucket: "desarrollo-sustentable-3aj3.firebasestorage.app",
  messagingSenderId: "468105832032",
  appId: "1:468105832032:web:8e0494d64f8e3798c80505",
  measurementId: "G-WZTMMXG96E"
};

export const FIREBASE_CONFIGURADO = !Object.values(firebaseConfig).some((valor) =>
  typeof valor === "string" && valor.startsWith("PEGA_AQUI")
);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
