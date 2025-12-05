"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/../firebaseClient";
import { ref, set } from "firebase/database";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth";
import styles from "./page.module.css";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const router = useRouter();
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        router.push("/profil");
      }
    });
    return () => unsub();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoadingLogin(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/profil");
    } catch (err) {
      console.error(err);
      setError("Kunne ikke logge ind. Tjek email og adgangskode.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoadingSignup(true);

    try {
      // 1) Opret bruger i Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2) Lav en users/{uid}-node i Realtime Database
      await set(ref(db, `users/${cred.user.uid}`), {
        profile: {
          email: cred.user.email,
          fullName: "",
          address: "",
          postalCode: "",
          city: "",
        },
        createdAt: Date.now(),
      });

      setInfo("Bruger oprettet – du er nu logget ind.");
      router.push("/profil");
    } catch (err) {
      console.error(err);
      setError("Kunne ikke oprette bruger. Måske findes emailen allerede?");
    } finally {
      setLoadingSignup(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setError("Skriv din email for at nulstille adgangskode.");
      return;
    }
    setError("");
    setInfo("");
    setResetSending(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo("Vi har sendt en mail med link til nulstilling af adgangskode.");
    } catch (err) {
      console.error(err);
      setError("Kunne ikke sende nulstillingsmail. Tjek email-adressen.");
    } finally {
      setResetSending(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Log ind</h1>
        <p className={styles.subtitle}>
          Opret eller log ind og lav din ønskeliste og følg med i dine favorit
          artister.
        </p>

        <form className={styles.form}>
          <label className={styles.label}>
            <span>Email</span>
            <input
              type="email"
              className={styles.input}
              placeholder="Skriv email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            <span>Adgangskode</span>
            <input
              type="password"
              className={styles.input}
              placeholder="Skriv adgangskode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button
            type="button"
            className={styles.forgot}
            onClick={handleReset}
            disabled={resetSending}
          >
            {resetSending ? "Sender mail..." : "Glemt adgangskode?"}
          </button>

          {error && <p className={styles.error}>{error}</p>}
          {info && <p className={styles.info}>{info}</p>}

          <button
            type="submit"
            className={styles.primaryButton}
            onClick={handleLogin}
            disabled={loadingLogin}
          >
            {loadingLogin ? "Logger ind..." : "Log ind"}
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleSignup}
            disabled={loadingSignup}
          >
            {loadingSignup ? "Opretter..." : "Opret"}
          </button>
        </form>
      </div>
    </main>
  );
}
