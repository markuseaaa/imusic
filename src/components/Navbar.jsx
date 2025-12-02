"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* LEFT — LOGO */}
        <Link href="/" className={styles.logo}>
          <Image
            src="/icons/imusiclogo.png"
            alt="iMusic logo"
            width={110}
            height={30}
            priority
          />
        </Link>

        {/* CENTER — NAV LINKS */}
        <nav className={styles.nav}>
          <Link href="/kpop" className={styles.active}>
            K-POP
          </Link>
          <Link href="/cd">CD’ER</Link>
          <Link href="/vinyl">VINYL</Link>
          <Link href="/film">FILM</Link>
          <Link href="/books">BØGER</Link>
          <Link href="/merch">MERCHANDISE</Link>
        </nav>

        {/* RIGHT — ICONS */}
        <div className={styles.actions}>
          <button className={styles.iconButton}>
            <Image src="/icons/search.svg" alt="Søg" width={22} height={22} />
          </button>

          <button className={styles.iconButton}>
            <Image
              src="/icons/currency.svg"
              alt="Valuta"
              width={24}
              height={24}
            />
          </button>

          <button className={styles.iconButton}>
            <Image
              src="/icons/profile.svg"
              alt="Profil"
              width={22}
              height={22}
            />
          </button>

          <button className={styles.iconButton}>
            <Image src="/icons/basket.svg" alt="Kurv" width={24} height={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
