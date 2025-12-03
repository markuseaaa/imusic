"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ref, get } from "firebase/database";
import { db } from "@/../firebaseClient";
import ProductCard from "@/components/ProductCard";
import styles from "./page.module.css";

// -------------------- KONSTANTER --------------------

const FEATURED_GROUPS = [
  "Zerobaseone",
  "IVE",
  "ATEEZ",
  "BLACKPINK",
  "Stray Kids",
  "LE SSERAFIM",
];

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

function slugifyArtist(name) {
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

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Slugify så titel matcher kategori-slug på kategori-siden
function slugifyCategory(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// -------------------- CATEGORY-KOMPONENT --------------------

function Category({ title, items }) {
  const router = useRouter();

  if (!items || items.length === 0) return null;

  const slug = slugifyCategory(title);
  const href = `/kategori/${slug}`;

  const handleSeeAll = () => {
    router.push(href);
  };

  return (
    <section className={styles.productsOuter}>
      <div className={styles.productsInner}>
        {/* Titel + pil er klikbar via Link */}
        <Link href={href} className={styles.productsHeaderLink}>
          <div className={styles.productsHeader}>
            <div className={styles.titleWrapper}>
              <h2 className={styles.sectionTitle}>{title}</h2>
              {/* underline styres via .titleWrapper::after i CSS */}
            </div>
            <span className={styles.sectionArrow}>›</span>
          </div>
        </Link>

        <div className={styles.productsRow}>
          {items.map((p) => (
            <ProductCard
              key={p.id}
              image={p.image}
              badges={p.badges}
              title={p.title}
              artist={p.artist}
              artistSlug={p.artist ? slugifyArtist(p.artist) : undefined}
              versions={p.versions}
              isRandomVersion={p.isRandomVersion}
              pobLabel={p.pobLabel}
              price={p.price}
              salePrice={p.salePrice}
              onSale={p.onSale}
              currency={p.currency}
            />
          ))}

          {/* "Se alle" – altid til sidst i rækken */}
          <button
            type="button"
            className={styles.seeAllCard}
            onClick={handleSeeAll}
          >
            <span className={styles.seeAllText}>Se alle</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// -------------------- SELVE FORSIDEN --------------------

export default function HomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState({});

  // HERO auto-slide
  useEffect(() => {
    const timer = setInterval(
      () => setCurrentIndex((prev) => (prev + 1) % slides.length),
      5000
    );
    return () => clearInterval(timer);
  }, []);

  // Hent produkter + grupper fra Firebase
  useEffect(() => {
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
            artist: group.name || p.search?.artistLower || "",

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
        setGroups(groupsRaw);
      } catch (err) {
        console.error("Fejl ved hentning af produkter:", err);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // -------------------- AFLEDTE LISTER --------------------

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

  const popularNow = useMemo(() => {
    const candidates = albums.filter((p) =>
      featuredNameSet.has((p.artist || "").toLowerCase())
    );
    return shuffleArray(candidates).slice(0, 8);
  }, [albums, featuredNameSet]);

  const newReleases = useMemo(() => {
    const withDate = albums.filter(
      (p) => typeof p.releaseDate === "string" && p.releaseDate.length === 10
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

    return [...preorderUpcoming, ...otherUpcoming, ...released].slice(0, 8);
  }, [albums, todayStr]);

  const sale = useMemo(
    () => products.filter((p) => p.onSale).slice(0, 8),
    [products]
  );

  const boyGroup = useMemo(() => {
    const list = albums.filter((p) => p.groupType === "boy");
    return shuffleArray(list).slice(0, 8);
  }, [albums]);

  const girlGroup = useMemo(() => {
    const list = albums.filter((p) => p.groupType === "girl");
    return shuffleArray(list).slice(0, 8);
  }, [albums]);

  const merchItems = useMemo(() => {
    const list = merch.filter((p) => p.merchSubType !== "lightstick");
    return shuffleArray(list).slice(0, 8);
  }, [merch]);

  const lightstickItems = useMemo(() => {
    const list = merch.filter((p) => p.merchSubType === "lightstick");
    return shuffleArray(list).slice(0, 8);
  }, [merch]);

  // -------------------- RENDER --------------------

  return (
    <div className={styles.page}>
      {/* HERO SLIDER */}
      <section className={styles.hero}>
        <div className={styles.heroWrapper}>
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

      {/* K-POP GRUPPER */}
      <section className={styles.groupsOuter}>
        <div className={styles.groupsRow}>
          {FEATURED_GROUPS.map((name) => (
            <div key={name} className={styles.groupCard}>
              <div className={styles.groupImageWrapper}>
                <Image
                  src={`/images/${name.toLowerCase().replace(" ", "")}.png`}
                  alt={name}
                  width={200}
                  height={200}
                  className={styles.groupImage}
                />
              </div>
              <p className={styles.groupName}>{name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KATEGORIER */}
      <Category title="Populært lige nu" items={popularNow} />
      <Category title="Nye udgivelser" items={newReleases} />
      <Category title="På tilbud" items={sale} />
      <Category title="Boy groups" items={boyGroup} />
      <Category title="Girl groups" items={girlGroup} />
      <Category title="Merchandise" items={merchItems} />
      <Category title="Lightsticks" items={lightstickItems} />
    </div>
  );
}
