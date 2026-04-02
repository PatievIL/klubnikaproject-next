import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const legacyProductsRoot = path.join(projectRoot, "shop", "products");
const outputPath = path.join(projectRoot, "catalog", "_app", "catalog-legacy-overrides.mjs");
const SITE_ORIGIN = "https://klubnikaproject.ru";

const LEGACY_TO_CATALOG_PRODUCT = {
  "led-50wt-60cm": "luma-line-60",
  "led-50wt-95cm": "luma-line-95",
  "led-300wt": "luma-line-191",
  "led-300wt-140cm": "canopy-boost-140",
  "led-450wt-200cm": "canopy-boost-200",
  "rivulis-supertif-22": "rivulet-dripper-22",
  "blind-tube-white": "tube-blank-16",
  "blind-tube-white-roll": "tube-blank-roll",
  "hole-punch-16-20": "punch-16-20",
  "disc-filter-3-4": "disc-filter-34",
  "irrigation-kit": "starter-irrigation-96",
  "irrigation-extra-rack": "rack-irrigation-module",
  "grodan-classic": "rootslab-classic-100",
  "grodan-prestige": "rootslab-prestige-65",
  "grodan-plug": "plug-cube-36",
  "metal-tray-210": "metal-gutter-210",
  "rack-base-16mats": "frame-plus-16",
  "farm-module": "aisle-rack-kit",
  "rack-system": "aisle-rack-kit",
};

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function matchFirst(text, pattern) {
  const match = text.match(pattern);
  return match ? decodeHtmlEntities(match[1]) : "";
}

function parseImageList(text) {
  const matches = Array.from(text.matchAll(/https:\/\/klubnikaproject\.ru\/(assets\/[^"\]]+)/g));
  const unique = [];
  for (const match of matches) {
    const assetPath = match[1];
    if (!unique.includes(assetPath)) unique.push(assetPath);
  }
  return unique;
}

function parseBullets(text) {
  const bullets = Array.from(text.matchAll(/<li>([\s\S]*?)<\/li>/g))
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  return bullets.slice(0, 6);
}

function buildFullDescription(sublead, bullets) {
  if (!sublead && !bullets.length) return "";
  const parts = [];
  if (sublead) parts.push(`<p>${sublead}</p>`);
  if (bullets.length) {
    parts.push(`<ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
  }
  return parts.join("\n");
}

function extractLegacyProduct(html, legacySlug) {
  const name = matchFirst(html, /<h1>([\s\S]*?)<\/h1>/i);
  const shortDescription =
    matchFirst(html, /<meta name="description" content="([^"]+)"/i) ||
    matchFirst(html, /<p class="sublead">\s*([\s\S]*?)\s*<\/p>/i);
  const sublead = matchFirst(html, /<p class="sublead">\s*([\s\S]*?)\s*<\/p>/i);
  const article =
    matchFirst(html, /"sku":\s*"([^"]+)"/i) ||
    matchFirst(html, /<div class="sku">[\s\S]*?:\s*([^<]+)<\/div>/i);
  const priceRaw = matchFirst(html, /"price":\s*"([^"]+)"/i).replace(/[^\d]/g, "");
  const price = priceRaw ? Number(priceRaw) : null;
  const images = parseImageList(html).slice(0, 4);
  const bullets = parseBullets(html);

  return {
    sourceSlug: legacySlug,
    sourcePath: `shop/products/${legacySlug}/`,
    name,
    article,
    shortDescription,
    fullDescription: buildFullDescription(sublead || shortDescription, bullets),
    price,
    images,
  };
}

export async function buildCatalogLegacyOverrides() {
  const overrides = {};

  for (const [legacySlug, catalogSlug] of Object.entries(LEGACY_TO_CATALOG_PRODUCT)) {
    const htmlPath = path.join(legacyProductsRoot, legacySlug, "index.html");
    const html = await readFile(htmlPath, "utf8");
    const extracted = extractLegacyProduct(html, legacySlug);
    overrides[catalogSlug] = extracted;
  }

  const moduleSource = `export const catalogLegacyOverrides = ${JSON.stringify(overrides, null, 2)};\n`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, moduleSource, "utf8");
  return overrides;
}

await buildCatalogLegacyOverrides();
