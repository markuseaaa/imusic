"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ref, get, set, remove } from "firebase/database";
import { auth, db } from "@/../firebaseClient";
import ProductCard from "@/components/ProductCard";
import { FaRegHeart, FaHeart, FaStar } from "react-icons/fa6";
import styles from "./ProductDetail.module.css";
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa6";
import { onAuthStateChanged } from "firebase/auth";
import { useCart } from "./CartContext";

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

function ProductsSection({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <section className={styles.productsOuter}>
      <div className={styles.productsInner}>
        <div className={styles.productsHeader}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.sectionTitle}>{title}</h2>
          </div>
        </div>

        <div className={styles.productsRow}>
          {items.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              image={p.image}
              badges={p.badges}
              title={p.title}
              artist={p.artist}
              artistSlug={p.artist ? slugifyArtist(p.artist) : undefined}
              versions={p.versions}
              isRandomVersion={p.isRandomVersion}
              price={p.price}
              salePrice={p.salePrice}
              onSale={p.onSale}
              currency={p.currency}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ProductDetail({ productId }) {
  const router = useRouter();

  // ---------- STATE ----------
  const [product, setProduct] = useState(null);
  const [groups, setGroups] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [isFav, setIsFav] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isArtistFav, setIsArtistFav] = useState(false);
  const { addItem } = useCart();

  const [currentUser, setCurrentUser] = useState(null);

  // ---------- AUTH ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u || null);
    });
    return () => unsub();
  }, []);

  // ---------- DATA-FETCH ----------
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        if (!productId) {
          if (!isMounted) return;
          setProduct(null);
          setGroups({});
          setAllProducts([]);
          setLoading(false);
          return;
        }

        const [groupsSnap, productsSnap] = await Promise.all([
          get(ref(db, "groups")),
          get(ref(db, "products")),
        ]);

        const groupsRaw = groupsSnap.exists() ? groupsSnap.val() : {};
        const productsRaw = productsSnap.exists() ? productsSnap.val() : {};

        const thisProduct = productsRaw[productId] || null;
        const groupsMap = groupsRaw || {};

        const allProductsList = Object.entries(productsRaw).map(([id, p]) => {
          const group = groupsMap[p.artistGroupId] || {};
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
            groupType: p.groupType || null,
            baseProductId: p.baseProductId || null,
          };
        });

        if (!isMounted) return;

        setGroups(groupsMap);
        setAllProducts(allProductsList);

        if (!thisProduct) {
          setProduct(null);
        } else {
          setProduct({ id: productId, ...thisProduct });
          setCurrentImageIndex(0);
          setActiveVersionIndex(0);
        }

        setLoading(false);
      } catch (err) {
        console.error("Fejl ved hentning af produktdetaljer:", err);
        if (!isMounted) return;
        setProduct(null);
        setAllProducts([]);
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // ---------- Hent om dette produkt er på ønskeliste ----------
  useEffect(() => {
    if (!currentUser || !productId) {
      return;
    }

    let cancelled = false;

    async function checkFavorite() {
      try {
        const favRef = ref(
          db,
          `users/${currentUser.uid}/wishlist/${productId}`
        );
        const snap = await get(favRef);
        if (!cancelled) {
          setIsFav(snap.exists());
        }
      } catch (err) {
        console.error("Kunne ikke tjekke ønskeliste:", err);
      }
    }

    checkFavorite();

    return () => {
      cancelled = true;
    };
  }, [currentUser, productId]);

  useEffect(() => {
    if (!currentUser || !product?.artistGroupId) return;

    let cancelled = false;

    async function checkArtistFavorite() {
      try {
        const favRef = ref(
          db,
          `users/${currentUser.uid}/favoriteArtists/${product.artistGroupId}`
        );
        const snap = await get(favRef);
        if (!cancelled) {
          setIsArtistFav(snap.exists());
        }
      } catch (err) {
        console.error("Kunne ikke tjekke favorit artist:", err);
      }
    }

    checkArtistFavorite();

    return () => {
      cancelled = true;
    };
  }, [currentUser, product?.artistGroupId]);

  // ---------- DERIVED DATA ----------
  const artistName = useMemo(() => {
    if (!product) return "";
    const group = groups[product.artistGroupId] || {};
    return group.name || product.search?.artistLower || "";
  }, [product, groups]);

  // Alle billeder: cover + gallery + versions[*].image
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const imgs = [];

    const cover = product.images?.cover;
    if (cover) imgs.push(cover);

    const galleryField = product.images?.gallery;
    if (Array.isArray(galleryField)) {
      imgs.push(...galleryField);
    } else if (galleryField) {
      imgs.push(galleryField);
    }

    if (Array.isArray(product.versions)) {
      product.versions.forEach((v) => {
        if (v?.image) imgs.push(v.image);
      });
    }

    // fjern tomme + duplikater
    return [...new Set(imgs.filter(Boolean))];
  }, [product]);

  const activeImage =
    galleryImages.length > 0
      ? galleryImages[Math.min(currentImageIndex, galleryImages.length - 1)]
      : null;

  const isRandomVersion = !!product?.isRandomVersion;
  const namedVersions =
    !isRandomVersion && Array.isArray(product?.versions)
      ? product.versions.filter((v) => v && v.name)
      : [];

  const hasPobLabel = product?.badges?.POB && product?.pobLabel;
  const hasPreorder = !!product?.badges?.["PRE-ORDER"];
  const hasPobBadge = !!product?.badges?.POB;

  const versionDetailsList = useMemo(() => {
    if (!Array.isArray(product?.versions)) return [];
    return product.versions.filter((v) => v && v.details);
  }, [product]);

  const alsoAsProducts = useMemo(() => {
    if (!product || !product.baseProductId) return [];
    const list = allProducts.filter(
      (p) => p.baseProductId === product.baseProductId && p.id !== product.id
    );
    return list.slice(0, 8);
  }, [product, allProducts]);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    const list = allProducts.filter((p) => {
      if (p.id === product.id) return false;
      if (p.baseProductId === product.baseProductId) return false;
      const sameArtist = p.artistGroupId === product.artistGroupId;
      const sameType = p.mainType === product.mainType;
      return sameArtist || sameType;
    });
    return shuffleArray(list).slice(0, 8);
  }, [product, allProducts]);

  // ---------- HANDLERS ----------
  const handlePrevImage = () => {
    if (galleryImages.length === 0) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (galleryImages.length === 0) return;
    setCurrentImageIndex((prev) =>
      prev === galleryImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      return next < 1 ? 1 : next;
    });
  };

  const handleAddToCart = () => {
    if (!product) return;

    const priceToUse =
      product.onSale && product.salePrice ? product.salePrice : product.price;

    const isRandom = !!product.isRandomVersion;

    // Brug activeVersionIndex + namedVersions til at finde valgt version
    const selectedVersion =
      !isRandom && namedVersions.length > 0
        ? namedVersions[Math.min(activeVersionIndex, namedVersions.length - 1)]
        : null;

    const versionImage = selectedVersion?.image;

    const imageToUse =
      versionImage ||
      product.images?.cover ||
      (Array.isArray(product.images?.gallery)
        ? product.images.gallery[0]
        : product.images?.gallery || null);

    addItem(
      {
        id: product.id,
        title: product.title,
        price: priceToUse,
        image: imageToUse,
        versionName: selectedVersion?.name
          ? selectedVersion.name
          : isRandom
          ? "Random version"
          : null,
        versionCode: selectedVersion?.code || null,
      },
      quantity
    );
  };

  const handleToggleFav = async () => {
    if (!product) return;

    if (!currentUser) {
      // ikke logget ind → send til login/konto
      router.push("/konto");
      return;
    }

    const favRef = ref(db, `users/${currentUser.uid}/wishlist/${product.id}`);

    try {
      if (isFav) {
        await remove(favRef);
        setIsFav(false);
      } else {
        await set(favRef, true);
        setIsFav(true);
      }
    } catch (err) {
      console.error("Kunne ikke opdatere ønskeliste:", err);
    }
  };

  const handleToggleArtistFav = async () => {
    if (!product || !product.artistGroupId) return;

    if (!currentUser) {
      router.push("/konto");
      return;
    }

    const favRef = ref(
      db,
      `users/${currentUser.uid}/favoriteArtists/${product.artistGroupId}`
    );

    try {
      if (isArtistFav) {
        await remove(favRef);
        setIsArtistFav(false);
      } else {
        await set(favRef, true);
        setIsArtistFav(true);
      }
    } catch (err) {
      console.error("Kunne ikke opdatere favorit artist:", err);
    }
  };

  // ---------- RENDER ----------
  if (!productId) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrapper}>
          <p className={styles.loadingText}>
            Mangler produkt-id i URL&apos;en.{" "}
            <button
              type="button"
              onClick={() => router.push("/")}
              className={styles.backLink}
            >
              Gå til forsiden
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrapper}>
          <p className={styles.loadingText}>Henter produkt...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrapper}>
          <p className={styles.loadingText}>
            Produktet blev ikke fundet.{" "}
            <button
              type="button"
              onClick={() => router.push("/")}
              className={styles.backLink}
            >
              Gå til forsiden
            </button>
          </p>
        </div>
      </div>
    );
  }

  const formattedPrice =
    typeof product.price === "number"
      ? product.price.toLocaleString("da-DK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : product.price;

  const formattedSalePrice =
    typeof product.salePrice === "number"
      ? product.salePrice.toLocaleString("da-DK", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : product.salePrice;

  return (
    <div className={styles.page}>
      <div className={styles.detailContent}>
        {/* VENSTRE: billede + thumbnails */}
        <section className={styles.left}>
          <div className={styles.imageMainWrapper}>
            {activeImage && (
              <Image
                src={activeImage}
                alt={product.title}
                fill
                className={styles.mainImage}
                sizes="(min-width: 1024px) 500px, 100vw"
                onClick={() => setIsImageOpen(true)}
              />
            )}

            {/* BADGES i venstre hjørne */}
            {(hasPreorder ||
              product.badges?.ALBUM ||
              product.badges?.MERCHANDISE ||
              product.badges?.LIGHTSTICK ||
              product.badges?.CLOTHES ||
              product.badges?.DIGIPACK ||
              product.badges?.DIGITAL_EDITION ||
              hasPobBadge) && (
              <div className={styles.badgeRow}>
                {hasPreorder && (
                  <span className={`${styles.badge} ${styles.badgePreorder}`}>
                    PRE-ORDER
                  </span>
                )}
                {product.badges?.ALBUM && (
                  <span className={`${styles.badge} ${styles.badgeAlbum}`}>
                    ALBUM
                  </span>
                )}
                {product.badges?.MERCHANDISE && (
                  <span className={`${styles.badge} ${styles.badgeMerch}`}>
                    MERCHANDISE
                  </span>
                )}
                {product.badges?.LIGHTSTICK && (
                  <span className={`${styles.badge} ${styles.badgeLightstick}`}>
                    LIGHTSTICK
                  </span>
                )}
                {product.badges?.CLOTHES && (
                  <span className={`${styles.badge} ${styles.badgeClothes}`}>
                    CLOTHES
                  </span>
                )}
                {product.badges?.DIGIPACK && (
                  <span className={`${styles.badge} ${styles.badgeDigipack}`}>
                    DIGIPACK
                  </span>
                )}
                {product.badges?.DIGITAL_EDITION && (
                  <span
                    className={`${styles.badge} ${styles.badgeDigitalEdition}`}
                  >
                    DIGITAL EDITION
                  </span>
                )}
                {hasPobBadge && (
                  <span className={`${styles.badge} ${styles.badgePob}`}>
                    POB
                  </span>
                )}
              </div>
            )}

            {/* Pile med gradient */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.navArrow} ${styles.navArrowLeft}`}
                  onClick={handlePrevImage}
                >
                  <FaChevronLeft className={styles.arrowIcon} />
                </button>

                <button
                  type="button"
                  className={`${styles.navArrow} ${styles.navArrowRight}`}
                  onClick={handleNextImage}
                >
                  <FaChevronRight className={styles.arrowIcon} />
                </button>
              </>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className={styles.thumbsRow}>
              {galleryImages.map((img, index) => (
                <button
                  key={img + index}
                  type="button"
                  className={`${styles.thumbButton} ${
                    index === currentImageIndex ? styles.thumbActive : ""
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <Image
                    src={img}
                    alt={`${product.title} billede ${index + 1}`}
                    width={90}
                    height={90}
                    className={styles.thumbImage}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* HØJRE: info */}
        <section className={styles.right}>
          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <div className={styles.titleWithHeart}>
                <h1 className={styles.productTitle}>{product.title}</h1>

                <button
                  type="button"
                  className={styles.heartButton}
                  onClick={handleToggleFav}
                  aria-label={
                    isFav ? "Fjern fra ønskeliste" : "Tilføj til ønskeliste"
                  }
                >
                  {isFav ? (
                    <FaHeart className={styles.heartIconFilled} />
                  ) : (
                    <FaRegHeart className={styles.heartIcon} />
                  )}
                </button>
              </div>

              {artistName && (
                <div className={styles.artistRow}>
                  {product.artistGroupId ? (
                    <Link
                      href={`/artister/${slugifyArtist(artistName)}`}
                      className={styles.artistLink}
                    >
                      <span className={styles.artistName}>{artistName}</span>
                    </Link>
                  ) : (
                    <span className={styles.artistName}>{artistName}</span>
                  )}

                  <button
                    type="button"
                    className={styles.artistFavButton}
                    aria-label={
                      isArtistFav
                        ? "Fjern favorit artist"
                        : "Tilføj som favorit artist"
                    }
                    onClick={handleToggleArtistFav}
                  >
                    <FaStar
                      className={
                        isArtistFav
                          ? `${styles.starIcon} ${styles.starIconFilled}`
                          : styles.starIcon
                      }
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.versionRow}>
            {/* RANDOM VER – altid bare label, ikke klikbar */}
            {isRandomVersion && (
              <span className={styles.versionBadge}>RANDOM VER.</span>
            )}

            {/* Hvis IKKE random og KUN 1 navngiven version → bare vis den som label */}
            {!isRandomVersion && namedVersions.length === 1 && (
              <span className={styles.versionBadge}>
                {namedVersions[0].name}
              </span>
            )}

            {/* Hvis IKKE random og FLERE versioner → klikbare badges */}
            {!isRandomVersion &&
              namedVersions.length > 1 &&
              namedVersions.map((v, index) => (
                <button
                  key={v.code || v.name || index}
                  type="button"
                  className={`${styles.versionBadge} ${
                    index === activeVersionIndex
                      ? styles.versionBadgeActive
                      : ""
                  }`}
                  onClick={() => setActiveVersionIndex(index)}
                >
                  {v.name}
                </button>
              ))}

            {hasPobLabel && (
              <span className={styles.pobBadge}>
                {product.pobLabel.toUpperCase()} POB
              </span>
            )}
          </div>

          <p className={styles.metaText}>
            Bestilles fra fjernlager
            <br />
            Forventes klar til forsendelse senere (dummy tekst – kan kobles til
            rigtige felter senere).
          </p>

          <div className={styles.priceRow}>
            {product.onSale && product.salePrice ? (
              <>
                <span className={styles.oldPrice}>
                  {formattedPrice} {product.currency || "DKK"}
                </span>
                <span className={styles.salePrice}>
                  {formattedSalePrice} {product.currency || "DKK"}
                </span>
              </>
            ) : (
              <span className={styles.price}>
                {formattedPrice} {product.currency || "DKK"}
              </span>
            )}
          </div>

          <div className={styles.cartRow}>
            <div className={styles.quantitySelector}>
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                className={styles.qtyButton}
              >
                −
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                className={styles.qtyButton}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className={styles.addToCartButton}
              onClick={handleAddToCart}
            >
              Tilføj
            </button>
          </div>

          <div className={styles.detailsSection}>
            <button
              type="button"
              className={styles.detailsHeader}
              onClick={() => setDetailsOpen((prev) => !prev)}
            >
              <span>Detaljer</span>
              <FaChevronDown
                className={`${styles.detailsIcon} ${
                  detailsOpen ? styles.detailsIconOpen : ""
                }`}
              />
            </button>

            {detailsOpen && (
              <div className={styles.detailsContent}>
                {product.details && (
                  <p className={styles.detailsText}>{product.details}</p>
                )}
                {product.releaseDate && (
                  <p className={styles.releaseDate}>
                    <strong>Udgivelsesdato:</strong> {product.releaseDate}
                  </p>
                )}
                {versionDetailsList.length > 0 && (
                  <div className={styles.versionDetails}>
                    <h3 className={styles.detailsSubTitle}>
                      Version-specifik info
                    </h3>
                    <div className={styles.versionTabs}>
                      {versionDetailsList.map((v, index) => (
                        <button
                          key={v.code || v.name || index}
                          type="button"
                          className={`${styles.versionTab} ${
                            index === activeVersionIndex
                              ? styles.versionTabActive
                              : ""
                          }`}
                          onClick={() => setActiveVersionIndex(index)}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                    <div className={styles.versionTabContent}>
                      <p>
                        {versionDetailsList[activeVersionIndex]?.details ?? ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
      {isImageOpen && activeImage && (
        <div
          className={styles.imageModalOverlay}
          onClick={() => setIsImageOpen(false)}
        >
          <div
            className={styles.imageModalInner}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt={product.title}
              fill
              sizes="100vw"
              className={styles.imageModalImage}
            />
          </div>
        </div>
      )}
      <ProductsSection title="Findes også som" items={alsoAsProducts} />
      <ProductsSection title="Andre kiggede på" items={similarProducts} />
    </div>
  );
}
