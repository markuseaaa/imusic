import Image from "next/image";
import styles from "./ProductCard.module.css";
import Link from "next/link";

const BADGE_STYLES = {
  ALBUM: { label: "ALBUM", className: styles.badgeAlbum },
  POB: { label: "POB", className: styles.badgePob },
  MERCHANDISE: { label: "MERCHANDISE", className: styles.badgeMerch },
  CLOTHES: { label: "CLOTHES", className: styles.badgeClothes },
  LIGHTSTICK: { label: "LIGHTSTICK", className: styles.badgeLightstick },
  DIGIPACK: { label: "DIGIPACK", className: styles.badgeDigipack },
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
  image,
  badges = {},
  title,
  artist, // fx "Zerobaseone"
  artistSlug, // fx "zerobaseone" (NY PROP)
  versions = [], // array af { name, code, ... }
  isRandomVersion = false,
  price,
  salePrice,
  onSale = false,
  currency = "DKK",
}) {
  // PRE-ORDER badge overlay på billedet
  const isPreorder = !!badges["PRE-ORDER"];

  // Filtrér badges til rækken under billedet (ikke RANDOM_VER, ikke PRE-ORDER)
  const activeBadges = Object.entries(badges).filter(
    ([key, value]) => value && key !== "RANDOM_VER" && key !== "PRE-ORDER"
  );

  // Hvis det IKKE er random, vis navngivne versioner som piller
  const namedVersions =
    !isRandomVersion && Array.isArray(versions)
      ? versions.filter((v) => v && v.name)
      : [];

  return (
    <article className={styles.card}>
      {/* Billede + PRE-ORDER overlay */}
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

      {/* Badges (ALBUM, MERCH, DIGIPACK, DIGITAL, osv.) */}
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

      {/* Titel */}
      <h3 className={styles.title}>{title}</h3>

      {/* Artist – kun navnet er klikbart */}
      {artist && artistSlug ? (
        <Link href={`/artister/${artistSlug}`} className={styles.artistLink}>
          <p className={styles.artist}>{artist}</p>
        </Link>
      ) : artist ? (
        <p className={styles.artist}>{artist}</p>
      ) : null}

      {/* Version-indikator */}
      {isRandomVersion ? (
        <span className={styles.versionBadge}>RANDOM VER.</span>
      ) : (
        namedVersions.length > 0 &&
        (() => {
          const MAX_VERSION_BADGES = 3;
          const visibleVersions = namedVersions.slice(0, MAX_VERSION_BADGES);
          const hiddenCount = namedVersions.length - visibleVersions.length;

          return (
            <div className={styles.versionPills}>
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
          );
        })()
      )}

      {/* Pris */}
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
