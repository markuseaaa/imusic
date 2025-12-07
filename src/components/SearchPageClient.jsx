"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ref, get } from "firebase/database";
import { db } from "@/../firebaseClient";
import ProductCard from "@/components/ProductCard";
import { applyPreorderBadge } from "@/utils/preorderBadge";
import styles from "./SearchPage.module.css";
import Image from "next/image";

// Normaliser tekst (små bogstaver, fjern accenter)
function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Simpel Levenshtein distance
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // slet
        dp[i][j - 1] + 1, // indsæt
        dp[i - 1][j - 1] + cost // erstat
      );
    }
  }

  return dp[m][n];
}

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(16);

  // Filters
  const [search, setSearch] = useState(urlQuery);
  const [typeFilter, setTypeFilter] = useState("");
  const [generalFilter, setGeneralFilter] = useState("");

  // Hent ALLE produkter + grupper (så vi kan vise artist-navn & slug)
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);

        const [groupsSnap, productsSnap] = await Promise.all([
          get(ref(db, "groups")),
          get(ref(db, "products")),
        ]);

        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};
        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};
        const todayStr = new Date().toISOString().slice(0, 10);

        const productList = Object.entries(productsRaw).map(([id, p]) => {
          const group =
            p.artistGroupId && groupsRaw[p.artistGroupId]
              ? groupsRaw[p.artistGroupId]
              : null;
          const badges = applyPreorderBadge(
            p.badges || {},
            p.releaseDate,
            todayStr
          );

          return {
            id,
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
            artist: group?.name || p.search?.artistLower || "",
            artistSlug: group?.slug || null,

            mainType: p.mainType || null,
            merchSubType: p.merchSubType || null,
            groupType: p.groupType || null,
            releaseDate: p.releaseDate || null,

            createdAt: p.createdAt || 0,
            hasPOB: !!p.hasPOB,
          };
        });

        // Standard sortering: nyeste først
        productList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!isMounted) return;
        setProducts(productList);
        setVisibleCount(16);
        setIsLoading(false);
      } catch (err) {
        console.error("Fejl ved hentning af søge-data:", err);
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = [...products];

    const searchLower = normalizeText(search.trim());

    // SØGNING
    if (searchLower) {
      list = list.filter((p) => {
        const text = normalizeText(`${p.title} ${p.artist}`);
        return text.includes(searchLower);
      });
    }

    // TYPE filter
    if (typeFilter === "album") {
      list = list.filter((p) => p.mainType === "album");
    } else if (typeFilter === "merch") {
      list = list.filter((p) => p.mainType === "merch");
    } else if (typeFilter === "lightstick") {
      list = list.filter(
        (p) => p.mainType === "merch" && p.merchSubType === "lightstick"
      );
    }

    // GENERAL filter (sortering + betingelser)
    const getEffectivePrice = (p) =>
      p.onSale && typeof p.salePrice === "number" ? p.salePrice : p.price;

    if (generalFilter === "priceLow") {
      list.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (generalFilter === "priceHigh") {
      list.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else if (generalFilter === "newest") {
      list.sort((a, b) =>
        (b.releaseDate || "").localeCompare(a.releaseDate || "")
      );
    } else if (generalFilter === "oldest") {
      list.sort((a, b) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || "")
      );
    }

    if (generalFilter === "onSale") {
      list = list.filter((p) => p.onSale);
    } else if (generalFilter === "preorder") {
      list = list.filter((p) => p.badges?.["PRE-ORDER"]);
    } else if (generalFilter === "withPOB") {
      list = list.filter((p) => p.hasPOB);
    } else if (generalFilter === "randomOnly") {
      list = list.filter((p) => p.isRandomVersion);
    }

    return list;
  }, [products, search, typeFilter, generalFilter]);

  const visibleItems = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;
  const hasResults = filteredAndSorted.length > 0;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 16);
  };

  // 🔎 FORESLÅEDE SØGNINGER
  const suggestionQueries = useMemo(() => {
    const raw = search.trim();
    const qNorm = normalizeText(raw);
    if (!qNorm || products.length === 0) return [];

    // split søgning i ord (ignorer meget korte som "in", "of", etc)
    const tokens = qNorm
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    const hasMultipleTokens = tokens.length >= 2;

    // Saml kandidater (artister + fulde titler + "core" titler)
    const candidateSet = new Set();

    products.forEach((p) => {
      if (p.artist) {
        candidateSet.add(p.artist);
      }

      if (p.title) {
        candidateSet.add(p.title);

        let core = p.title;

        // Tag sidste del efter " - " (ZEROBASEONE - NEVER SAY NEVER -> NEVER SAY NEVER)
        if (core.includes(" - ")) {
          const parts = core.split(" - ");
          core = parts[parts.length - 1];
        }

        // Fjern versioner i parentes
        if (core.includes("(")) {
          core = core.split("(")[0];
        }

        core = core.trim();
        if (core && core.length >= 3) {
          candidateSet.add(core);
        }
      }
    });

    const candidates = Array.from(candidateSet);

    const scored = candidates
      .map((original) => {
        const norm = normalizeText(original);
        if (!norm || norm === qNorm) return null;

        let overlapCount = 0;

        if (hasMultipleTokens) {
          // Ved flere ord: kræv ord-overlap (fx "never", "say")
          overlapCount = tokens.filter(
            (tok) => norm.includes(tok) || tok.includes(norm)
          ).length;
          if (overlapCount === 0) return null;
        } else {
          // Ved ét ord: vi tillader ingen direkte overlap, bruger kun distance
          overlapCount = norm.includes(qNorm) || qNorm.includes(norm) ? 1 : 0;
        }

        const dist = levenshtein(qNorm, norm);
        const similarity = overlapCount * 3 - dist;

        return { original, norm, dist, overlapCount, similarity };
      })
      .filter(Boolean);

    if (scored.length === 0) return [];

    scored.sort((a, b) => {
      // 1: flere ord i overlap
      if (a.overlapCount !== b.overlapCount) {
        return b.overlapCount - a.overlapCount;
      }
      // 2: laveste distance
      if (a.dist !== b.dist) {
        return a.dist - b.dist;
      }
      // 3: højeste similarity
      if (a.similarity !== b.similarity) {
        return b.similarity - a.similarity;
      }
      // 4: kortere forslag først
      return a.original.length - b.original.length;
    });

    const top = scored.slice(0, 3);

    // Lidt sikkerhed: hvis bedste hit er MEGET langt væk, så drop forslag
    const best = top[0];
    if (best) {
      const maxDist = hasMultipleTokens
        ? Math.ceil(qNorm.length * 1.0)
        : Math.ceil(qNorm.length * 0.6);
      if (best.dist > maxDist) {
        return [];
      }
    }

    return top.map((x) => x.original);
  }, [products, search]);

  const titleText = "Søgning";

  return (
    <main className={styles.page}>
      <div className={styles.categoryContent}>
        <header className={styles.header}>
          <div className={styles.titleWrapper}>
            <h1 className={styles.sectionTitle}>{titleText}</h1>
          </div>
        </header>

        {isLoading ? (
          <p className={styles.statusText}>Indlæser produkter…</p>
        ) : (
          <>
            {/* SØG + FILTRE — altid synlige */}
            <section className={styles.filterSection}>
              <div className={styles.searchWrapper}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Søg efter produkter, artister, albums…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <Image
                  src="/icons/search.svg"
                  alt="Søg"
                  width={20}
                  height={20}
                  className={styles.searchIcon}
                />
              </div>

              <div className={styles.filtersRow}>
                {/* TYPE */}
                <div className={styles.filterGroup}>
                  <select
                    className={`${styles.filterSelect} ${
                      typeFilter ? styles.filterSelectActive : ""
                    }`}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">Type</option>
                    <option value="album">Albums</option>
                    <option value="merch">Merchandise</option>
                    <option value="lightstick">Lightsticks</option>
                  </select>

                  {typeFilter && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setTypeFilter("")}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* GENERELT */}
                <div className={styles.filterGroup}>
                  <select
                    className={`${styles.filterSelect} ${
                      generalFilter ? styles.filterSelectActive : ""
                    }`}
                    value={generalFilter}
                    onChange={(e) => setGeneralFilter(e.target.value)}
                  >
                    <option value="">Filtrer</option>
                    <option value="priceLow">Pris (lav → høj)</option>
                    <option value="priceHigh">Pris (høj → lav)</option>
                    <option value="newest">Nyeste først</option>
                    <option value="oldest">Ældste først</option>
                    <option value="onSale">Kun på tilbud</option>
                    <option value="preorder">Kun PRE-ORDER</option>
                    <option value="withPOB">Kun med POB</option>
                    <option value="randomOnly">Kun RANDOM VER.</option>
                  </select>

                  {generalFilter && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setGeneralFilter("")}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* RESULTATER / INGEN RESULTATER */}
            {hasResults ? (
              <>
                <section className={styles.grid}>
                  {visibleItems.map((p) => (
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
            ) : (
              <div className={styles.noResults}>
                <p className={styles.statusText}>
                  {search.trim()
                    ? `Ingen produkter matchede "${search.trim()}".`
                    : "Ingen produkter at vise endnu."}
                </p>

                {suggestionQueries.length > 0 && (
                  <>
                    <p className={styles.suggestionTitle}>Måske mente du:</p>
                    <div className={styles.suggestionChips}>
                      {suggestionQueries.map((term) => (
                        <button
                          key={term}
                          type="button"
                          className={styles.suggestionChip}
                          onClick={() => setSearch(term)}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
