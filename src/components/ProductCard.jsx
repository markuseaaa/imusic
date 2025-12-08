"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./ProductCard.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BADGE_STYLES = {
  ALBUM: { label: "ALBUM", className: styles.badgeAlbum },
  POB: { label: "POB", className: styles.badgePob },
  MERCHANDISE: { label: "MERCHANDISE", className: styles.badgeMerch },
  CLOTHES: { label: "CLOTHES", className: styles.badgeClothes },
  LIGHTSTICK: { label: "LIGHTSTICK", className: styles.badgeLightstick },
  DIGIPACK: { label: "DIGIPACK", className: styles.badgeDigipack },
  VINYL: { label: "VINYL", className: styles.badgeVinyl },
  DIGITAL_EDITION: {
    label: "DIGITAL EDITION",
    className: styles.badgeDigitalEdition,
  },
  "PRE-ORDER": {
    label: "PRE-ORDER",
    className: styles.badgePreorder,
  },
};

export default function ProductCard({
  id, // 🔹 NYT: produktets id fra Firebase
  image,
  badges = {},
  title,
  artist, // fx "Zerobaseone"
  artistSlug, // fx "zerobaseone"
  versions = [],
  isRandomVersion = false,
  price,
  salePrice,
  onSale = false,
  currency = "DKK",
}) {
  const router = useRouter();

  const isPreorder = !!badges["PRE-ORDER"];

  const activeBadges = Object.entries(badges).filter(
    ([key, value]) => value && key !== "RANDOM_VER" && key !== "PRE-ORDER"
  );

  const namedVersions =
    !isRandomVersion && Array.isArray(versions)
      ? versions.filter((v) => v && v.name)
      : [];

  const versionPillsRef = useRef(null);
  const versionMeasureRef = useRef(null);
  const [visibleVersionCount, setVisibleVersionCount] = useState(null);

  useEffect(() => {
    if (isRandomVersion) return;

    const container = versionPillsRef.current;
    const measure = versionMeasureRef.current;
    if (!container || !measure) return;

    const GAP_PX = 6; // matches CSS gap

    const calculateVisible = () => {
      const pills = Array.from(
        measure.querySelectorAll("[data-version-pill]")
      );
      const moreBadge = measure.querySelector("[data-version-more]");

      if (pills.length === 0) {
        setVisibleVersionCount(0);
        return;
      }

      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;

      let used = 0;
      let count = 0;

      pills.forEach((pill) => {
        const width = pill.getBoundingClientRect().width;
        if (width === 0) return;
        const hiddenCount = pills.length - (count + 1);
        const moreWidth =
          hiddenCount > 0 && moreBadge
            ? moreBadge.getBoundingClientRect().width
            : 0;

        const gapBefore = count === 0 ? 0 : GAP_PX;
        const moreGap = hiddenCount > 0 ? GAP_PX : 0;
        const nextUsed = used + gapBefore + width + moreWidth + moreGap;
        if (nextUsed > containerWidth) return;

        used += gapBefore + width;
        count += 1;
      });

      setVisibleVersionCount(count > 0 ? count : 1);
    };

    requestAnimationFrame(calculateVisible);

    const resizeObserver = new ResizeObserver(calculateVisible);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [namedVersions, isRandomVersion]);

  const handleCardClick = () => {
    if (!id) return;
    router.push(`/produkt/${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <article
      className={styles.card}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={artist ? `${title} af ${artist}` : title}
      onKeyDown={handleKeyDown}
    >
      {}
      <div className={styles.imageWrapper}>
        {image && (
          <Image
            src={image}
            alt={title}
            width={300}
            height={300}
            className={styles.image}
          />
        )}

        {isPreorder && (
          <span className={`${styles.badge} ${styles.preorderOverlayBadge}`}>
            PRE-ORDER
          </span>
        )}
      </div>

      {}
      {activeBadges.length > 0 && (
        <div className={styles.badges}>
          {activeBadges.map(([key]) => {
            const style = BADGE_STYLES[key] || {
              label: key,
              className: styles.badgeDefault,
            };
            return (
              <span key={key} className={`${styles.badge} ${style.className}`}>
                {style.label}
              </span>
            );
          })}
        </div>
      )}

      {}
      <h3 className={styles.title}>{title}</h3>

      {}
      {artist && artistSlug ? (
        <Link
          href={`/artister/${artistSlug}`}
          className={styles.artistLink}
          onClick={(e) => e.stopPropagation()} // ← vigtigt
        >
          <p className={styles.artist}>{artist}</p>
        </Link>
      ) : artist ? (
        <p className={styles.artist}>{artist}</p>
      ) : null}

      {}
      {isRandomVersion ? (
        <span className={styles.versionBadge}>RANDOM VER.</span>
      ) : (
        namedVersions.length > 0 &&
        (() => {
          const resolvedVisible =
            typeof visibleVersionCount === "number"
              ? visibleVersionCount
              : namedVersions.length;
          const visibleVersions = namedVersions.slice(0, resolvedVisible);
          const hiddenCount = Math.max(
            namedVersions.length - resolvedVisible,
            0
          );

          return (
            <>
              <div className={styles.versionPills} ref={versionPillsRef}>
                {visibleVersions.map((v, index) => (
                  <span
                    key={v.code || v.name || index}
                    className={styles.versionBadge}
                  >
                    {v.name}
                  </span>
                ))}

                {hiddenCount > 0 && (
                  <span className={styles.versionBadgeMore}>+{hiddenCount}</span>
                )}
              </div>

              {}
              <div
                className={styles.versionMeasure}
                aria-hidden
                ref={versionMeasureRef}
              >
                <span
                  className={styles.versionBadgeMore}
                  data-version-more
                >
                  +99
                </span>
                {namedVersions.map((v, index) => (
                  <span
                    key={v.code || v.name || index}
                    className={styles.versionBadge}
                    data-version-pill
                  >
                    {v.name}
                  </span>
                ))}
              </div>
            </>
          );
        })()
      )}

      {}
      <div className={styles.priceWrapper}>
        {onSale && typeof salePrice === "number" ? (
          <>
            <span className={styles.oldPrice}>
              {price?.toLocaleString("da-DK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>

            <span className={styles.salePrice}>
              {salePrice?.toLocaleString("da-DK", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {currency}
            </span>
          </>
        ) : (
          <span className={styles.price}>
            {price?.toLocaleString("da-DK", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {currency}
          </span>
        )}
      </div>
    </article>
  );
}
