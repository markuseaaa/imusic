export function applyPreorderBadge(badges = {}, releaseDate, todayStr) {
  const dateStr = todayStr || new Date().toISOString().slice(0, 10);

  // Only auto-handle when we have a YYYY-MM-DD date
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
