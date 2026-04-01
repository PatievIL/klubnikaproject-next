import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://klubnikaproject.ru";
const EXCLUDED_FROM_INDEX = [
  /^calc\/admin\//,
  /^calc\/klubnika\//
];
const EXCLUDED_FROM_SCAN = [
  /^\.git\//,
  /^assets\//,
  /^docs\//,
  /^scripts\//
];

const HOMEPAGE_TITLE = "Klubnika Project — расчёт, комплектация и запуск клубничных ферм";

const htmlFiles = (await walk(PROJECT_ROOT))
  .map((filePath) => path.relative(PROJECT_ROOT, filePath).replaceAll(path.sep, "/"))
  .filter((relativePath) => relativePath.endsWith(".html"))
  .filter((relativePath) => !EXCLUDED_FROM_SCAN.some((pattern) => pattern.test(relativePath)))
  .sort();

const sitemapEntries = [];

for (const relativePath of htmlFiles) {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  const original = await fs.readFile(absolutePath, "utf8");
  const normalizedTitle = normalizeTitle(relativePath, original);
  const withNormalizedTitle = replaceTitle(original, normalizedTitle);
  const seoBlock = buildSeoBlock(relativePath, withNormalizedTitle);
  const updated = replaceSeoBlock(withNormalizedTitle, seoBlock);

  if (updated !== original) {
    await fs.writeFile(absolutePath, updated);
  }

  if (!isNoindex(relativePath)) {
    sitemapEntries.push({
      path: toCanonicalPath(relativePath),
      lastmod: formatDate((await fs.stat(absolutePath)).mtime)
    });
  }
}

await fs.writeFile(path.join(PROJECT_ROOT, "robots.txt"), buildRobotsTxt());
await fs.writeFile(path.join(PROJECT_ROOT, "sitemap.xml"), buildSitemapXml(sitemapEntries));

console.log(`SEO build complete. HTML files processed: ${htmlFiles.length}. Sitemap URLs: ${sitemapEntries.length}.`);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(resolved);
    return [resolved];
  }));
  return files.flat();
}

function buildSeoBlock(relativePath, html) {
  const canonicalUrl = `${SITE_ORIGIN}${toCanonicalPath(relativePath)}`;
  const noindex = isNoindex(relativePath);
  const tags = [];

  if (noindex) {
    tags.push('  <meta name="robots" content="noindex, nofollow" />');
  } else {
    tags.push('  <meta name="robots" content="index, follow, max-image-preview:large" />');
    tags.push(`  <link rel="canonical" href="${canonicalUrl}" />`);
  }

  const schema = buildSchema(relativePath, html, canonicalUrl, noindex);
  if (schema) {
    tags.push('  <script type="application/ld+json">');
    tags.push(indentJson(schema));
    tags.push("  </script>");
  }

  return `  <!-- SEO:START -->\n${tags.join("\n")}\n  <!-- SEO:END -->`;
}

function buildSchema(relativePath, html, canonicalUrl, noindex) {
  if (noindex) return null;

  const title = extractTitle(html);
  const description = extractMetaDescription(html) || extractFirstText(html, /<p class="sublead">([\s\S]*?)<\/p>/i);
  const h1 = extractFirstText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || title;
  const items = [];

  items.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: h1,
    description,
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${SITE_ORIGIN}/#website`
    }
  });

  if (relativePath === "index.html") {
    items.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: "Klubnika Project",
      url: `${SITE_ORIGIN}/`,
      logo: `${SITE_ORIGIN}/assets/brand-lockup-green.svg`
    });
    items.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: "Klubnika Project",
      inLanguage: "ru-RU",
      publisher: {
        "@id": `${SITE_ORIGIN}/#organization`
      }
    });
  }

  const breadcrumbSchema = buildBreadcrumbSchema(relativePath, html, canonicalUrl);
  if (breadcrumbSchema) items.push(breadcrumbSchema);

  const productSchema = buildProductSchema(html, canonicalUrl, description);
  if (productSchema) items.push(productSchema);

  const faqSchema = buildFaqSchema(html, canonicalUrl);
  if (faqSchema) items.push(faqSchema);

  return items.length === 1 ? items[0] : items;
}

