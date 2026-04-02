import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./build-catalog-legacy-overrides.mjs");
await import("./build-catalog-data-exports.mjs");

import {
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
  catalogData,
  createDefaultCategoryDraft,
  getCategoryPageData,
  getLandingPageData,
  getProductPageData,
} from "../catalog/_app/catalog-data.mjs";
import { getRouteMeta, renderCatalogApp } from "../catalog/_app/catalog-renderers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const catalogRoot = path.join(projectRoot, "catalog");
const version = "20260402a";

function jsonScript(data) {
  return JSON.stringify(data, null, 2);
}

function siteRootForDepth(depth) {
  return "../".repeat(depth + 1);
}

function catalogRootForDepth(depth) {
  return depth === 0 ? "./" : "../".repeat(depth);
}

function resolveAbsoluteImage(origin, imagePath) {
  return `${origin}/${imagePath}`.replace(/([^:]\/)\/+/g, "$1");
}

function buildContext(route, depth) {
  return {
    route,
    siteRoot: siteRootForDepth(depth),
    catalogRoot: catalogRootForDepth(depth),
  };
}

function buildInitialState(route) {
  const base = {
    cart: {},
    dialogs: {},
    search: { query: "", mode: "catalog" },
    newsletterStatus: "",
    flashMessage: "",
  };

  if (route.type === "category") {
    const applied = createDefaultCategoryDraft(new URLSearchParams());
    return {
      ...base,
      category: {
        searchParams: new URLSearchParams(),
        applied,
        draft: structuredClone(applied),
        selectedProductIds: [],
      },
    };
  }

  if (route.type === "product") {
    const data = getProductPageData(route.categorySlug, route.productSlug);
    return {
      ...base,
      product: {
        activeTab: "description",
        activeImageIndex: 0,
        reviewSort: "newest",
        reviews: data.reviews,
      },
    };
  }

  return base;
}

function buildJsonLd(route) {
  if (route.type === "landing") {
    const data = getLandingPageData();
    return [buildBreadcrumbListJsonLd(data.breadcrumbs)];
  }

  if (route.type === "category") {
    const data = getCategoryPageData(route.categorySlug, new URLSearchParams());
    return [buildBreadcrumbListJsonLd(data.breadcrumbs)];
  }

  const data = getProductPageData(route.categorySlug, route.productSlug);
  return [buildBreadcrumbListJsonLd(data.breadcrumbs), buildProductJsonLd(data.category, data.product)];
}

function buildHtml(route, depth) {
  const ctx = buildContext(route, depth);
  const meta = getRouteMeta(route);
  const state = buildInitialState(route);
  const jsonLd = buildJsonLd(route);
  const preRendered = renderCatalogApp(ctx, state);
  const ogType = route.type === "product" ? "product" : "website";
  const ogImage = resolveAbsoluteImage("https://klubnikaproject.ru", meta.ogImage);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${meta.canonical}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:url" content="${meta.canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <link rel="icon" href="${ctx.siteRoot}assets/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="${ctx.siteRoot}assets/apple-touch-icon.png" />
  <link rel="manifest" href="${ctx.siteRoot}site.webmanifest" />
  <link rel="stylesheet" href="${ctx.siteRoot}styles.css?v=${version}" />
  <link rel="stylesheet" href="${ctx.catalogRoot}_app/catalog-app.css?v=${version}" />
  ${jsonLd.map((entry) => `<script type="application/ld+json">\n${jsonScript(entry)}\n</script>`).join("\n  ")}
</head>
<body>
  <div id="catalog-app">${preRendered}</div>
  <script>
    window.__CATALOG_ROUTE__ = ${JSON.stringify(route)};
    window.__CATALOG_CONTEXT__ = ${JSON.stringify(ctx)};
  </script>
  <script type="module" src="${ctx.catalogRoot}_app/catalog-app.js?v=${version}"></script>
</body>
</html>
`;
}

async function cleanGeneratedRoutes() {
  const entries = await readdir(catalogRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => !["_app", "files"].includes(entry.name))
      .map((entry) => rm(path.join(catalogRoot, entry.name), { recursive: true, force: true }))
  );
}

async function writeRoute(relativeDir, html) {
  const targetDir = path.join(catalogRoot, relativeDir);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, "index.html"), html, "utf8");
}

async function ensureStaticSupportFiles() {
  const filesDir = path.join(catalogRoot, "files");
  await mkdir(filesDir, { recursive: true });
  const docs = {
    "passport-led-series.txt": "Паспорт серии линейных светильников.\nСодержит основные параметры, монтаж и сервисные заметки.\n",
    "mounting-checklist.txt": "Чек-лист монтажа: подвес, сервисный доступ, кабель, расстояние до листа.\n",
    "irrigation-passport.txt": "Паспорт линии полива: диаметр, фильтрация, подача, сервисная чистка.\n",
    "rack-specification.txt": "Спецификация каркасов и рядов: длина, нагрузка, проход, совместимость.\n",
    "substrate-guide.txt": "Памятка по предувлажнению, запуску мата и раннему этапу корневой зоны.\n",
    "planting-note.txt": "Памятка по приёмке Frigo и семенных серий, окнам высадки и логистике.\n",
    "climate-sheet.txt": "Шпаргалка по климатическому контуру: циркуляция, влажность, датчики, сервис.\n",
    "nutrition-sheet.txt": "Карта растворов, буферов и регулярных замеров pH / EC.\n",
    "monitoring-guide.txt": "Памятка по контроллерам, датчикам и базовой телеметрии модуля.\n",
    "packaging-sheet.txt": "Памятка по фасовке, контейнерам и базовой маркировке партии.\n",
  };
  await Promise.all(
    Object.entries(docs).map(([filename, content]) => writeFile(path.join(filesDir, filename), content, "utf8"))
  );
}

async function build() {
  await mkdir(catalogRoot, { recursive: true });
  await cleanGeneratedRoutes();
  await ensureStaticSupportFiles();

  await writeRoute("", buildHtml({ type: "landing" }, 0));

  await Promise.all(
    catalogData.categories.map((category) => writeRoute(category.slug, buildHtml({ type: "category", categorySlug: category.slug }, 1)))
  );

  await Promise.all(
    catalogData.products.map((product) => {
      const data = getProductPageData(
        catalogData.categories.find((category) => category.id === product.categoryId)?.slug,
        product.slug
      );
      return writeRoute(
        path.join(data.category.slug, product.slug),
        buildHtml({ type: "product", categorySlug: data.category.slug, productSlug: product.slug }, 2)
      );
    })
  );
}

await build();
