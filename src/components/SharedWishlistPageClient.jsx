"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ref, get, set, remove } from "firebase/database";
import { db } from "@/../firebaseClient";
import ProductCard from "@/components/ProductCard";
import { applyPreorderBadge } from "@/utils/preorderBadge";
import styles from "./SharedWishlistPage.module.css";

export default function SharedWishlistPageClient({ userId }) {
  const pathname = usePathname();

  // Fallback: hvis prop mangler, tag sidste del af URL'en
  const effectiveUserId = userId || pathname.split("/").filter(Boolean).pop();

  const [ownerName, setOwnerName] = useState("");
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔍 SharedWishlist effectiveUserId:", effectiveUserId);

    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);

        const [profileSnap, wishlistSnap, productsSnap, groupsSnap, resSnap] =
          await Promise.all([
            get(ref(db, `users/${effectiveUserId}/profile`)),
            get(ref(db, `users/${effectiveUserId}/wishlist`)),
            get(ref(db, "products")),
            get(ref(db, "groups")),
            get(ref(db, `wishlistReservations/${effectiveUserId}`)),
          ]);

        const profile = profileSnap.exists() ? profileSnap.val() : null;
        const wishlistRaw = wishlistSnap.exists() ? wishlistSnap.val() : {};
        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};
        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};
        const reservationsRaw = resSnap.exists() ? resSnap.val() : {};
        const todayStr = new Date().toISOString().slice(0, 10);

        const productIds = Object.keys(wishlistRaw);

        const list = productIds
          .map((productId) => {
            const p = productsRaw[productId];
            if (!p) return null;

            const group = p.artistGroupId
              ? groupsRaw[p.artistGroupId] || {}
              : {};
            const badges = applyPreorderBadge(
              p.badges || {},
              p.releaseDate,
              todayStr
            );

            return {
              id: productId,
              title: p.title,
              image: p.images?.cover || null,
              badges,
              price: p.price,
              salePrice: p.salePrice ?? null,
              onSale: !!p.onSale,
              currency: p.currency || "DKK",

              versions: Array.isArray(p.versions) ? p.versions : [],
              isRandomVersion: !!p.isRandomVersion,
              pobLabel: p.pobLabel || "",

              artistGroupId: p.artistGroupId || null,
              artist: group.name || p.search?.artistLower || "",
              artistSlug: group.slug || "",
            };
          })
          .filter(Boolean);

        setOwnerName(
          profile?.fullName || profile?.email || "Denne brugers ønskeliste"
        );
        setItems(list);
        setReservations(reservationsRaw || {});
      } catch (err) {
        console.error("Fejl ved hentning af delt ønskeliste:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [effectiveUserId]);

  const handleToggleReserve = async (productId) => {
    if (!effectiveUserId || !productId) return;

    const isReserved = !!reservations[productId];
    const resRef = ref(
      db,
      `wishlistReservations/${effectiveUserId}/${productId}`
    );

    try {
      if (isReserved) {
        await remove(resRef);
        setReservations((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
      } else {
        await set(resRef, true);
        setReservations((prev) => ({
          ...prev,
          [productId]: true,
        }));
      }
    } catch (err) {
      console.error("Kunne ikke opdatere reservation:", err);
    }
  };

  const titleText = useMemo(() => {
    if (!ownerName) return "Ønskeliste";
    return `${ownerName.split(" ")[0]}'s ønskeliste`;
  }, [ownerName]);

  // ---------- RENDER ----------

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <p className={styles.statusText}>Indlæser ønskeliste…</p>
        </div>
      </main>
    );
  }

  if (!effectiveUserId) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <p className={styles.statusText}>
            Ugyldigt ønskeliste-link. Tjek at adressen er korrekt.
          </p>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.titleWrapper}>
              <h1 className={styles.sectionTitle}>{titleText}</h1>
            </div>
          </header>
          <p className={styles.statusText}>
            Denne ønskeliste er tom på nuværende tidspunkt.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.titleWrapper}>
            <h1 className={styles.sectionTitle}>{titleText}</h1>
          </div>
          <p className={styles.subtitle}>
            Du kan reservere et produkt, så andre kan se at du har taget det 💝
          </p>
        </header>

        <section className={styles.grid}>
          {items.map((p) => {
            const isReserved = !!reservations[p.id];

            return (
              <div key={p.id} className={styles.cardWrapper}>
                <ProductCard
                  id={p.id}
                  image={p.image}
                  badges={p.badges}
                  title={p.title}
                  artist={p.artist}
                  artistSlug={p.artistSlug}
                  versions={p.versions}
                  isRandomVersion={p.isRandomVersion}
                  price={p.price}
                  salePrice={p.salePrice}
                  onSale={p.onSale}
                  currency={p.currency}
                />

                <button
                  type="button"
                  className={`${styles.reserveButton} ${
                    isReserved ? styles.reserveButtonActive : ""
                  }`}
                  onClick={() => handleToggleReserve(p.id)}
                >
                  {isReserved ? "Reserveret" : "Reserver"}
                </button>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