function buildBreadcrumbSchema(relativePath, html, canonicalUrl) {
  const blockMatch = html.match(/<div class="crumbs">([\s\S]*?)<\/div>/i);
  if (!blockMatch) return null;

  const rawBlock = blockMatch[1];
  const linkedCrumbs = [...rawBlock.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/gi)].map((match) => ({
    name: stripHtml(match[2]),
    item: resolveUrl(match[1], `${SITE_ORIGIN}${dirnameToUrlPath(relativePath)}`)
  }));

  const currentLabel =
    extractLastText(rawBlock, /<span>([\s\S]*?)<\/span>/gi) ||
    extractFirstText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

  const allCrumbs = [...linkedCrumbs];
  if (currentLabel) {
    allCrumbs.push({ name: currentLabel, item: canonicalUrl });
  }

  if (!allCrumbs.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumbs`,
    itemListElement: allCrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item
    }))
  };
}

function buildProductSchema(html, canonicalUrl, fallbackDescription) {
  if (!html.includes('class="product-layout"')) return null;

  const name = extractFirstText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!name) return null;

  const priceText = extractFirstText(html, /<div class="product-price">([\s\S]*?)<\/div>/i);
  const price = normalizePrice(priceText);
  const skuText = extractFirstText(html, /<div class="sku">([\s\S]*?)<\/div>/i);
  const description =
    extractMetaDescription(html) ||
    extractFirstText(html, /<p class="sublead">([\s\S]*?)<\/p>/i) ||
    fallbackDescription;
  const imageUrls = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi)]
    .map((match) => match[1])
    .filter(Boolean)
    .slice(0, 5)
    .map((src) => resolveUrl(src, canonicalUrl));

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    name,
    url: canonicalUrl,
    description,
    brand: {
      "@type": "Brand",
      name: "Klubnika Project"
    }
  };

  if (skuText) product.sku = skuText.replace(/^[^:]+:\s*/u, "").trim();
  if (imageUrls.length) product.image = imageUrls;
  if (price) {
    product.offers = {
      "@type": "Offer",
      priceCurrency: "RUB",
      price,
      url: canonicalUrl
    };
  }

  return product;
}

function buildFaqSchema(html, canonicalUrl) {
  const matches = [...html.matchAll(/<article class="card faq-box">([\s\S]*?)<\/article>/gi)];
  const mainEntity = matches
    .map((match) => {
      const question = extractFirstText(match[1], /<strong>([\s\S]*?)<\/strong>/i);
      const answer = extractFirstText(match[1], /<p>([\s\S]*?)<\/p>/i);
      if (!question || !answer) return null;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      };
    })
    .filter(Boolean);

  if (!mainEntity.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    mainEntity
  };
}

function replaceSeoBlock(html, seoBlock) {
  const cleaned = html.replace(/\n?\s*<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->\s*\n?/g, "\n");
  if (cleaned.includes("</head>")) {
    return cleaned.replace("</head>", `${seoBlock}\n</head>`);
  }
  return `${seoBlock}\n${cleaned}`;
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function normalizeTitle(relativePath, html) {
  const title = extractTitle(html);
  if (!title) return relativePath === "index.html" ? HOMEPAGE_TITLE : "Klubnika Project";
  if (relativePath === "index.html") return HOMEPAGE_TITLE;

  return title
    .replace(/^КлубникаПро\s+—\s+/u, "Klubnika Project — ")
    .replace(/\s+—\s+КлубникаПро$/u, " — Klubnika Project");
}

function extractTitle(html) {
  return extractFirstText(html, /<title>([\s\S]*?)<\/title>/i);
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i);
  return match ? decodeHtml(match[1].trim()) : "";
}

function extractFirstText(text, pattern) {
  const match = text.match(pattern);
  return match ? stripHtml(match[1]) : "";
}

function extractLastText(text, pattern) {
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return "";
  return stripHtml(matches[matches.length - 1][1]);
}

function stripHtml(text) {
  return decodeHtml(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizePrice(text = "") {
  const cleaned = text.replace(/\s+/g, "").match(/[\d,.]+/);
  if (!cleaned) return "";
  return cleaned[0].replace(",", ".");
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveUrl(rawUrl, baseUrl) {
  try {
    return new URL(rawUrl, baseUrl).href;
  } catch {
    return rawUrl;
  }
}

function dirnameToUrlPath(relativePath) {
  if (relativePath === "index.html") return "/";
  const dir = path.posix.dirname(relativePath);
  return `/${dir}/`;
}

function toCanonicalPath(relativePath) {
  if (relativePath === "index.html") return "/";
  if (relativePath.endsWith("/index.html")) {
    return `/${relativePath.slice(0, -"/index.html".length)}/`;
  }
  return `/${relativePath}`;
}

function isNoindex(relativePath) {
  return EXCLUDED_FROM_INDEX.some((pattern) => pattern.test(relativePath));
}

function buildRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /calc/admin/",
    "Disallow: /calc/klubnika/",
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    ""
  ].join("\n");
}

function buildSitemapXml(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${SITE_ORIGIN}${entry.path}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>", "");
  return lines.join("\n");
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function indentJson(value) {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}
