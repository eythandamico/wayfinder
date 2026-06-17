/**
 * Path artwork URLs.
 *
 * Each path resolves to an Unsplash photo via our internal API route
 * (`/api/path-image`), which keeps the Unsplash access key server-side
 * and memoizes the lookup. The browser only ever loads images from
 * `images.unsplash.com`.
 *
 * When a path ships real artwork via `Path.artwork.hero` / `.icon`,
 * that wins and the API isn't called.
 */

import type { Path } from "./paths";

export function pathHeroUrl(path: Path, width = 1280, height = 720): string {
  if (path.artwork?.hero) return path.artwork.hero;
  return `/api/path-image?id=${encodeURIComponent(path.id)}&kind=${path.kind}&w=${width}&h=${height}`;
}

export function pathIconUrl(path: Path, size = 256): string {
  if (path.artwork?.icon) return path.artwork.icon;
  // Append :icon to the id so the hero and icon resolve to different
  // photos for the same path (otherwise both would be the same image
  // cropped to different aspect ratios).
  return `/api/path-image?id=${encodeURIComponent(`${path.id}:icon`)}&kind=${path.kind}&w=${size}&h=${size}`;
}
