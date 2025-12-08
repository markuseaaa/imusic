"use client";

import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaChevronUp,
} from "react-icons/fa6";
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  const handleScrollTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {}
        <div className={styles.columns}>
          <div className={styles.column}>
            <h3>Vores firma</h3>
            <p>Om os</p>
            <p>Om butikken</p>
            <p>Logoer mv.</p>
          </div>

          <div className={styles.column}>
            <h3>Kundeservice</h3>
            <p>FAQ</p>
            <p>Kontakt</p>
          </div>

          <div className={styles.column}>
            <h3>Politikker</h3>
            <p>Forretningsbetingelser</p>
            <p>Persondatapolitik</p>
            <p>Cookie indstillinger</p>
          </div>
        </div>

        {}
        <div className={styles.socialWrapper}>
          <div className={styles.socialRow}>
            <div className={styles.socialItem}>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                className={styles.iconLink}
              >
                <div className={styles.iconCircle}>
                  <FaFacebookF />
                </div>
              </a>
            </div>

            <div className={styles.socialItem}>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                className={styles.iconLink}
              >
                <div className={styles.iconCircle}>
                  <FaInstagram />
                </div>
              </a>
            </div>

            <div className={styles.socialItem}>
              <a
                href="https://www.tiktok.com"
                target="_blank"
                rel="noreferrer"
                className={styles.iconLink}
              >
                <div className={styles.iconCircle}>
                  <FaTiktok />
                </div>
              </a>
            </div>
          </div>

          <div className={styles.socialRow}>
            <div className={styles.socialItem}>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                className={styles.iconLink}
              >
                <div className={styles.iconCircle}>
                  <FaInstagram />
                </div>
              </a>
              <span className={styles.kpopLabel}>K-POP</span>
            </div>

            <div className={styles.socialItem}>
              <a
                href="https://www.tiktok.com"
                target="_blank"
                rel="noreferrer"
                className={styles.iconLink}
              >
                <div className={styles.iconCircle}>
                  <FaTiktok />
                </div>
              </a>
              <span className={styles.kpopLabel}>K-POP</span>
            </div>
          </div>
        </div>

        {}
        <p className={styles.copyright}>
          © {year} iMusic A/S. Sindalsvej 36B, Risskov, Danmark
        </p>

        {}
        <button
          type="button"
          className={styles.backToTop}
          onClick={handleScrollTop}
          aria-label="Til toppen"
        >
          <FaChevronUp />
        </button>
      </div>
    </footer>
  );
}
