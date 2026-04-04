import {
  BADGE_META,
  CATALOG_META,
  DISPLAY_OPTIONS,
  REVIEW_SORT_OPTIONS,
  SORT_OPTIONS,
  STOCK_META,
  buildCategoryMeta,
  buildLandingMeta,
  buildProductMeta,
  countSelectedFilters,
  filterProducts,
  formatPrice,
  getCategoryBySlug,
  getChildCategories,
  getCategoryPageData,
  getLandingPageData,
  getProductCatalogPath,
  getProductById,
  getProductPageData,
  getSearchResults,
  getTopCategories,
  resolveAssetPath,
  sortReviews,
  summarizeReviewStats,
} from "./catalog-data.mjs";

const emptyDialogs = {
  search: false,
  cart: false,
  assistant: false,
  menu: false,
  filters: false,
  account: false,
  quickViewProductId: null,
  priceTiersProductId: null,
};

const emptySearch = {
  query: "",
  mode: "catalog",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const productRichTextHeadingMap = new Map([
  ["Что это закрывает", "Что это даёт"],
  ["Что закрывает", "Что это даёт"],
  ["Что проверить", "Что важно учесть"],
  ["Что нужно учесть", "Что важно учесть"],
  ["Что важно проверить", "Что важно учесть"],
  ["Что ещё связано", "Что важно по связке"],
  ["Когда брать сразу", "Когда можно брать сразу"],
  ["Когда можно брать сразу", "Когда можно брать сразу"],
  ["Когда нужен разговор", "Когда лучше уточнить"],
  ["Когда лучше сначала сверить fit", "Когда лучше уточнить"],
  ["Когда не покупать отдельно", "Когда лучше уточнить"],
  ["Когда не брать вслепую", "Когда лучше уточнить"],
  ["Не лучший вариант, если", "Когда лучше уточнить"],
  ["Как смотреть эту позицию", "Как на это смотреть"],
  ["Как смотреть это решение", "Как на неё смотреть"],
  ["Как смотреть это решение", "Как на него смотреть"],
  ["Следующий шаг", "Что делать дальше"],
  ["Как выглядит путь дальше", "Что делать дальше"],
  ["Логика этой карточки", "Что важно по выбору"],
  ["Под какие условия подходит", "Что важно по условиям"],
  ["Цена и логика стоимости", "Как читать цену"],
  ["Контекст и примечания", "Что ещё важно"],
  ["Подходит, если", "Когда это подходит"],
  ["Что решает", "Что это даёт"],
  ["Что входит", "Что входит"],
  ["Что не входит", "Что не входит"],
  ["Что ещё обычно докупают", "Что обычно смотрят рядом"],
]);

const productRichTextPhraseReplacements = [
  [/\bcontrolled environment\b/gi, "закрытой среде"],
  [/\bfit\b/gi, "совместимость"],
  [/вслепую/gi, "без сверки"],
  [/витринное описание/gi, "общие слова"],
  [/рабочий контекст/gi, "практический контекст"],
  [/поливочный узел/gi, "схема полива"],
  [/фильтрационный узел/gi, "фильтр"],
  [/микроузел подачи/gi, "точечная подача"],
  [/узел подачи/gi, "схема подачи"],
  [/готовые узлы/gi, "готовые комплекты"],
  [/готовый узел/gi, "готовый комплект"],
  [/типовые узлы/gi, "типовые сборки"],
  [/типовой узел/gi, "типовая сборка"],
  [/разборный узел/gi, "разборная сборка"],
  [/сервисные узлы/gi, "сервисные элементы"],
  [/циркуляционные узлы/gi, "циркуляционные решения"],
  [/совместимости узлов/gi, "совместимости по системе"],
  [/состав узла/gi, "состав системы"],
  [/замена узла/gi, "замена части системы"],
  [/весь узел/gi, "всю систему"],
  [/всего узла/gi, "всей системы"],
  [/узел приходит в сборе/gi, "комплект приходит в сборе"],
  [/узел собирается с нуля/gi, "система собирается с нуля"],
  [/понятный узел/gi, "понятную схему"],
  [/по узлам/gi, "по системе"],
  [/узлов и датчиков/gi, "датчиков и связей системы"],
  [/соседних узлов/gi, "соседних элементов"],
  [/остальными узлами/gi, "остальными элементами системы"],
  [/сверяйте узел/gi, "сверяйте схему"],
  [/считать весь узел/gi, "считать всю систему"],
  [/подходит ли узел/gi, "подходит ли решение"],
];

function replaceNodeLexicon(value = "") {
  let normalized = String(value || "");
  normalized = normalized.replace(/дозирующий узел/gi, "__SOLUTION_NODE__");
  normalized = normalized.replace(/узел дозирования/gi, "__SOLUTION_NODE__");
  productRichTextPhraseReplacements.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  return normalized.replace(/__SOLUTION_NODE__/g, "растворный узел");
}

function normalizeProductRichText(value = "") {
  let normalized = String(value || "").trim();
  if (!normalized) {
    return "<p>Пока без развёрнутого описания. Если нужен быстрый ориентир по совместимости и покупке, лучше задать короткий вопрос.</p>";
  }

  normalized = normalized.replace(/<(h3|h4)>(.*?)<\/\1>/gi, (_, __, heading) => {
    const plain = stripHtml(heading);
    const mapped = productRichTextHeadingMap.get(plain) || plain;
    return `<p><strong>${escapeHtml(mapped)}</strong></p>`;
  });

  normalized = replaceNodeLexicon(normalized);

  return normalized;
}

function normalizeProductCopyText(value = "") {
  return replaceNodeLexicon(value);
}

function slugToId(value) {
  return value.replace(/[^a-z0-9_-]/gi, "-");
}

function withStaticIndexDocument(href) {
  const [hashless, hash = ""] = href.split("#");
  const [pathname, query = ""] = hashless.split("?");
  if (/\.[a-z0-9]+$/i.test(pathname)) return href;
  const normalizedPath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  return `${normalizedPath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

function resolveHref(ctx, href) {
  if (!href) return "#";
  if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  if (href.startsWith("#")) return href;
  const normalizedHref = withStaticIndexDocument(href);
  if (normalizedHref.startsWith("/")) return `${ctx.siteRoot}${normalizedHref.replace(/^\//, "")}`;
  return `${ctx.siteRoot}${normalizedHref}`;
}

function resolveAsset(ctx, path) {
  return resolveAssetPath(ctx.siteRoot, path);
}

function withDefaults(state = {}) {
  return {
    cart: state.cart || {},
    dialogs: { ...emptyDialogs, ...(state.dialogs || {}) },
    search: { ...emptySearch, ...(state.search || {}) },
    category: state.category || null,
    product: state.product || null,
    menuCategorySlug: state.menuCategorySlug || null,
    flashMessage: state.flashMessage || "",
  };
}

function getCartEntries(state) {
  return Object.entries(state.cart || {})
    .map(([productId, qty]) => ({ product: getProductById(productId), qty }))
    .filter((entry) => entry.product && entry.qty > 0);
}

function getCartSummary(state) {
  const entries = getCartEntries(state);
  return {
    entries,
    itemCount: entries.reduce((sum, entry) => sum + entry.qty, 0),
    total: entries.reduce((sum, entry) => sum + entry.product.price * entry.qty, 0),
  };
}

function isInCart(state, productId) {
  return Boolean(state.cart?.[productId]);
}

function renderBadgeList(badges) {
  if (!badges.length) return "";
  return `
    <div class="catalog-badge-list">
      ${badges
        .map((badge) => {
          const meta = BADGE_META[badge];
          return `<span class="catalog-badge catalog-badge--${meta?.tone || "gray"}">${escapeHtml(meta?.label || badge)}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderStockBadge(stockStatus) {
  const meta = STOCK_META[stockStatus] || STOCK_META.out_of_stock;
  return `<span class="catalog-stock catalog-stock--${meta.tone}">${escapeHtml(meta.label)}</span>`;
}

function renderBreadcrumbs(ctx, items) {
  return `
    <nav class="catalog-breadcrumbs" aria-label="Хлебные крошки">
      ${items
        .map((item, index) => {
          const last = index === items.length - 1;
          return `
            <span class="catalog-breadcrumb-item">
              <a href="${resolveHref(ctx, item.href)}" ${last ? 'aria-current="page"' : ""}>${escapeHtml(item.label)}</a>
            </span>
          `;
        })
        .join("")}
    </nav>
  `;
}

function renderCategoryCard(ctx, category, compact = false) {
  return `
    <a class="catalog-category-card${compact ? " catalog-category-card--compact" : ""}" href="${resolveHref(
      ctx,
      `/catalog/${category.slug}/`
    )}">
      <div class="catalog-category-card__media">
        <img src="${resolveAsset(ctx, category.image)}" alt="${escapeHtml(category.name)}" loading="lazy" />
      </div>
      <div class="catalog-category-card__body">
        <h3>${escapeHtml(category.name)}</h3>
        <p>${escapeHtml(category.description)}</p>
        <span>${category.productCount} товаров</span>
      </div>
    </a>
  `;
}

function renderProductCard(ctx, state, categorySlug, product, options = {}) {
  const inCart = isInCart(state, product.id);
  const stock = STOCK_META[product.stockStatus] || STOCK_META.out_of_stock;
  const productHref = getProductCatalogPath(product);
  return `
    <article class="catalog-product-card">
      <a class="catalog-product-card__media" href="${resolveHref(ctx, productHref)}">
        ${renderBadgeList(product.badges)}
        <img src="${resolveAsset(ctx, product.images[0])}" alt="${escapeHtml(product.name)}" loading="lazy" />
      </a>
      <div class="catalog-product-card__body">
        <div class="catalog-product-card__meta">
          ${renderStockBadge(product.stockStatus)}
          <span>Арт. ${escapeHtml(product.article)}</span>
        </div>
        <a class="catalog-product-card__title" href="${resolveHref(ctx, productHref)}">${escapeHtml(
          product.name
        )}</a>
        <p class="catalog-product-card__summary">${escapeHtml(normalizeProductCopyText(product.shortDescription))}</p>
        <div class="catalog-product-card__price-row">
          <div>
            <strong>${formatPrice(product.price)}</strong>
            ${product.oldPrice ? `<span class="catalog-old-price">${formatPrice(product.oldPrice)}</span>` : ""}
          </div>
          <button type="button" class="catalog-link-button" data-action="open-price-tiers" data-product-id="${product.id}">Цена по объёму</button>
        </div>
        <div class="catalog-product-card__actions">
          ${
            stock.purchasable
              ? `<button type="button" class="catalog-primary-button${inCart ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${
                  product.id
                }">${inCart ? "Уже в корзине" : "В корзину"}</button>`
              : `<button type="button" class="catalog-primary-button" disabled>Нет в наличии</button>`
          }
          <a class="catalog-secondary-button" href="${resolveHref(ctx, productHref)}">Карточка</a>
          ${
            options.showQuickView
              ? `<button type="button" class="catalog-link-button" data-action="open-quick-view" data-product-id="${product.id}">Быстрый просмотр</button>`
              : ""
          }
        </div>
      </div>
    </article>
  `;
}

function renderAppliedFilterChips(ctx, applied) {
  const chips = [];
  if (applied.priceMin !== null || applied.priceMax !== null) {
    chips.push(`Цена: ${applied.priceMin ?? "0"}-${applied.priceMax ?? "∞"}`);
  }
  applied.stockStatuses.forEach((value) => chips.push(STOCK_META[value]?.label || value));
  applied.badges.forEach((value) => chips.push(BADGE_META[value]?.label || value));
  Object.values(applied.attributes).forEach((values) => values.forEach((value) => chips.push(value)));
  if (!chips.length) return "";
  return `
    <div class="catalog-filter-chip-row" aria-label="Выбранные фильтры">
      ${chips.map((chip) => `<span class="catalog-filter-chip">${escapeHtml(chip)}</span>`).join("")}
      <button type="button" class="catalog-link-button" data-action="reset-filters">Сбросить фильтры</button>
    </div>
  `;
}

function renderFilterGroup(group, draft) {
  return `
    <fieldset class="catalog-filter-group">
      <legend>${escapeHtml(group.label)}</legend>
      <div class="catalog-filter-options">
        ${group.values
          .map(
            (option) => `
              <label class="catalog-check">
                <input
                  type="checkbox"
                  data-filter-kind="attribute"
                  data-filter-key="${escapeHtml(group.key)}"
                  value="${escapeHtml(option.value)}"
                  ${draft.attributes[group.key]?.includes(option.value) ? "checked" : ""}
                />
                <span>${escapeHtml(option.value)}</span>
                <small>${option.count}</small>
              </label>
            `
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function renderFilterPanel(data, draft, isMobile = false) {
  const draftCount = countSelectedFilters(draft);
  const matches = filterProducts(data.products, draft).length;
  return `
    <form class="catalog-filter-panel${isMobile ? " catalog-filter-panel--mobile" : ""}" data-filter-form="${isMobile ? "mobile" : "desktop"}">
      <div class="catalog-filter-panel__head">
        <div>
          <h2>Фильтры</h2>
          <p>Выбрано фильтров: ${draftCount}</p>
        </div>
        ${
          isMobile
            ? `<button type="button" class="catalog-icon-button" data-action="close-filters" aria-label="Закрыть фильтры">×</button>`
            : ""
        }
      </div>
      <fieldset class="catalog-filter-group">
        <legend>Цена</legend>
        <div class="catalog-price-inputs">
          <label>
            <span>От</span>
            <input type="number" inputmode="numeric" data-filter-kind="price-min" value="${draft.priceMin ?? ""}" />
          </label>
          <label>
            <span>До</span>
            <input type="number" inputmode="numeric" data-filter-kind="price-max" value="${draft.priceMax ?? ""}" />
          </label>
        </div>
        <div class="catalog-filter-note">Диапазон категории: ${formatPrice(data.facets.price.min)} - ${formatPrice(data.facets.price.max)}</div>
      </fieldset>
      <fieldset class="catalog-filter-group">
        <legend>Наличие</legend>
        <div class="catalog-filter-options">
          ${data.facets.stock
            .map(
              (option) => `
                <label class="catalog-check">
                  <input type="checkbox" data-filter-kind="stock" value="${option.value}" ${
                    draft.stockStatuses.includes(option.value) ? "checked" : ""
                  } />
                  <span>${escapeHtml(option.label)}</span>
                  <small>${option.count}</small>
                </label>
              `
            )
            .join("")}
        </div>
      </fieldset>
      <fieldset class="catalog-filter-group">
        <legend>Метки</legend>
        <div class="catalog-filter-options">
          ${data.facets.badges
            .map(
              (option) => `
                <label class="catalog-check">
                  <input type="checkbox" data-filter-kind="badge" value="${option.value}" ${
                    draft.badges.includes(option.value) ? "checked" : ""
                  } />
                  <span>${escapeHtml(option.label)}</span>
                  <small>${option.count}</small>
                </label>
              `
            )
            .join("")}
        </div>
      </fieldset>
      ${data.facets.attributes.map((group) => renderFilterGroup(group, draft)).join("")}
      <div class="catalog-filter-panel__actions">
        <button type="button" class="catalog-primary-button" data-action="apply-filters">
          Показать ${matches}
        </button>
        <button type="button" class="catalog-secondary-button" data-action="reset-filters">Сбросить фильтры</button>
      </div>
    </form>
  `;
}

function renderDisplayToggle(display) {
  return `
    <div class="catalog-display-toggle" role="group" aria-label="Режим отображения">
      ${DISPLAY_OPTIONS.map(
        (option) => `
          <button
            type="button"
            class="catalog-chip-button${option.value === display ? " is-active" : ""}"
            data-action="set-display"
            data-value="${option.value}"
          >
            ${escapeHtml(option.label)}
          </button>
        `
      ).join("")}
    </div>
  `;
}

function renderPagination(ctx, applied, pagination) {
  if (pagination.totalPages <= 1) return "";
  const buildHref = (page) => {
    const params = new URLSearchParams();
    const effective = { ...applied, page };
    if (effective.sort !== "popularity-desc") params.set("sort", effective.sort);
    if (effective.display !== "grid") params.set("display", effective.display);
    if (page !== 1) params.set("page", String(page));
    if (effective.priceMin !== null || effective.priceMax !== null) {
      params.set("price", `${effective.priceMin ?? ""}-${effective.priceMax ?? ""}`);
    }
    if (effective.stockStatuses.length) params.set("stock", effective.stockStatuses.join(","));
    if (effective.badges.length) params.set("badges", effective.badges.join(","));
    Object.entries(effective.attributes).forEach(([key, values]) => {
      if (values.length) params.set(`f_${key}`, values.join(","));
    });
    const query = params.toString();
    return `${query ? `?${query}` : ""}`;
  };

  const pages = Array.from({ length: pagination.totalPages }, (_, index) => index + 1);
  return `
    <nav class="catalog-pagination" aria-label="Пагинация каталога">
      <a class="catalog-page-link${pagination.currentPage === 1 ? " is-disabled" : ""}" href="${buildHref(
        Math.max(1, pagination.currentPage - 1)
      )}" data-page-target="${Math.max(1, pagination.currentPage - 1)}">Назад</a>
      ${pages
        .map(
          (page) => `
            <a class="catalog-page-link${page === pagination.currentPage ? " is-active" : ""}" href="${buildHref(
              page
            )}" data-page-target="${page}">${page}</a>
          `
        )
        .join("")}
      <a class="catalog-page-link${pagination.currentPage === pagination.totalPages ? " is-disabled" : ""}" href="${buildHref(
        Math.min(pagination.totalPages, pagination.currentPage + 1)
      )}" data-page-target="${Math.min(pagination.totalPages, pagination.currentPage + 1)}">Вперёд</a>
    </nav>
  `;
}

function renderTableView(ctx, state, categorySlug, products, selectedProductIds = []) {
  return `
    <div class="catalog-table-shell">
      <div class="catalog-table-bulk">
        <label class="catalog-check">
          <input type="checkbox" data-action="select-all-visible" ${products.length && selectedProductIds.length === products.length ? "checked" : ""} />
          <span>Выбрать все</span>
        </label>
        <button type="button" class="catalog-primary-button" data-action="bulk-add-to-cart" ${selectedProductIds.length ? "" : "disabled"}>
          Добавить в корзину (${selectedProductIds.length})
        </button>
      </div>
      <div class="catalog-table">
        ${products
          .map(
            (product) => {
              const productHref = getProductCatalogPath(product);
              return `
              <div class="catalog-table-row">
                <div class="catalog-table-cell catalog-table-cell--check">
                  <label class="catalog-check">
                    <input type="checkbox" data-action="toggle-selection" data-product-id="${product.id}" ${
                      selectedProductIds.includes(product.id) ? "checked" : ""
                    } />
                    <span class="sr-only">Выбрать ${escapeHtml(product.name)}</span>
                  </label>
                </div>
                <div class="catalog-table-cell catalog-table-cell--product">
                  <a class="catalog-table-product" href="${resolveHref(ctx, productHref)}">
                    <img src="${resolveAsset(ctx, product.images[0])}" alt="${escapeHtml(product.name)}" loading="lazy" />
                    <div>
                      ${renderBadgeList(product.badges)}
                      <strong>${escapeHtml(product.name)}</strong>
                      <span>${escapeHtml(normalizeProductCopyText(product.shortDescription))}</span>
                    </div>
                  </a>
                </div>
                <div class="catalog-table-cell">${renderStockBadge(product.stockStatus)}</div>
                <div class="catalog-table-cell">Артикул: ${escapeHtml(product.article)}</div>
                <div class="catalog-table-cell">
                  <strong>${formatPrice(product.price)}</strong>
                  <button type="button" class="catalog-link-button" data-action="open-price-tiers" data-product-id="${product.id}">Цена по объёму</button>
                </div>
                <div class="catalog-table-cell catalog-table-cell--actions">
                  <button type="button" class="catalog-link-button" data-action="open-quick-view" data-product-id="${product.id}">Быстрый обзор</button>
                  <button type="button" class="catalog-primary-button${isInCart(state, product.id) ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${product.id}">${
                    isInCart(state, product.id) ? "Уже в корзине" : "Добавить в корзину"
                  }</button>
                </div>
              </div>
            `;
            }
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderCategoryListing(ctx, state, data) {
  const applied = state.category.applied;
  const selectedProductIds = state.category.selectedProductIds || [];
  const selectedFilterCount = countSelectedFilters(applied);
  return `
    <section class="catalog-category-listing">
      <div class="catalog-listing-toolbar">
        <div>
          <p class="catalog-listing-count">${data.filteredProducts.length} товаров в разделе</p>
          ${renderAppliedFilterChips(ctx, applied)}
        </div>
        <div class="catalog-listing-toolbar__controls">
          <label class="catalog-sort-control">
            <span>Сортировка</span>
            <select data-action="set-sort">
              ${SORT_OPTIONS.map(
                (option) => `<option value="${option.value}" ${option.value === applied.sort ? "selected" : ""}>${escapeHtml(option.label)}</option>`
              ).join("")}
            </select>
          </label>
          ${renderDisplayToggle(applied.display)}
          <button type="button" class="catalog-secondary-button catalog-mobile-filter-button" data-action="open-filters">
            Фильтры${selectedFilterCount ? ` (${selectedFilterCount})` : ""}
          </button>
        </div>
      </div>
      ${
        applied.display === "grid"
          ? `<div class="catalog-grid-listing">${data.pageItems
              .map((product) => renderProductCard(ctx, state, data.category.slug, product))
              .join("")}</div>`
          : renderTableView(ctx, state, data.category.slug, data.pageItems, selectedProductIds)
      }
      ${renderPagination(ctx, applied, data.pagination)}
    </section>
  `;
}

function renderCategoryPage(ctx, state, data) {
  return `
    <section class="catalog-page-head catalog-page-head--category">
      ${renderBreadcrumbs(ctx, data.breadcrumbs)}
      <div class="catalog-page-head__copy">
        <span class="catalog-eyebrow">Раздел каталога</span>
        <h1>${escapeHtml(data.category.name)}</h1>
        <p>${escapeHtml(data.category.description)}</p>
        <div class="catalog-page-head__meta">
          <span>${data.products.length} товаров</span>
          <span>Цена и наличие сразу в карточках</span>
        </div>
      </div>
    </section>
    <section class="catalog-category-layout" id="catalog-products">
      <div class="catalog-category-main">
        ${renderCategoryListing(ctx, state, data)}
      </div>
    </section>
  `;
}

function renderRatingStars(value) {
  return `
    <span class="catalog-stars" aria-label="Рейтинг ${value} из 5">
      ${Array.from({ length: 5 }, (_, index) => `<span>${index < Math.round(value) ? "★" : "☆"}</span>`).join("")}
    </span>
  `;
}

function renderReviewMedia(ctx, media) {
  if (!media?.length) return "";
  return `
    <div class="catalog-review-media">
      ${media
        .map((item) => {
          const thumb = resolveAsset(ctx, item.url);
          const label = item.type === "video" ? "Видео" : "Фото";
          return `
            <a href="${thumb}" target="_blank" rel="noreferrer">
              <img src="${thumb}" alt="${escapeHtml(item.title || label)}" loading="lazy" />
              <span>${label}</span>
            </a>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderReviewCard(ctx, review) {
  return `
    <article class="catalog-review-card">
      <div class="catalog-review-card__head">
        <div>
          <strong>${escapeHtml(review.author)}</strong>
          <div class="catalog-review-card__meta">
            <span>${new Date(review.createdAt).toLocaleDateString("ru-RU")}</span>
            ${review.verified ? `<span class="catalog-verified">Проверенная покупка</span>` : ""}
          </div>
        </div>
        ${renderRatingStars(review.rating)}
      </div>
      <div class="catalog-review-card__columns">
        <div><span>Плюсы</span><p>${escapeHtml(review.pros || "Не указаны")}</p></div>
        <div><span>Минусы</span><p>${escapeHtml(review.cons || "Не указаны")}</p></div>
      </div>
      <p>${escapeHtml(review.comment)}</p>
      ${renderReviewMedia(ctx, review.media)}
    </article>
  `;
}

function renderReviewDistribution(stats) {
  return `
    <div class="catalog-review-summary">
      <div class="catalog-review-summary__score">
        <strong>${stats.average || "0.0"}</strong>
        ${renderRatingStars(stats.average || 0)}
        <span>${stats.total} отзывов</span>
      </div>
      <div class="catalog-review-summary__bars">
        ${stats.distribution
          .map(
            (item) => `
              <div class="catalog-review-bar">
                <span>${item.rating} ★</span>
                <div><i style="width:${item.percent}%"></i></div>
                <span>${item.count}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderReviewForm() {
  return `
    <form class="catalog-review-form" data-review-form>
      <h3>Добавить отзыв</h3>
      <div class="catalog-review-form__grid">
        <label>
          <span>Имя</span>
          <input name="author" required />
        </label>
        <label>
          <span>Оценка</span>
          <select name="rating" required>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>
        <label>
          <span>Плюсы</span>
          <input name="pros" />
        </label>
        <label>
          <span>Минусы</span>
          <input name="cons" />
        </label>
      </div>
      <label>
        <span>Комментарий</span>
        <textarea name="comment" rows="4" required></textarea>
      </label>
      <button type="submit" class="catalog-primary-button">Отправить отзыв</button>
    </form>
  `;
}

function renderTabs(activeTab) {
  return `
    <div class="catalog-tabs" role="tablist" aria-label="Секции товара">
      ${[
        ["reviews", "Отзывы"],
        ["description", "Описание"],
        ["additional", "Дополнительно"],
      ]
        .map(
          ([value, label]) => `
            <button type="button" class="catalog-tab-button${activeTab === value ? " is-active" : ""}" data-action="set-tab" data-tab="${value}" role="tab" aria-selected="${
              activeTab === value ? "true" : "false"
            }">
              ${label}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProductTabs(ctx, state, data) {
  const activeTab = state.product.activeTab;
  const reviews = sortReviews(state.product.reviews, state.product.reviewSort);
  const stats = summarizeReviewStats(reviews);
  return `
    <section class="catalog-product-tabs-shell">
      ${renderTabs(activeTab)}
      <div class="catalog-tab-panel${activeTab === "reviews" ? " is-active" : ""}" id="reviews">
        ${renderReviewDistribution(stats)}
        <div class="catalog-review-toolbar">
          <label class="catalog-sort-control">
            <span>Сортировать отзывы</span>
            <select data-action="set-review-sort">
              ${REVIEW_SORT_OPTIONS.map(
                (option) => `<option value="${option.value}" ${option.value === state.product.reviewSort ? "selected" : ""}>${escapeHtml(
                  option.label
                )}</option>`
              ).join("")}
            </select>
          </label>
        </div>
        <div class="catalog-review-list">
          ${reviews.length ? reviews.map((review) => renderReviewCard(ctx, review)).join("") : `<p>Отзывов пока нет.</p>`}
        </div>
        ${renderReviewForm()}
      </div>
      <div class="catalog-tab-panel${activeTab === "description" ? " is-active" : ""}" id="description">
        <div class="catalog-rich-text">${data.product.fullDescription}</div>
      </div>
      <div class="catalog-tab-panel${activeTab === "additional" ? " is-active" : ""}" id="additional">
        <div class="catalog-additional-grid">
          <div class="catalog-additional-card">
            <h3>Документы</h3>
            <ul class="catalog-document-list">
              ${data.product.documents
                .map(
                  (document) => `
                    <li>
                      <a href="${resolveHref(ctx, `/${document.fileUrl}`)}" download>
                        ${escapeHtml(document.title)}
                      </a>
                      <span>${escapeHtml(document.fileSize)}</span>
                    </li>
                  `
                )
                .join("")}
            </ul>
          </div>
          <div class="catalog-additional-card">
            <h3>Дополнительные изображения</h3>
            <div class="catalog-additional-images">
              ${data.product.images
                .slice(1)
                .map(
                  (image) => `
                    <img src="${resolveAsset(ctx, image)}" alt="${escapeHtml(data.product.name)}" loading="lazy" />
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProductSpecs(product) {
  const visible = product.attributes.slice(0, 5);
  return `
    <ul class="catalog-product-spec-list">
      ${visible.map((attribute) => `<li><span>${escapeHtml(attribute.label)}</span><strong>${escapeHtml(attribute.value)}</strong></li>`).join("")}
    </ul>
  `;
}

function getProductAttribute(product, keys = []) {
  return product.attributes.find((attribute) => keys.includes(attribute.key)) || null;
}

function getProductSignals(product, category) {
  const picked = [];
  const seen = new Set();
  const add = (label, value) => {
    const normalized = `${label}:${value}`;
    if (!label || !value || seen.has(normalized)) return;
    seen.add(normalized);
    picked.push({ label, value });
  };

  add("Раздел", category.name);

  const preferredKeys = ["scenario", "zone", "use", "coverage", "phase", "length", "power", "flow", "format", "class", "diameter"];
  preferredKeys.forEach((key) => {
    const attribute = getProductAttribute(product, [key]);
    if (attribute) add(attribute.label, attribute.value);
  });

  product.attributes.forEach((attribute) => {
    if (picked.length >= 4) return;
    add(attribute.label, attribute.value);
  });

  return picked.slice(0, 4);
}

function inferPositionMeta(product) {
  const haystack = `${product.shortDescription} ${product.fullDescription} ${product.faq.map((item) => `${item.question} ${item.answer}`).join(" ")}`.toLowerCase();
  const projectLike =
    product.stockStatus === "preorder" ||
    product.price >= 20000 ||
    /проект|проектн|схем|зона досветки|контроллер|дозатор|нескольк|только после|лучше нет|подбор/.test(haystack);
  const readyLike = /типов|готовый|добор|замен|поштуч|розниц|сервис|стартов|быстрый/.test(haystack);

  if (projectLike) {
    return {
      label: "Сначала уточнить",
      summary: "Перед заказом вы можете получить консультацию.",
      tone: "project",
    };
  }

  if (readyLike) {
    return {
      label: "Типовая закупка",
      summary: "Если хотите, перед заказом можно быстро уточнить совместимость под вашу ферму.",
      tone: "ready",
    };
  }

  return {
    label: "Лучше быстро сверить",
    summary: "Перед заказом можно быстро уточнить, подходит ли товар под вашу ферму.",
    tone: "verify",
  };
}

function buildDecisionLayer(product, category, positionMeta) {
  const stock = STOCK_META[product.stockStatus] || STOCK_META.out_of_stock;
  const scenario = getProductAttribute(product, ["scenario", "zone", "use", "coverage", "phase"]);
  const mount = getProductAttribute(product, ["mount", "connection", "assembly", "service", "control"]);
  const core = getProductAttribute(product, ["power", "length", "flow", "format", "class", "diameter", "plants", "volume", "type"]);

  const buyNow = [];
  const check = [];
  const caution = [];
  const together = [];

  if (positionMeta.tone === "ready") {
    buyNow.push("Такой товар обычно берут на добор, замену или плановую закупку для уже понятной фермы.");
    buyNow.push("Если геометрия, подключение и соседние элементы не меняются, можно брать без долгого согласования.");
  } else if (positionMeta.tone === "project") {
    buyNow.push("Покупка имеет смысл, когда уже понятны состав и соседние решения по ферме.");
    buyNow.push("Для разовой закупки на пробу такой товар обычно слишком чувствителен к контексту.");
  } else {
    buyNow.push("Товар можно брать спокойно, если вы не пересобираете схему фермы.");
    buyNow.push("Если это понятное дооснащение или замена, обычно хватает короткой сверки.");
  }

  if (core) buyNow.push(`${core.label}: ${core.value}.`);
  if (scenario) check.push(`Где будет работать: ${scenario.value}.`);
  else check.push(`Проверьте, подходит ли товар под вашу ферму и режим работы в разделе ${category.name.toLowerCase()}.`);
  if (mount) check.push(`Что важно по подключению: ${mount.value}.`);
  check.push(
    stock.purchasable
      ? "По наличию и объёму лучше сразу сверить фактическую партию."
      : "Срок поставки и формат отгрузки лучше уточнить заранее."
  );

  if (positionMeta.tone === "project") {
    caution.push("Консультация особенно полезна, если вместе с этим товаром меняются свет, полив, каркас или автоматика.");
    caution.push("Если решение тянет за собой пересборку соседних элементов системы, одной карточки товара уже недостаточно.");
  } else {
    caution.push("Уточнение полезно, если неясны совместимость, крепление или место товара в схеме фермы.");
    caution.push("Если покупка тянет за собой изменения в соседних элементах, лучше сначала быстро свериться.");
  }

  together.push(category.name);
  product.attributes
    .filter((attribute) => attribute.group === "Сценарий" || attribute.group === "Монтаж")
    .slice(0, 2)
    .forEach((attribute) => together.push(attribute.value));

  return {
    buyNow,
    check,
    caution,
    together: together.slice(0, 3),
  };
}

function renderDecisionList(items) {
  return `<ul class="catalog-decision-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderProductSpecGroups(product) {
  const grouped = new Map();
  product.attributes.forEach((attribute) => {
    const key = attribute.group || "Основные";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(attribute);
  });

  return Array.from(grouped.entries())
    .map(
      ([group, attributes]) => `
        <article class="catalog-spec-card">
          <strong>${escapeHtml(group)}</strong>
          <ul class="catalog-product-spec-list catalog-product-spec-list--full">
            ${attributes.map((attribute) => `<li><span>${escapeHtml(attribute.label)}</span><strong>${escapeHtml(attribute.value)}</strong></li>`).join("")}
          </ul>
        </article>
      `
    )
    .join("");
}

function renderProductDocuments(ctx, product) {
  if (!product.documents.length) {
    return `<p>Отдельных файлов пока нет. Если нужен паспорт, схема или уточнение по поставке, лучше написать нам.</p>`;
  }
  return `
    <ul class="catalog-document-list">
      ${product.documents
        .map(
          (document) => `
            <li>
              <a href="${resolveHref(ctx, `/${document.fileUrl}`)}" download>
                ${escapeHtml(document.title)}
              </a>
              <span>${escapeHtml(document.fileSize)}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderProductFaq(product) {
  if (!product.faq.length) {
    return `
      <article class="catalog-risk-item">
        <strong>Пока без собранного FAQ</strong>
        <p>Если остаётся сомнение по покупке, лучше задать короткий вопрос до заказа.</p>
      </article>
    `;
  }
  return product.faq
    .map(
      (item) => `
        <article class="catalog-risk-item">
          <strong>${escapeHtml(item.question)}</strong>
          <p>${escapeHtml(item.answer)}</p>
        </article>
      `
    )
    .join("");
}

function renderProductPage(ctx, state, data) {
  const activeImageIndex = state.product.activeImageIndex || 0;
  const activeImage = data.product.images[activeImageIndex] || data.product.images[0];
  const stock = STOCK_META[data.product.stockStatus] || STOCK_META.out_of_stock;
  const positionMeta = inferPositionMeta(data.product);
  const decision = buildDecisionLayer(data.product, data.category, positionMeta);
  const signals = getProductSignals(data.product, data.category);
  const scenarioAttribute = getProductAttribute(data.product, ["scenario", "zone", "use", "coverage", "phase"]);
  const mountAttribute = getProductAttribute(data.product, ["mount", "connection", "assembly", "service", "control"]);
  const formatAttribute = getProductAttribute(data.product, ["format", "type", "class", "diameter", "length", "power", "plants", "volume"]);
  const reviews = sortReviews(state.product.reviews || data.reviews || [], state.product.reviewSort || "newest");
  const reviewStats = summarizeReviewStats(reviews);
  return `
    <section class="catalog-page-head catalog-page-head--product">
      ${renderBreadcrumbs(ctx, data.breadcrumbs)}
      <div class="catalog-product-storehead">
        <div class="catalog-product-gallery catalog-product-brief__media">
          <div class="catalog-product-gallery__main">
            ${renderBadgeList(data.product.badges)}
            <img src="${resolveAsset(ctx, activeImage)}" alt="${escapeHtml(data.product.name)}" />
          </div>
          <div class="catalog-product-gallery__thumbs" role="tablist" aria-label="Галерея">
            ${data.product.images
              .map(
                (image, index) => `
                  <button type="button" class="catalog-thumb-button${index === activeImageIndex ? " is-active" : ""}" data-action="set-image" data-index="${index}">
                    <img src="${resolveAsset(ctx, image)}" alt="${escapeHtml(data.product.name)}" loading="lazy" />
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="catalog-product-storehead__main">
            <div class="catalog-product-storehead__head">
              <div class="catalog-product-brief__kickers">
              <span class="catalog-eyebrow">Товар из каталога</span>
              <span class="catalog-product-brief__position catalog-product-brief__position--${positionMeta.tone}">${escapeHtml(positionMeta.label)}</span>
              ${renderStockBadge(data.product.stockStatus)}
            </div>
            <h1>${escapeHtml(data.product.name)}</h1>
            <div class="catalog-product-storehead__meta">
              <span>Арт. ${escapeHtml(data.product.article)}</span>
              <span>${escapeHtml(data.category.name)}</span>
              <span>${data.product.documents.length} документа</span>
            </div>
            <p class="catalog-product-storehead__thesis">${escapeHtml(normalizeProductCopyText(data.product.shortDescription))}</p>
          </div>
          <div class="catalog-product-storehead__facts">
            ${signals.map((signal) => `<span><strong>${escapeHtml(signal.label)}</strong>${escapeHtml(signal.value)}</span>`).join("")}
          </div>
          <div class="catalog-product-storehead__buybox">
              <div class="catalog-product-storehead__price-row">
                <div class="catalog-product-brief__price">
                <strong>${formatPrice(data.product.price)}</strong>
                ${data.product.oldPrice ? `<span class="catalog-old-price">${formatPrice(data.product.oldPrice)}</span>` : ""}
              </div>
                <button type="button" class="catalog-link-button" data-action="open-price-tiers" data-product-id="${data.product.id}">Цена по объёму</button>
              </div>
              <p>${escapeHtml(positionMeta.summary)}</p>
              <div class="catalog-product-storehead__actions">
                ${
                  stock.purchasable
                    ? `<button type="button" class="catalog-primary-button${isInCart(state, data.product.id) ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${
                        data.product.id
                      }">${isInCart(state, data.product.id) ? "Уже в корзине" : "Добавить в корзину"}</button>`
                    : `<button type="button" class="catalog-primary-button" disabled>Нет в наличии</button>`
                }
                <button type="button" class="catalog-secondary-button" data-action="open-assistant" data-intent="question">Уточнить перед заказом</button>
              </div>
              <div class="catalog-product-storehead__buy-meta">
                <span>${data.product.faq.length} ответов по выбору</span>
                <span>${stock.label}</span>
              </div>
              <div class="catalog-product-storehead__route-note">
                <strong>Если позиция влияет на схему</strong>
                <p>${positionMeta.tone === "project"
                  ? "Лучше быстро уточнить fit до заказа, чтобы не собирать модуль отдельно от всей системы."
                  : "Если меняете не один товар, а связку элементов, лучше заранее сверить совместимость."}</p>
                <div class="catalog-product-brief__buy-meta">
                <a class="catalog-link-button" href="${resolveHref(ctx, `/catalog/${data.category.slug}/`)}">Открыть раздел</a>
                <a class="catalog-link-button" href="${resolveHref(ctx, "/farm/")}">Сверить в расчёте</a>
                </div>
              </div>
          </div>
        </div>
      </div>
      <section class="catalog-product-decision" id="product-decision">
        <div class="catalog-section-head">
          <h2>Перед покупкой</h2>
          <p>Когда можно брать, что сверить и где лучше остановиться на уточнении.</p>
        </div>
        <div class="catalog-product-decision__shell">
          <article class="catalog-decision-card catalog-decision-card--main">
            <div class="catalog-decision-block">
              <h3 class="catalog-decision-card__title">Когда можно брать спокойно</h3>
              ${renderDecisionList(decision.buyNow)}
            </div>
            <div class="catalog-decision-block catalog-decision-block--divider">
              <h3 class="catalog-decision-card__title">Что лучше сверить до заказа</h3>
              ${renderDecisionList(decision.check)}
            </div>
          </article>
          <aside class="catalog-decision-card catalog-decision-card--caution">
            <h3 class="catalog-decision-card__title">Когда лучше остановиться на уточнении</h3>
            ${renderDecisionList(decision.caution)}
            <div class="catalog-decision-card__compatibility">
              <strong>Обычно смотрят рядом</strong>
              <div class="catalog-product-brief__signals">
                ${decision.together.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section class="catalog-product-application" id="product-application">
        <div class="catalog-section-head">
          <h2>Применение и контекст</h2>
          <p>Только рабочий контекст: где используют, что проверяют и что обычно смотрят рядом.</p>
        </div>
        <div class="catalog-product-application__shell">
          <article class="catalog-support-card catalog-support-card--story">
            <h3 class="catalog-support-card__title">Коротко по делу</h3>
            <div class="catalog-rich-text">${normalizeProductRichText(data.product.fullDescription)}</div>
          </article>
          <div class="catalog-product-application__side">
            <article class="catalog-support-card">
              <h3 class="catalog-support-card__title">Что сверить</h3>
              <ul class="catalog-decision-list">
                <li>${scenarioAttribute ? `${escapeHtml(scenarioAttribute.label)}: ${escapeHtml(scenarioAttribute.value)}.` : `Обычно такой товар берут внутри раздела ${escapeHtml(data.category.name.toLowerCase())}.`}</li>
                <li>${formatAttribute ? `${escapeHtml(formatAttribute.label)}: ${escapeHtml(formatAttribute.value)}.` : `Важно понимать формат товара и его место в общей схеме.`}</li>
                <li>${mountAttribute ? `${escapeHtml(mountAttribute.label)}: ${escapeHtml(mountAttribute.value)}.` : `Если есть монтаж или подключение, их лучше сверить до заказа.`}</li>
              </ul>
            </article>
            <article class="catalog-support-card">
              <h3 class="catalog-support-card__title">Что открыть рядом</h3>
              <div class="catalog-product-next-links">
                <a class="catalog-product-next-link" href="${resolveHref(ctx, `/catalog/${data.category.slug}/`)}">
                  <strong>${escapeHtml(data.category.name)}</strong>
                  <span>Весь раздел с этим товаром и соседними решениями</span>
                </a>
                ${data.relatedProducts.slice(0, 2).map((product) => `
                  <a class="catalog-product-next-link" href="${resolveHref(ctx, getProductCatalogPath(product))}">
                    <strong>${escapeHtml(product.name)}</strong>
                    <span>${escapeHtml(normalizeProductCopyText(product.shortDescription))}</span>
                  </a>
                `).join("")}
              </div>
            </article>
          </div>
        </div>
      </section>
      <section class="catalog-product-support-grid" id="product-support">
        <div class="catalog-product-support-grid__main">
          <article class="catalog-support-card" id="product-specs">
            <div class="catalog-section-head">
              <h2>Характеристики и документы</h2>
              <p>Техданные, партии и файлы без лишней методички.</p>
            </div>
            <div class="catalog-support-card__stack">
              <div class="catalog-spec-grid">
                ${renderProductSpecGroups(data.product)}
              </div>
              <div class="catalog-support-card__split">
                <article class="catalog-spec-card">
                  <strong>Партии и цена</strong>
                  <ul class="catalog-document-list">
                    ${data.product.priceTiers
                      .map(
                        (tier) => `
                          <li>
                            <div>
                              <strong>${escapeHtml(tier.label)}</strong>
                              <span>${escapeHtml(tier.summary)}</span>
                            </div>
                            <span>от ${tier.minQty} · ${formatPrice(tier.price)}</span>
                          </li>
                        `
                      )
                      .join("")}
                  </ul>
                </article>
                <article class="catalog-spec-card">
                  <strong>Документы и файлы</strong>
                  ${renderProductDocuments(ctx, data.product)}
                </article>
              </div>
            </div>
          </article>
          <article class="catalog-support-card" id="product-faq">
            <div class="catalog-section-head">
              <h2>Вопросы перед заказом</h2>
              <p>То, что чаще всего мешает спокойно принять решение.</p>
            </div>
            <div class="catalog-risk-grid">
              <div class="catalog-risk-list">
                ${renderProductFaq(data.product)}
              </div>
              <aside class="catalog-risk-aside">
                <div class="catalog-risk-callout">
                  <strong>Когда лучше уточнить до заказа</strong>
                  <p>${positionMeta.tone === "project"
                    ? "Когда покупка влияет не на один товар, а на связку света, полива, стеллажа или автоматики."
                    : "Когда меняете не один товар отдельно, а сразу связку соседних элементов."}</p>
                </div>
                ${
                  reviews.length
                    ? `
                      <div class="catalog-risk-proof">
                        <strong>Отзывы по товару</strong>
                        ${renderReviewDistribution(reviewStats)}
                        <div class="catalog-review-list">
                          ${reviews.slice(0, 2).map((review) => renderReviewCard(ctx, review)).join("")}
                        </div>
                      </div>
                    `
                    : `
                      <div class="catalog-risk-proof">
                        <strong>Пока без отзывов</strong>
                        <p>Если нужен быстрый ориентир по совместимости, лучше задать короткий вопрос до оформления заказа.</p>
                      </div>
                    `
                }
              </aside>
            </div>
          </article>
        </div>
      </section>
      <section class="catalog-product-next-step" id="product-next-step">
        <div class="catalog-section-head">
          <h2>Следующий шаг</h2>
          <p>Открыть раздел, сравнить соседние позиции или уйти в расчёт, если покупка уже шире одного товара.</p>
        </div>
        <div class="catalog-product-next-step__shell">
          <article class="catalog-support-card catalog-support-card--next">
            <span class="catalog-eyebrow">В этом же разделе</span>
            <a class="catalog-product-next-link catalog-product-next-link--featured" href="${resolveHref(ctx, `/catalog/${data.category.slug}/`)}">
              <strong>${escapeHtml(data.category.name)}</strong>
              <span>${escapeHtml(data.category.description)}</span>
            </a>
          </article>
          <div class="catalog-grid-listing catalog-grid-listing--compact">
            ${data.relatedProducts.map((product) => renderProductCard(ctx, state, data.category.slug, product)).join("")}
          </div>
        </div>
      </section>
      <section class="catalog-product-footer-cta">
        <div>
          <span class="catalog-eyebrow">Дальше по покупке</span>
          <h2>${positionMeta.tone === "project" ? "Если товар влияет на схему, лучше сначала быстро свериться" : "Если товар подходит, можно спокойно идти дальше"}</h2>
          <p>${positionMeta.tone === "project"
            ? "Так проще избежать лишней закупки и сразу понять, нужен один товар или уже подбор по всей схеме."
            : "Добавляйте в корзину, если схема уже понятна. Если остаётся сомнение по совместимости, лучше уточнить его до заказа."}</p>
        </div>
        <div class="catalog-product-footer-cta__actions">
          ${
            stock.purchasable
              ? `<button type="button" class="catalog-primary-button${isInCart(state, data.product.id) ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${
                  data.product.id
                }">${isInCart(state, data.product.id) ? "Уже в корзине" : "Добавить в корзину"}</button>`
              : `<button type="button" class="catalog-primary-button" disabled>Нет в наличии</button>`
          }
          <button type="button" class="catalog-secondary-button" data-action="open-assistant" data-intent="question">Задать короткий вопрос</button>
          <a class="catalog-link-button" href="${resolveHref(ctx, "/farm/")}">Открыть расчёт фермы</a>
        </div>
      </section>
    </section>
  `;
}

function renderLandingPage(ctx) {
  const data = getLandingPageData();
  const topCategoryCount = data.categories.length;
  const totalProductCount = data.categories.reduce((sum, category) => sum + category.productCount, 0);
  return `
    <section class="catalog-page-head catalog-page-head--landing">
      ${renderBreadcrumbs(ctx, data.breadcrumbs)}
      <div class="catalog-page-head__copy">
        <span class="catalog-eyebrow">Рабочий магазин</span>
        <h1>Всё для клубничной фермы</h1>
        <div class="catalog-page-head__meta">
          <span>${topCategoryCount} разделов</span>
          <span>${totalProductCount} товаров</span>
        </div>
      </div>
      <div class="catalog-category-grid" id="catalog-categories">
        ${data.categories.map((category) => renderCategoryCard(ctx, category)).join("")}
      </div>
    </section>
  `;
}

function renderHowBuy(ctx) {
  return `
    <section class="catalog-info-strip" id="catalog-how-buy">
      <div class="catalog-how-buy-note">
        <div class="catalog-how-buy-note__copy">
          <strong>Если схема ещё не собрана</strong>
          <p>Сначала коротко сверьте состав, сделайте быстрый расчёт или задайте вопрос, чтобы не собирать закупку вслепую.</p>
        </div>
        <div class="catalog-how-buy-note__actions">
          <a class="catalog-link-button" href="/farm/">Сверить состав</a>
          <a class="catalog-link-button" href="/calc/">Быстрый расчёт</a>
          <a class="catalog-link-button" href="/consultations/">Короткий вопрос</a>
        </div>
      </div>
    </section>
  `;
}

function renderFooter(ctx, state) {
  return `
    <footer class="catalog-footer" id="catalog-contacts">
      <div class="catalog-footer__shell">
        <div class="catalog-footer__meta">
          <div class="catalog-footer__copy">© ${escapeHtml(CATALOG_META.brandName)}</div>
          <div class="catalog-footer__links">
            <a href="https://klubnikaproject.ru/docs/policy">Политика</a>
            <a href="https://klubnikaproject.ru/docs/offero">Оферта</a>
            <a href="https://klubnikaproject.ru/docs/warrenty">Гарантия</a>
          </div>
        </div>
        <div class="catalog-footer__contacts">
          ${CATALOG_META.phones.map((phone) => `<a href="${phone.href}">${phone.value}</a>`).join("\n          ")}
          <a href="mailto:${CATALOG_META.email}">${CATALOG_META.email}</a>
          ${CATALOG_META.socialLinks
            .map((item) => `<a href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`)
            .join("\n          ")}
          <span>${escapeHtml(CATALOG_META.address)}</span>
        </div>
      </div>
    </footer>
  `;
}

function renderSearchPanel(ctx, state) {
  const results = getSearchResults(state.search.query, "catalog");
  return `
    <div class="catalog-overlay ${state.dialogs.search ? "is-open" : ""}" data-overlay="search" aria-hidden="${state.dialogs.search ? "false" : "true"}">
      <div class="catalog-overlay__backdrop" data-action="close-dialog" data-dialog="search"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--search" role="dialog" aria-modal="true" aria-labelledby="catalog-search-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-search-title">Поиск</h2>
          <button type="button" class="catalog-icon-button" data-action="close-dialog" data-dialog="search" aria-label="Закрыть поиск">×</button>
        </div>
        <div class="catalog-search-form">
          <input type="search" value="${escapeHtml(state.search.query)}" placeholder="Название, артикул, категория" data-action="search-input" />
        </div>
        <div class="catalog-search-results">
          ${
            state.search.query
              ? `
                ${
                  results.siteLinks.length
                    ? `<section><h3>Разделы сайта</h3>${results.siteLinks
                        .map(
                          (item) => `
                            <a class="catalog-search-result" href="${resolveHref(ctx, item.href)}">
                              <strong>${escapeHtml(item.title)}</strong>
                              <span>${escapeHtml(item.summary)}</span>
                            </a>
                          `
                        )
                        .join("")}</section>`
                    : ""
                }
                <section><h3>Категории</h3>${
                  results.categories.length
                    ? results.categories
                        .map(
                          (item) => `
                            <a class="catalog-search-result" href="${resolveHref(ctx, `/catalog/${item.slug}/`)}">
                              <strong>${escapeHtml(item.name)}</strong>
                              <span>${escapeHtml(item.description)}</span>
                            </a>
                          `
                        )
                        .join("")
                    : "<p>По этому запросу категории не нашлись.</p>"
                }</section>
                <section><h3>Товары</h3>${
                  results.products.length
                    ? results.products
                        .map(
                          (item) => `
                            <a class="catalog-search-result" href="${resolveHref(ctx, `/catalog/${item.categorySlug}/${item.slug}/`)}" data-product-slug="${item.slug}">
                              <strong>${escapeHtml(item.name)}</strong>
                              <span>${escapeHtml(item.article)} · ${escapeHtml(normalizeProductCopyText(item.shortDescription))}</span>
                            </a>
                          `
                        )
                        .join("")
                    : "<p>По этому запросу товары не нашлись.</p>"
                }</section>
              `
              : "<p>Введите название, артикул или нужную группу товаров, чтобы начать поиск.</p>"
          }
        </div>
      </div>
    </div>
  `;
}

function renderCartPanel(ctx, state) {
  const summary = getCartSummary(state);
  return `
    <div class="catalog-overlay ${state.dialogs.cart ? "is-open" : ""}" data-overlay="cart" aria-hidden="${state.dialogs.cart ? "false" : "true"}">
      <div class="catalog-overlay__backdrop" data-action="close-dialog" data-dialog="cart"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--side" role="dialog" aria-modal="true" aria-labelledby="catalog-cart-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-cart-title">Корзина</h2>
          <button type="button" class="catalog-icon-button" data-action="close-dialog" data-dialog="cart" aria-label="Закрыть корзину">×</button>
        </div>
        ${
          summary.entries.length
            ? `
              <div class="catalog-cart-list">
                ${summary.entries
                  .map(
                    (entry) => `
                      <article class="catalog-cart-item">
                        <img src="${resolveAsset(ctx, entry.product.images[0])}" alt="${escapeHtml(entry.product.name)}" loading="lazy" />
                        <div>
                          <strong>${escapeHtml(entry.product.name)}</strong>
                          <span>${formatPrice(entry.product.price)} × ${entry.qty}</span>
                          <div class="catalog-cart-item__actions">
                            <button type="button" class="catalog-link-button" data-action="change-qty" data-product-id="${entry.product.id}" data-delta="-1">−</button>
                            <button type="button" class="catalog-link-button" data-action="change-qty" data-product-id="${entry.product.id}" data-delta="1">+</button>
                            <button type="button" class="catalog-link-button" data-action="remove-from-cart" data-product-id="${entry.product.id}">Удалить</button>
                          </div>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>
              <div class="catalog-cart-summary">
                <strong>Итого: ${formatPrice(summary.total)}</strong>
                <p>Оформление идёт через менеджера, чтобы спокойно проверить совместимость узлов и актуальное наличие.</p>
                <button type="button" class="catalog-primary-button" data-action="open-assistant" data-intent="checkout">Передать заказ менеджеру</button>
              </div>
            `
            : `<p>Корзина пока пустая. Добавляйте товары из списка или из карточки товара.</p>`
        }
      </div>
    </div>
  `;
}

function renderAssistantPanel(state) {
  const singlePhone = CATALOG_META.phones.length === 1;
  return `
    <div class="catalog-overlay ${state.dialogs.assistant ? "is-open" : ""}" data-overlay="assistant" aria-hidden="${state.dialogs.assistant ? "false" : "true"}">
      <div class="catalog-overlay__backdrop" data-action="close-dialog" data-dialog="assistant"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--assistant" role="dialog" aria-modal="true" aria-labelledby="catalog-assistant-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-assistant-title">Нужна помощь с выбором или заказом</h2>
          <button type="button" class="catalog-icon-button" data-action="close-dialog" data-dialog="assistant" aria-label="Закрыть панель помощи">×</button>
        </div>
        <p>Можно сразу передать запрос в работу или на подбор, не теряя контекст страницы и выбранных товаров.</p>
        <div class="catalog-assistant-actions">
          ${CATALOG_META.phones
            .map((phone) => `<a class="catalog-primary-button" href="${phone.href}">${singlePhone ? phone.value : `${phone.label}: ${phone.value}`}</a>`)
            .join("")}
          <a class="catalog-secondary-button" href="mailto:${CATALOG_META.email}">Написать на ${CATALOG_META.email}</a>
          <a class="catalog-secondary-button" href="https://t.me/patiev_admin" target="_blank" rel="noreferrer">Открыть Telegram</a>
        </div>
      </div>
    </div>
  `;
}

function renderQuickViewPanel(ctx, state) {
  const product = state.dialogs.quickViewProductId ? getProductById(state.dialogs.quickViewProductId) : null;
  if (!product) {
    return `<div class="catalog-overlay" data-overlay="quick-view" aria-hidden="true"></div>`;
  }
  return `
    <div class="catalog-overlay is-open" data-overlay="quick-view" aria-hidden="false">
      <div class="catalog-overlay__backdrop" data-action="close-quick-view"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--quick" role="dialog" aria-modal="true" aria-labelledby="catalog-quick-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-quick-title">Быстрый просмотр</h2>
          <button type="button" class="catalog-icon-button" data-action="close-quick-view" aria-label="Закрыть быстрый просмотр">×</button>
        </div>
        <div class="catalog-quick-view">
          <img src="${resolveAsset(ctx, product.images[0])}" alt="${escapeHtml(product.name)}" />
          <div>
            ${renderBadgeList(product.badges)}
            <h3>${escapeHtml(product.name)}</h3>
            <p>Артикул: ${escapeHtml(product.article)}</p>
            <p>${escapeHtml(normalizeProductCopyText(product.shortDescription))}</p>
            ${renderStockBadge(product.stockStatus)}
            <strong>${formatPrice(product.price)}</strong>
            ${renderProductSpecs(product)}
            <div class="catalog-quick-view__actions">
              <button type="button" class="catalog-primary-button${isInCart(state, product.id) ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${product.id}">${
                isInCart(state, product.id) ? "Уже в корзине" : "Добавить в корзину"
              }</button>
              <button type="button" class="catalog-secondary-button" data-action="open-price-tiers" data-product-id="${product.id}">Цена по объёму</button>
              <a class="catalog-secondary-button" href="${resolveHref(ctx, getProductCatalogPath(product))}">Полная карточка</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPriceTierPanel(state) {
  const product = state.dialogs.priceTiersProductId ? getProductById(state.dialogs.priceTiersProductId) : null;
  if (!product) {
    return `<div class="catalog-overlay" data-overlay="price-tiers" aria-hidden="true"></div>`;
  }
  return `
    <div class="catalog-overlay is-open" data-overlay="price-tiers" aria-hidden="false">
      <div class="catalog-overlay__backdrop" data-action="close-price-tiers"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--quick" role="dialog" aria-modal="true" aria-labelledby="catalog-price-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-price-title">Цена по объёму</h2>
          <button type="button" class="catalog-icon-button" data-action="close-price-tiers" aria-label="Закрыть блок цены по объёму">×</button>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="catalog-tier-list">
          ${product.priceTiers
            .map(
              (tier) => `
                <article class="catalog-tier-card">
                  <strong>${escapeHtml(tier.label)}</strong>
                  <span>от ${tier.minQty} шт.</span>
                  <div>${formatPrice(tier.price)}</div>
                  <p>${escapeHtml(tier.summary)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderMobileMenu(ctx, state) {
  const topCategories = getTopCategories();
  const branchCategory = state.menuCategorySlug ? getCategoryBySlug(state.menuCategorySlug) : null;
  const branchChildren = branchCategory ? getChildCategories(branchCategory.id) : [];
  return `
    <div class="catalog-overlay ${state.dialogs.menu ? "is-open" : ""}" data-overlay="menu" aria-hidden="${state.dialogs.menu ? "false" : "true"}">
      <div class="catalog-overlay__backdrop" data-action="close-dialog" data-dialog="menu"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--side catalog-overlay__panel--menu" role="dialog" aria-modal="true" aria-labelledby="catalog-menu-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-menu-title">Меню каталога</h2>
          <button type="button" class="catalog-icon-button" data-action="close-dialog" data-dialog="menu" aria-label="Закрыть меню">×</button>
        </div>
        <nav class="catalog-mobile-nav">
          <a href="${resolveHref(ctx, "/")}">Главная</a>
          <a href="${resolveHref(ctx, "/farm/")}">Расчёт фермы</a>
          <a href="${resolveHref(ctx, "/consultations/")}">Консультации</a>
          <a href="${resolveHref(ctx, "/study/")}">Сопровождение</a>
          <a href="${resolveHref(ctx, "/calc/")}">Калькулятор</a>
          <a href="${resolveHref(ctx, "/catalog/")}">Магазин</a>
          <a href="#catalog-how-buy">Как купить</a>
          <a href="#catalog-contacts">Контакты</a>
          <a class="catalog-mobile-nav__link" href="${resolveHref(ctx, "/cabinet/login/")}">Личный кабинет</a>
          <button type="button" class="catalog-mobile-nav__link" data-action="open-cart">Корзина</button>
        </nav>
        <div class="catalog-mobile-category-tree">
          <h3>Категории</h3>
          ${
            branchCategory
              ? `
                <div class="catalog-mobile-branch-head">
                  <button type="button" class="catalog-link-button" data-action="back-menu-category">Назад</button>
                  <strong>${escapeHtml(branchCategory.name)}</strong>
                </div>
                <div class="catalog-mobile-category-tree__list">
                  <a href="${resolveHref(ctx, `/catalog/${branchCategory.slug}/`)}">Открыть весь раздел</a>
                  ${branchChildren
                    .map(
                      (category) => `
                        <a href="${resolveHref(ctx, `/catalog/${category.slug}/`)}">${escapeHtml(category.name)}</a>
                      `
                    )
                    .join("")}
                </div>
              `
              : topCategories
                  .map(
                    (category) => `
                      <div class="catalog-mobile-category-item">
                        <a href="${resolveHref(ctx, `/catalog/${category.slug}/`)}">${escapeHtml(category.name)}</a>
                        ${
                          getChildCategories(category.id).length
                            ? `<button type="button" class="catalog-link-button" data-action="open-menu-category" data-category-slug="${category.slug}">Открыть ветку</button>`
                            : ""
                        }
                      </div>
                    `
                  )
                  .join("")
          }
        </div>
        <div class="catalog-mobile-contacts">
          ${CATALOG_META.phones.map((phone) => `<a href="${phone.href}">${phone.value}</a>`).join("")}
          <a href="mailto:${CATALOG_META.email}">${CATALOG_META.email}</a>
        </div>
      </div>
    </div>
  `;
}

function renderMobileFilters(ctx, state, data) {
  if (!data) return "";
  return `
    <div class="catalog-overlay ${state.dialogs.filters ? "is-open" : ""}" data-overlay="filters" aria-hidden="${state.dialogs.filters ? "false" : "true"}">
      <div class="catalog-overlay__backdrop" data-action="close-filters"></div>
      <div class="catalog-overlay__panel catalog-overlay__panel--side" role="dialog" aria-modal="true" aria-labelledby="catalog-filters-title">
        <div class="catalog-overlay__head">
          <h2 id="catalog-filters-title">Фильтры</h2>
          <button type="button" class="catalog-icon-button" data-action="close-filters" aria-label="Закрыть фильтры">×</button>
        </div>
        ${renderFilterPanel(data, state.category.draft, true)}
      </div>
    </div>
  `;
}

function renderHeader(ctx, state) {
  return `
    <header class="catalog-header">
      <div class="catalog-header__top catalog-topbar">
        <div class="catalog-brand brand">
          <a class="brand-home" href="${resolveHref(ctx, "/")}">
            <img class="brand-lockup brand-lockup-primary" src="${resolveAsset(ctx, "documents/logo/header-lockup-v1-close-compact-dark.svg?v=20260403aa")}" alt="KLUBNIKA PROJECT" />
            <img class="brand-lockup brand-lockup-compact" src="${resolveAsset(ctx, "documents/logo/header-lockup-v1-close-compact-dark.svg?v=20260403aa")}" alt="KLUBNIKA PROJECT" />
          </a>
        </div>
        <button
          class="nav-toggle catalog-nav-toggle"
          type="button"
          data-action="open-menu"
          aria-label="Открыть меню"
          aria-expanded="false"
        >
          <span></span>
        </button>
        <nav class="catalog-main-nav nav" aria-label="Основная навигация">
          <a class="nav-link" href="${resolveHref(ctx, "/")}">Сайт</a>
          <a class="nav-link" href="${resolveHref(ctx, "/catalog/")}">Каталог</a>
          <a class="nav-link" href="${resolveHref(ctx, "/calc/")}">Калькулятор</a>
          <a class="nav-link" href="${resolveHref(ctx, "/cabinet/login/")}">Кабинет</a>
        </nav>
        <div class="catalog-header-contactbar">
          <a class="catalog-header-phone" href="${CATALOG_META.phones[0].href}">${CATALOG_META.phones[0].value}</a>
          <a class="catalog-icon-pill catalog-header-anchor" href="#catalog-contacts">Связь</a>
        </div>
      </div>
    </header>
  `;
}

function renderFloatingAssistant() {
  return `
    <button type="button" class="catalog-floating-assistant" data-action="open-assistant" data-intent="chat">
      Ассистент
    </button>
  `;
}

export function renderCatalogApp(ctx, rawState = {}) {
  const state = withDefaults(rawState);
  let pageMarkup = "";
  let mobileFilters = "";

  if (ctx.route.type === "landing") {
    pageMarkup = renderLandingPage(ctx);
  }

  if (ctx.route.type === "category") {
    const data = getCategoryPageData(ctx.route.categorySlug, state.category.searchParams || new URLSearchParams());
    pageMarkup = renderCategoryPage(ctx, state, data);
    mobileFilters = renderMobileFilters(ctx, state, data);
  }

  if (ctx.route.type === "product") {
    const data = getProductPageData(ctx.route.categorySlug, ctx.route.productSlug);
    pageMarkup = renderProductPage(ctx, state, data);
  }

  return `
    <div class="catalog-app-shell">
      ${renderHeader(ctx, state)}
      <main class="catalog-main">
        ${state.flashMessage ? `<div class="catalog-flash">${escapeHtml(state.flashMessage)}</div>` : ""}
        ${pageMarkup}
        ${renderHowBuy(ctx)}
      </main>
      ${renderFooter(ctx, state)}
      ${renderFloatingAssistant()}
      ${renderSearchPanel(ctx, state)}
      ${renderCartPanel(ctx, state)}
      ${renderAssistantPanel(state)}
      ${renderQuickViewPanel(ctx, state)}
      ${renderPriceTierPanel(state)}
      ${renderMobileMenu(ctx, state)}
      ${mobileFilters}
    </div>
  `;
}

export function getRouteMeta(route) {
  if (route.type === "landing") return buildLandingMeta();
  if (route.type === "category") {
    const data = getCategoryPageData(route.categorySlug, new URLSearchParams());
    return buildCategoryMeta(data.category);
  }
  const data = getProductPageData(route.categorySlug, route.productSlug);
  return buildProductMeta(data.category, data.product);
}
