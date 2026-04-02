import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATALOG_META,
  STOCK_META,
  catalogData,
  getCategoryAncestors,
  getCategoryById,
  getProductCatalogPath,
} from "../catalog/_app/catalog-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const backendDataDir = path.join(projectRoot, "backend", "data");
const adminDir = path.join(projectRoot, "admin");

const CATEGORY_CTA_MODE = {
  racks: "estimate",
  climate: "consult",
  monitoring: "consult",
  "planting-material": "consult",
};

function topLevelCategoryFor(category) {
  const ancestors = getCategoryAncestors(category);
  return ancestors[0] || category;
}

function categoryPath(category) {
  return `/catalog/${category.slug}/`;
}

function categoryCtaMode(category) {
  const topLevel = topLevelCategoryFor(category);
  if (category.parentId) return "choose";
  return CATEGORY_CTA_MODE[topLevel.slug] || "choose";
}

function productCtaMode(product) {
  const stock = STOCK_META[product.stockStatus] || STOCK_META.out_of_stock;
  if (!stock.purchasable) return "consult";
  if (product.stockStatus === "preorder") return "consult";
  return "buy";
}

function buildCatalogItems() {
  const categoryItems = catalogData.categories.map((category) => ({
    slug: `catalog-${category.parentId ? "subcategory" : "category"}-${category.slug}`,
    title: category.name,
    kind: category.parentId ? "subcategory" : "category",
    category: topLevelCategoryFor(category).slug,
    path: categoryPath(category),
    cta_mode: categoryCtaMode(category),
    status: "published",
    summary: category.description,
  }));

  const productItems = catalogData.products.map((product) => ({
    slug: `catalog-product-${product.slug}`,
    title: product.name,
    kind: "product",
    category: product.categorySlug || getCategoryById(product.categoryId)?.slug || "",
    path: getProductCatalogPath(product),
    cta_mode: productCtaMode(product),
    status: "published",
    summary: product.shortDescription,
  }));

  return [...categoryItems, ...productItems];
}

function buildCatalogSnapshot(items) {
  return {
    generatedAt: new Date().toISOString(),
    source: "catalogData",
    basePath: CATALOG_META.catalogBasePath,
    shopName: CATALOG_META.shopName,
    slogan: CATALOG_META.slogan,
    counts: {
      categories: catalogData.categories.length,
      products: catalogData.products.length,
      items: items.length,
    },
    items,
    categories: catalogData.categories.map((category) => {
      const topLevel = topLevelCategoryFor(category);
      return {
        id: category.id,
        parentId: category.parentId,
        slug: category.slug,
        name: category.name,
        description: category.description,
        image: category.image,
        productCount: category.productCount,
        sortOrder: category.sortOrder,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
        topLevelSlug: topLevel.slug,
        path: categoryPath(category),
      };
    }),
    products: catalogData.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      article: product.article,
      categoryId: product.categoryId,
      categorySlug: product.categorySlug || getCategoryById(product.categoryId)?.slug || "",
      topLevelCategorySlug: topLevelCategoryFor(getCategoryById(product.categoryId) || { slug: "", parentId: null }).slug,
      path: getProductCatalogPath(product),
      shortDescription: product.shortDescription,
      price: product.price,
      oldPrice: product.oldPrice || null,
      stockStatus: product.stockStatus,
      badges: product.badges,
      rating: product.rating,
      reviewCount: product.reviewCount,
      image: product.images[0] || "",
      images: product.images,
      attributes: product.attributes,
      priceTiers: product.priceTiers,
      documents: product.documents,
      faq: product.faq,
      quickViewEnabled: product.quickViewEnabled,
    })),
  };
}

export async function buildCatalogDataExports() {
  const items = buildCatalogItems();
  const snapshot = buildCatalogSnapshot(items);

  await mkdir(backendDataDir, { recursive: true });
  await mkdir(adminDir, { recursive: true });

  await writeFile(path.join(backendDataDir, "catalog-items.generated.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await writeFile(path.join(backendDataDir, "catalog-snapshot.generated.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(adminDir, "catalog-defaults.generated.js"),
    `export const DEFAULT_CATALOG_ITEMS = ${JSON.stringify(items, null, 2)};\n`,
    "utf8"
  );

  return { items, snapshot };
}

await buildCatalogDataExports();
