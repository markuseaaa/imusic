"use client";

import { useEffect, useState, useMemo } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/../firebaseClient";
import ProductCard from "@/components/ProductCard";
import styles from "./CategoryPage.module.css";

const FEATURED_GROUPS = [
  "Zerobaseone",
  "IVE",
  "ATEEZ",
  "BLACKPINK",
  "Stray Kids",
  "LE SSERAFIM",
];

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Bruges som fallback hvis vi ikke finder slug på gruppen
function slugifyName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_TITLES = {
  "populaert-lige-nu": "Populært lige nu",
  "nye-udgivelser": "Nye udgivelser",
  "paa-tilbud": "På tilbud",
  "boy-groups": "Boy groups",
  "girl-groups": "Girl groups",
  merchandise: "Merchandise",
  lightsticks: "Lightsticks",
};

export default function CategoryPageClient({ slug }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(16);

  const categoryTitle = CATEGORY_TITLES[slug] || "Kategori";

  // Hent produkter én gang pr. slug
  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    async function fetchData() {
      try {
        const [productsSnap, groupsSnap] = await Promise.all([
          get(ref(db, "products")),
          get(ref(db, "groups")),
        ]);

        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};
        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};

        const list = Object.entries(productsRaw).map(([id, p]) => {
          const group = groupsRaw[p.artistGroupId] || {};

          const artistName = group.name || p.search?.artistLower || "";

          const artistSlug = group.slug || slugifyName(artistName);

          return {
            id,
            title: p.title,
            image: p.images?.cover || null,
            badges: p.badges || {},
            price: p.price,
            salePrice: p.salePrice ?? null,
            onSale: !!p.onSale,
            currency: p.currency || "DKK",

            versions: Array.isArray(p.versions) ? p.versions : [],
            isRandomVersion: !!p.isRandomVersion,
            pobLabel: p.pobLabel || "",

            artistGroupId: p.artistGroupId || null,
            artist: artistName,
            artistSlug, // 🔥 gem slug her

            mainType: p.mainType || null,
            merchSubType: p.merchSubType || null,
            groupType: p.groupType || null,
            releaseDate: p.releaseDate || null,

            createdAt: p.createdAt || 0,
          };
        });

        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!isMounted) return;
        setProducts(list);
        setIsLoading(false);
        setVisibleCount(16); // reset "Vis flere" ved ny kategori
      } catch (err) {
        console.error("Fejl ved hentning af produkter på kategori-side:", err);
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const featuredNameSet = useMemo(
    () => new Set(FEATURED_GROUPS.map((name) => name.toLowerCase())),
    []
  );

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const albums = useMemo(
    () => products.filter((p) => p.mainType === "album"),
    [products]
  );

  const merch = useMemo(
    () => products.filter((p) => p.mainType === "merch"),
    [products]
  );

  const allCategoryItems = useMemo(() => {
    if (!slug) return [];

    switch (slug) {
      case "populaert-lige-nu": {
        const candidates = albums.filter((p) =>
          featuredNameSet.has((p.artist || "").toLowerCase())
        );
        return shuffleArray(candidates);
      }

      case "nye-udgivelser": {
        const withDate = albums.filter(
          (p) =>
            typeof p.releaseDate === "string" && p.releaseDate.length === 10
        );

        const preorderUpcoming = withDate
          .filter(
            (p) => p.badges?.["PRE-ORDER"] === true && p.releaseDate >= todayStr
          )
          .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

        const otherUpcoming = withDate
          .filter(
            (p) =>
              (!p.badges?.["PRE-ORDER"] || p.badges["PRE-ORDER"] === false) &&
              p.releaseDate >= todayStr
          )
          .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

        const released = withDate
          .filter((p) => p.releaseDate < todayStr)
          .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

        return [...preorderUpcoming, ...otherUpcoming, ...released];
      }

      case "paa-tilbud": {
        return products.filter((p) => p.onSale);
      }

      case "boy-groups": {
        const list = albums.filter((p) => p.groupType === "boy");
        return shuffleArray(list);
      }

      case "girl-groups": {
        const list = albums.filter((p) => p.groupType === "girl");
        return shuffleArray(list);
      }

      case "merchandise": {
        const list = merch.filter((p) => p.merchSubType !== "lightstick");
        return shuffleArray(list);
      }

      case "lightsticks": {
        const list = merch.filter((p) => p.merchSubType === "lightstick");
        return shuffleArray(list);
      }

      default:
        return [];
    }
  }, [slug, albums, merch, products, featuredNameSet, todayStr]);

  const visibleItems = allCategoryItems.slice(0, visibleCount);
  const hasMore = visibleCount < allCategoryItems.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 16);
  };

  if (!slug) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.titleWrapper}>
            <h1 className={styles.sectionTitle}>Loading…</h1>
          </div>
        </header>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.categoryContent}>
        <header className={styles.header}>
          <div className={styles.titleWrapper}>
            <h1 className={styles.sectionTitle}>{categoryTitle}</h1>
          </div>
        </header>

        {isLoading ? (
          <p className={styles.statusText}>Indlæser produkter…</p>
        ) : allCategoryItems.length === 0 ? (
          <p className={styles.statusText}>
            Der er ingen produkter i denne kategori endnu.
          </p>
        ) : (
          <>
            <section className={styles.grid}>
              {visibleItems.map((p) => (
                <div key={p.id} className={styles.cardWrapper}>
                  <ProductCard
                    image={p.image}
                    badges={p.badges}
                    title={p.title}
                    artist={p.artist}
                    artistSlug={p.artistSlug} // ✅ nu kommer sluggen rigtigt fra state
                    versions={p.versions}
                    isRandomVersion={p.isRandomVersion}
                    pobLabel={p.pobLabel}
                    price={p.price}
                    salePrice={p.salePrice}
                    onSale={p.onSale}
                    currency={p.currency}
                  />
                </div>
              ))}
            </section>

            {hasMore && (
              <div className={styles.loadMoreWrapper}>
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={handleShowMore}
                >
                  Vis flere
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
