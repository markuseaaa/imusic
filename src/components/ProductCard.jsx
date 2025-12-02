"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./ProductCard.module.css";

export default function ProductCard({ product }) {
  if (!product) return null;

  const {
    id,
    title,
    artistName,
    price,
    currency,
    images,
    badges = {},
  } = product;

  const displayPrice =
    typeof price === "number" ? price.toFixed(2).replace(".", ",") : price;

  const activeBadges = Object.entries(badges)
    .filter(([, value]) => value)
    .map(([key]) => key);

  return (
    <Link href={`/product/${id || "#"}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {images?.cover ? (
          <Image
            src={images.cover}
            alt={title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 50vw, 220px"
          />
        ) : (
          <div className={styles.imagePlaceholder}>No image</div>
        )}
      </div>

      <div className={styles.badgesRow}>
        {activeBadges.map((badge) => (
          <span key={badge} className={styles.badge}>
            {badge.replace("_", " ")}
          </span>
        ))}
      </div>

      <h3 className={styles.title}>{title}</h3>
      {artistName && <p className={styles.artist}>{artistName}</p>}

      <p className={styles.price}>
        {displayPrice} {currency || "DKK"}
      </p>
    </Link>
  );
}
