const SNAP_LANDMARK_KEY = "flower.map.snapToLandmark";

function storageKey(userId?: number | string | null): string {
  if (userId === undefined || userId === null || userId === "") {
    return SNAP_LANDMARK_KEY;
  }
  return `${SNAP_LANDMARK_KEY}.${userId}`;
}

export function getSnapToLandmark(userId?: number | string | null): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === "true";
  } catch {
    return false;
  }
}

export function saveSnapToLandmark(
  userId: number | string | null | undefined,
  value: boolean,
): void {
  try {
    if (value) localStorage.setItem(storageKey(userId), "true");
    else localStorage.removeItem(storageKey(userId));
  } catch {
    /* storage unavailable */
  }
}
