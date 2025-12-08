export function applyPreorderBadge(badges = {}, releaseDate, todayStr) {
  const dateStr = todayStr || new Date().toISOString().slice(0, 10);

  if (typeof releaseDate !== "string" || releaseDate.length !== 10) {
    return badges || {};
  }

  const isFuture = releaseDate > dateStr;

  if (isFuture) {
    return { ...(badges || {}), "PRE-ORDER": true };
  }

  const { ["PRE-ORDER"]: _omit, ...rest } = badges || {};
  return rest;
}

export function applyVinylBadge(badges = {}, mediaType) {
  const media = (mediaType || "").trim().toLowerCase();
  if (media === "vinyl") {
    return { ...(badges || {}), VINYL: true };
  }
  const { VINYL: _omit, ...rest } = badges || {};
  return rest;
}
