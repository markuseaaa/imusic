"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

const slides = [
  {
    id: 0,
    src: "/hero/zb1-hero.png",
    alt: "Zerobaseone – Never Say Never",
  },
  {
    id: 1,
    src: "/hero/zb1-hero.png",
    alt: "Stray Kids – SKZ IT TAPE - DO IT",
  },
  {
    id: 2,
    src: "/hero/zb1-hero.png",
    alt: "IVE – Ive Secret",
  },
  {
    id: 3,
    src: "/hero/zb1-hero.png",
    alt: "K-POP merch og lightsticks",
  },
];

export default function HomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroWrapper}>
          {/* Track der glider side-til-side */}
          <div
            className={styles.heroTrack}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {slides.map((slide) => (
              <div key={slide.id} className={styles.heroSlide}>
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={slide.id === 0}
                  className={styles.heroImage}
                  sizes="100vw"
                />
              </div>
            ))}
          </div>

          {/* DOTS */}
          <div className={styles.dots}>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(index)}
                className={`${styles.dot} ${
                  index === currentIndex ? styles.dotActive : ""
                }`}
                aria-label={`Gå til slide ${index + 1}`}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
