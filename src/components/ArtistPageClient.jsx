"use client";

import { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/../firebaseClient";
import ProductCard from "@/components/ProductCard";
import styles from "./ArtistPage.module.css";
import Image from "next/image";

export default function ArtistPageClient({ slug }) {
  const [artistGroup, setArtistGroup] = useState(null);
  const [products, setProducts] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(16);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [generalFilter, setGeneralFilter] = useState("");

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoading(true);

        const [groupsSnap, productsSnap, membersSnap] = await Promise.all([
          get(ref(db, "groups")),
          get(ref(db, "products")),
          get(ref(db, "members")),
        ]);

        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};
        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};
        const membersRaw = membersSnap.exists() ? membersSnap.val() : {};

        // Find artist group via slug
        const groupEntry = Object.entries(groupsRaw).find(
          ([, g]) => g.slug === slug
        );

        if (!groupEntry) {
          if (!isMounted) return;
          setArtistGroup(null);
          setProducts([]);
          setMembers([]);
          setIsLoading(false);
          return;
        }

        const [groupId, groupData] = groupEntry;

        const artistProducts = Object.entries(productsRaw)
          .filter(([, p]) => p.artistGroupId === groupId)
          .map(([id, p]) => ({
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
            artist: groupData.name || p.search?.artistLower || "",
            artistSlug: groupData.slug,

            mainType: p.mainType || null,
            merchSubType: p.merchSubType || null,
            groupType: p.groupType || null,
            releaseDate: p.releaseDate || null,

            createdAt: p.createdAt || 0,
            hasPOB: !!p.hasPOB,
          }));

        artistProducts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const artistMembers = Object.values(membersRaw)
          .filter((m) => m.groupId === groupId)
          .map((m) => m.name);

        if (!isMounted) return;

        setArtistGroup({ id: groupId, ...groupData });
        setProducts(artistProducts);
        setMembers(artistMembers);
        setVisibleCount(16);
        setIsLoading(false);
      } catch (err) {
        console.error("Fejl ved hentning af artist-side:", err);
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const filteredAndSorted = useMemo(() => {
    let list = [...products];

    const searchLower = search.trim().toLowerCase();

    if (searchLower) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          (p.artist || "").toLowerCase().includes(searchLower)
      );
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

    // MEMBER filter (virker først rigtigt når produkter har members-list)
    if (memberFilter) {
      list = list.filter((p) =>
        Array.isArray(p.members) ? p.members.includes(memberFilter) : false
      );
    }

    // GENERAL filter (sortering + ekstra betingelser)
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
  }, [products, search, typeFilter, memberFilter, generalFilter]);

  const visibleItems = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 16);
  };

  if (!slug) {
    return (
      <main className={styles.page}>
        <div className={styles.categoryContent}>
          <header className={styles.header}>
            <div className={styles.titleWrapper}>
              <h1 className={styles.sectionTitle}>Loading…</h1>
            </div>
          </header>
        </div>
      </main>
    );
  }

  const titleText = artistGroup?.name || "Artist";

  // ---- Dynamiske widths til filter-pills (ren JS) ----
  const typeLabelMap = {
    "": "Type",
    album: "Albums",
    merch: "Merchandise",
    lightstick: "Lightsticks",
  };

  const generalLabelMap = {
    "": "Filtrer",
    priceLow: "Pris (lav → høj)",
    priceHigh: "Pris (høj → lav)",
    newest: "Nyeste først",
    oldest: "Ældste først",
    onSale: "Kun på tilbud",
    preorder: "Kun PRE-ORDER",
    withPOB: "Kun med POB",
    randomOnly: "Kun RANDOM VER.",
  };

  const typeLabel = typeLabelMap[typeFilter] ?? "Type";
  const memberLabel = memberFilter || "Artist";
  const generalLabel = generalLabelMap[generalFilter] ?? "Filtrer";

  const typeWidthCh = typeLabel.length + 8;
  const memberWidthCh = memberLabel.length + 8;
  const generalWidthCh = generalLabel.length + 8;

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
        ) : !artistGroup ? (
          <p className={styles.statusText}>Kunne ikke finde denne artist.</p>
        ) : products.length === 0 ? (
          <p className={styles.statusText}>
            Der er ingen produkter for denne artist endnu.
          </p>
        ) : (
          <>
            {/* SØG + FILTRE */}
            <section className={styles.filterSection}>
              <div className={styles.searchWrapper}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Søg i titler for denne artist…"
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
                    style={{ width: `${typeWidthCh}ch` }}
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

                {/* MEDLEM */}
                <div className={styles.filterGroup}>
                  <select
                    className={`${styles.filterSelect} ${
                      memberFilter ? styles.filterSelectActive : ""
                    }`}
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    style={{ width: `${memberWidthCh}ch` }}
                  >
                    <option value="">Artist</option>
                    {members.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {memberFilter && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => setMemberFilter("")}
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
                    style={{ width: `${generalWidthCh}ch` }}
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

            {/* PRODUKTGRID */}
            <section className={styles.grid}>
              {visibleItems.map((p) => (
                <div key={p.id} className={styles.cardWrapper}>
                  <ProductCard
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
        )}
      </div>
    </main>
  );
}
