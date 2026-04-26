/**
 * External URLs used across the site. Each can be overridden at build time via
 * a NEXT_PUBLIC_* environment variable; the fallbacks are the current dev/prod
 * targets so the app keeps working without an .env file.
 *
 * To override, set the matching variable in .env.local (see .env.example).
 */

export const PATHS_CATALOG_URL =
  process.env.NEXT_PUBLIC_PATHS_CATALOG_URL ??
  "https://strategies-dev.wayfinder.ai/paths";

export const CREATE_PATH_URL =
  process.env.NEXT_PUBLIC_CREATE_PATH_URL ??
  "https://strategies-dev.wayfinder.ai/paths/create";

export const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ??
  "https://wayfinder-1.gitbook.io/wayfinder";

export const API_DOCS_URL =
  process.env.NEXT_PUBLIC_API_DOCS_URL ?? "https://docs.wayfinder.ai";

export const SDK_REPO_URL =
  process.env.NEXT_PUBLIC_SDK_REPO_URL ??
  "https://github.com/WayfinderFoundation/wayfinder-paths-sdk";
