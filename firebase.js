import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, setDoc, doc, onSnapshot, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDt1A5_sJmuXNTMUxAbHdO0awcq8BLMXXE",
  authDomain: "palaud.firebaseapp.com",
  projectId: "palaud",
  storageBucket: "palaud.firebasestorage.app",
  messagingSenderId: "303175661771",
  appId: "1:303175661771:web:c38dce685c3696202f834e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.query = query;
window.where = where;
window.setDoc = setDoc;
window.doc = doc;
window.onSnapshot = onSnapshot;
window.getDoc = getDoc;
window.deleteDoc = deleteDoc;
