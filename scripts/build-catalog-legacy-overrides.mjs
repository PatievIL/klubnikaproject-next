import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const legacyProductsRoot = path.join(projectRoot, "shop", "products");
const outputPath = path.join(projectRoot, "catalog", "_app", "catalog-legacy-overrides.mjs");
const SITE_ORIGIN = "https://klubnikaproject.ru";
const FAQ_BASE_DATE = new Date("2026-03-01T00:00:00Z");

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
  dosatron: "dosatron",
  "irrigation-kit": "starter-irrigation-96",
  "irrigation-base-rack": "irrigation-base-rack",
  "irrigation-extra-rack": "rack-irrigation-module",
  "grodan-classic": "rootslab-classic-100",
  "grodan-prestige": "rootslab-prestige-65",
  "grodan-plug": "plug-cube-36",
  "fittings-kit-module": "fittings-kit-module",
  "metal-tray-210": "metal-gutter-210",
  "rack-base-16mats": "frame-plus-16",
  "rack-extra-16mats": "rack-extra-16mats",
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

function toAttrKey(label, index) {
  const translit = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  const normalized = String(label)
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `legacy-attr-${index + 1}`;
}

function isFilterableAttribute(label, value) {
  const normalizedLabel = String(label).trim().toLowerCase();
  const technicalPattern =
    /мощность|длина|ширина|высота|габарит|размер|формат|комплектность|спектр|световой поток|поток|модель|расход|материал|дренаж|напряжение/i;
  return technicalPattern.test(normalizedLabel) && String(value).trim().length <= 80;
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

function parseListItems(fragment) {
  return Array.from(fragment.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g))
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
}

function parsePropertyGrid(text) {
  return Array.from(text.matchAll(/<div class="property"><strong>([\s\S]*?)<\/strong><span>([\s\S]*?)<\/span><\/div>/g))
    .map((match, index) => {
      const label = stripTags(match[1]);
      const value = stripTags(match[2]);
      if (!label || !value) return null;
      return {
        key: toAttrKey(label, index),
        label,
        value,
        group: "Характеристики",
        filterable: isFilterableAttribute(label, value),
      };
    })
    .filter(Boolean);
}

function parseBlockArticles(text, className) {
  const pattern = new RegExp(`<article class="[^"]*${className}[^"]*">([\\s\\S]*?)<\\/article>`, "g");
  return Array.from(text.matchAll(pattern))
    .map((match) => {
      const content = match[1];
      const badge = matchFirst(content, /<div class="(?:badge|tag)">([\s\S]*?)<\/div>/i);
      const title = matchFirst(content, /<h3>([\s\S]*?)<\/h3>/i);
      const body = matchFirst(content, /<p>([\s\S]*?)<\/p>/i);
      const bullets = parseListItems(content);
      if (!badge && !title && !body && !bullets.length) return null;
      return {
        badge,
        title,
        body,
        bullets,
      };
    })
    .filter(Boolean);
}

function parseSplitSections(text) {
  const sections = [];
  const splitCopyMatches = Array.from(
    text.matchAll(/<div class="section-split-(?:copy|card)">([\s\S]*?)<\/div>\s*<div class="section-split-visual"/g)
  );
  splitCopyMatches.forEach((match) => {
    const content = match[1];
    const badge = matchFirst(content, /<div class="badge">([\s\S]*?)<\/div>/i);
    const title = matchFirst(content, /<h3>([\s\S]*?)<\/h3>/i);
    const bullets = parseListItems(content);
    if (!badge && !title && !bullets.length) return;
    sections.push({ badge, title, bullets });
  });
  const simpleListMatches = Array.from(text.matchAll(/<ul class="simple-list">([\s\S]*?)<\/ul>/g));
  simpleListMatches.forEach((match) => {
    const bullets = parseListItems(match[0]);
    if (!bullets.length) return;
    sections.push({ badge: "", title: "", bullets });
  });
  return sections;
}

function parseJsonLdNodes(text) {
  return Array.from(text.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi))
    .flatMap((match) => {
      try {
        const parsed = JSON.parse(match[1]);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    });
}

function buildFaqDate(index, offsetDays = 0) {
  const date = new Date(FAQ_BASE_DATE);
  date.setUTCDate(date.getUTCDate() + index * 3 + offsetDays);
  return date.toISOString().slice(0, 10);
}

function parseFaq(text) {
  const faqNode = parseJsonLdNodes(text).find((node) => node?.["@type"] === "FAQPage");
  const entities = Array.isArray(faqNode?.mainEntity) ? faqNode.mainEntity : [];
  return entities
    .map((item, index) => {
      const question = stripTags(item?.name || "");
      const answer = stripTags(item?.acceptedAnswer?.text || "");
      if (!question || !answer) return null;
      return {
        question,
        answer,
        askedAt: buildFaqDate(index),
        answeredAt: buildFaqDate(index, 1),
      };
    })
    .filter(Boolean);
}

function parseDocuments(text, legacySlug) {
  const documents = Array.from(
    text.matchAll(/href="((?:\.\.\/)+((?:assets|catalog)\/[^"]+\.(?:pdf|docx?|xlsx?|txt)))"/gi)
  )
    .map((match, index) => {
      const relativePath = match[2];
      const fileName = relativePath.split("/").pop() || `document-${index + 1}`;
      return {
        id: `${legacySlug}-doc-${index + 1}`,
        title: fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        fileUrl: relativePath,
        fileSize: "Файл",
      };
    })
    .filter((document, index, list) => list.findIndex((item) => item.fileUrl === document.fileUrl) === index);
  return documents;
}

function buildSectionHtml(section) {
  const parts = [];
  if (section.badge) parts.push(`<h3>${section.badge}</h3>`);
  if (section.title && section.title !== section.badge) parts.push(`<p><strong>${section.title}</strong></p>`);
  if (section.body) parts.push(`<p>${section.body}</p>`);
  if (section.bullets?.length) {
    parts.push(`<ul>${section.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
  }
  return parts.join("\n");
}

function buildFullDescription({ sublead, fitCards, infoCards, splitSections, fallbackBullets }) {
  const parts = [];
  if (sublead) parts.push(`<p>${sublead}</p>`);
  [...fitCards, ...infoCards, ...splitSections].forEach((section) => {
    const html = buildSectionHtml(section);
    if (html) parts.push(html);
  });
  if (!parts.length && fallbackBullets.length) {
    parts.push(`<ul>${fallbackBullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
  }
  if (parts.length === 1 && fallbackBullets.length) {
    parts.push(`<ul>${fallbackBullets.map((item) => `<li>${item}</li>`).join("")}</ul>`);
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
  const attributes = parsePropertyGrid(html);
  const fitCards = parseBlockArticles(html, "fit-card");
  const infoCards = parseBlockArticles(html, "info-card");
  const splitSections = parseSplitSections(html);
  const parsedFaq = parseFaq(html);
  const documents = parseDocuments(html, legacySlug);

  return {
    sourceSlug: legacySlug,
    sourcePath: `shop/products/${legacySlug}/`,
    name,
    article,
    shortDescription,
    fullDescription: buildFullDescription({
      sublead: sublead || shortDescription,
      fitCards,
      infoCards,
      splitSections,
      fallbackBullets: bullets,
    }),
    price,
    images,
    attributes,
    faq: parsedFaq,
    documents,
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
