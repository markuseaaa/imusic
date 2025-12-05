import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDaqHWYugGIXfaTk2ibhxMDFmwlkz0A96U",
  authDomain: "imusic-d0975.firebaseapp.com",
  databaseURL:
    "https://imusic-d0975-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "imusic-d0975",
  storageBucket: "imusic-d0975.appspot.com",
  messagingSenderId: "401200633068",
  appId: "1:401200633068:web:7807dff04a9e9bc9b8c1c9",
  measurementId: "G-C11WL0YLLH",
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db = getDatabase(app);
export const auth = getAuth(app);
