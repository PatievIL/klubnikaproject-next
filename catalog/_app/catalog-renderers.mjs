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
    newsletterStatus: state.newsletterStatus || "",
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
      <div class="catalog-product-card__media">
        ${renderBadgeList(product.badges)}
        ${
          product.reviewCount
            ? `<a class="catalog-product-card__reviews" href="${resolveHref(
                ctx,
                `${productHref}#reviews`
              )}">${product.reviewCount} отзывов</a>`
            : ""
        }
        <a href="${resolveHref(ctx, productHref)}">
          <img src="${resolveAsset(ctx, product.images[0])}" alt="${escapeHtml(product.name)}" loading="lazy" />
        </a>
      </div>
      <div class="catalog-product-card__body">
        <a class="catalog-product-card__title" href="${resolveHref(ctx, productHref)}">${escapeHtml(
          product.name
        )}</a>
        <div class="catalog-product-card__meta">
          ${renderStockBadge(product.stockStatus)}
          <span>Артикул: ${escapeHtml(product.article)}</span>
        </div>
        <p class="catalog-product-card__summary">${escapeHtml(product.shortDescription)}</p>
        <div class="catalog-product-card__price-row">
          <div>
            <strong>${formatPrice(product.price)}</strong>
            ${product.oldPrice ? `<span class="catalog-old-price">${formatPrice(product.oldPrice)}</span>` : ""}
          </div>
          <button type="button" class="catalog-link-button" data-action="open-price-tiers" data-product-id="${product.id}">
            Варианты цен
          </button>
        </div>
        <div class="catalog-product-card__actions">
          <a class="catalog-secondary-button" href="${resolveHref(ctx, productHref)}">Подробности</a>
          ${
            stock.purchasable
              ? `<button type="button" class="catalog-primary-button${inCart ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${
                  product.id
                }">${inCart ? "Уже в корзине" : "Добавить в корзину"}</button>`
              : `<button type="button" class="catalog-primary-button" disabled>Нет в наличии</button>`
          }
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
                      <span>${escapeHtml(product.shortDescription)}</span>
                    </div>
                  </a>
                </div>
                <div class="catalog-table-cell">${renderStockBadge(product.stockStatus)}</div>
                <div class="catalog-table-cell">Артикул: ${escapeHtml(product.article)}</div>
                <div class="catalog-table-cell">
                  <strong>${formatPrice(product.price)}</strong>
                  <button type="button" class="catalog-link-button" data-action="open-price-tiers" data-product-id="${product.id}">Варианты цен</button>
                </div>
                <div class="catalog-table-cell catalog-table-cell--actions">
                  <button type="button" class="catalog-link-button" data-action="open-quick-view" data-product-id="${product.id}">Быстрый просмотр</button>
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
  return `
    <section class="catalog-category-listing">
      <div class="catalog-listing-toolbar">
        <div>
          <p class="catalog-listing-count">Найдено товаров: ${data.filteredProducts.length}</p>
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
            Фильтры
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
  const heroShortcuts = data.children.length
    ? data.children.slice(0, 3).map(
        (category) => `
          <a class="catalog-page-hero__shortcut-card" href="${resolveHref(ctx, `/catalog/${category.slug}/`)}">
            <strong>${escapeHtml(category.name)}</strong>
            <p>${escapeHtml(category.description)}</p>
            <span>${category.productCount} товаров</span>
          </a>
        `
      )
    : data.products.slice(0, 3).map(
        (product) => `
          <a class="catalog-page-hero__shortcut-card" href="${resolveHref(ctx, getProductCatalogPath(product))}">
            <strong>${escapeHtml(product.name)}</strong>
            <p>${escapeHtml(product.shortDescription)}</p>
            <span>${formatPrice(product.price)}</span>
          </a>
        `
      );

  return `
    <section class="catalog-page-hero">
      ${renderBreadcrumbs(ctx, data.breadcrumbs)}
      <div class="catalog-page-hero__content">
        <div class="catalog-page-hero__copy">
          <span class="catalog-eyebrow">Категория магазина</span>
          <h1>${escapeHtml(data.category.name)}</h1>
          <p>${escapeHtml(data.category.description)}</p>
          <div class="catalog-page-hero__meta">
            <span>${data.products.length} товаров в разделе</span>
            ${data.children.length ? `<span>${data.children.length} рабочих подкатегорий</span>` : ""}
          </div>
          <div class="catalog-page-hero__actions">
            <a class="catalog-primary-button" href="#catalog-products">Смотреть товары</a>
            ${
              data.children.length
                ? `<a class="catalog-secondary-button" href="#catalog-subcategories">Открыть подкатегории</a>`
                : `<a class="catalog-secondary-button" href="${resolveHref(ctx, "/consultations/")}">Сверить задачу</a>`
            }
          </div>
          <div class="catalog-page-hero__rail">
            <div class="catalog-page-hero__rail-head">
              <span class="catalog-sibling-row__label">Карта каталога</span>
              <p>Переключайтесь между верхнеуровневыми разделами без возврата на главную магазина.</p>
            </div>
            <div class="catalog-sibling-grid" aria-label="Соседние категории">
              ${data.siblings
                .map(
                  (category) => `
                    <a class="catalog-sibling-card${category.active ? " is-active" : ""}" href="${resolveHref(
                      ctx,
                      `/catalog/${category.slug}/`
                    )}">
                      <span class="catalog-sibling-card__media">
                        <img src="${resolveAsset(ctx, category.image)}" alt="${escapeHtml(category.name)}" loading="lazy" />
                      </span>
                      <span class="catalog-sibling-card__body">
                        <strong>${escapeHtml(category.name)}</strong>
                        <span>${category.productCount} товаров</span>
                      </span>
                    </a>
                  `
                )
                .join("")}
            </div>
          </div>
          ${
            heroShortcuts.length
              ? `
                <div class="catalog-page-hero__support">
                  <div class="catalog-page-hero__support-head">
                    <strong>${data.children.length ? "Быстрый вход в сценарии раздела" : "С чего обычно начинают в этом разделе"}</strong>
                    <p>${
                      data.children.length
                        ? "Начните с подкатегории, если уже понимаете рабочий узел или конкретный сценарий закупки."
                        : "Если подкатегорий нет, удобнее начать с самых типовых позиций, а уже потом докручивать состав."
                    }</p>
                  </div>
                  <div class="catalog-page-hero__shortcut-grid">
                    ${heroShortcuts.join("")}
                  </div>
                </div>
              `
              : ""
          }
        </div>
        <aside class="catalog-page-hero__aside">
          <div class="catalog-page-hero__card">
            <strong>Как смотреть этот раздел</strong>
            <ul>
              <li>Сначала выберите подкатегорию или сценарий узла, потом уже сравнивайте позиции.</li>
              <li>${data.products.length} товаров уже разложены по фильтрам, документам и быстрым действиям.</li>
              ${data.children.length ? `<li>${data.children.length} подкатегорий помогают не смешивать типовые и проектные позиции.</li>` : `<li>Здесь лучше покупать сразу только те позиции, чья совместимость вам уже понятна.</li>`}
            </ul>
          </div>
          <div class="catalog-page-hero__card catalog-page-hero__card--accent">
            <strong>Когда лучше не идти в корзину сразу</strong>
            <p>Если товар влияет на схему света, полива, стеллажа или запуска в целом, лучше сначала уточнить сценарий, а не собирать модуль поштучно.</p>
            <div class="catalog-page-hero__actions">
              <a class="catalog-secondary-button" href="${resolveHref(ctx, "/consultations/")}">Сверить задачу</a>
              <a class="catalog-link-button" href="${resolveHref(ctx, "/farm/")}">Перейти к расчёту</a>
            </div>
          </div>
        </aside>
      </div>
    </section>
    ${
      data.children.length
        ? `
          <section class="catalog-subcategory-section" id="catalog-subcategories">
            <div class="catalog-section-head">
              <h2>Подкатегории раздела</h2>
              <p>Разделены по рабочим сценариям, чтобы не смешивать типовые позиции, докупку и проектные решения.</p>
            </div>
            <div class="catalog-subcategory-grid">
              ${data.children.map((category) => renderCategoryCard(ctx, category, true)).join("")}
            </div>
          </section>
        `
        : ""
    }
    <section class="catalog-category-layout" id="catalog-products">
      <aside class="catalog-category-sidebar">
        ${renderFilterPanel(data, state.category.draft)}
      </aside>
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

function renderProductPage(ctx, state, data) {
  const activeImageIndex = state.product.activeImageIndex || 0;
  const activeImage = data.product.images[activeImageIndex] || data.product.images[0];
  const stock = STOCK_META[data.product.stockStatus] || STOCK_META.out_of_stock;
  return `
    <section class="catalog-page-hero catalog-page-hero--product">
      ${renderBreadcrumbs(ctx, data.breadcrumbs)}
      <div class="catalog-product-top">
        <div class="catalog-product-gallery">
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
        <div class="catalog-product-summary">
          <div class="catalog-product-summary__head">
            <div>
              <span class="catalog-eyebrow">Позиция магазина</span>
              <h1>${escapeHtml(data.product.name)}</h1>
              <p>Артикул: ${escapeHtml(data.product.article)} · Раздел: ${escapeHtml(data.category.name)}</p>
            </div>
            <button type="button" class="catalog-link-button" data-action="set-tab" data-tab="reviews">
              ${data.product.reviewCount ? `${data.product.reviewCount} отзывов` : "Оставить отзыв"}
            </button>
          </div>
          <div class="catalog-product-summary__lead">
            <p>${escapeHtml(data.product.shortDescription)}</p>
            <div class="catalog-product-summary__signals">
              <span>${data.product.documents.length} документов</span>
              <span>${data.product.faq.length} ответов по позиции</span>
              <span>${data.relatedProducts.length} соседних позиций в разделе</span>
            </div>
          </div>
          <section class="catalog-product-route-card">
            <div>
              <span class="catalog-eyebrow">Перед оплатой</span>
              <h2>Проверьте не только цену, но и место позиции в вашей схеме</h2>
              <p>Каталог ускоряет типовую закупку, но не должен подменять разбор совместимости. Если узел влияет на свет, полив, стеллаж или корневую зону, лучше уточнить сценарий до оформления заказа.</p>
            </div>
            <div class="catalog-product-route-card__actions">
              <a class="catalog-secondary-button" href="${resolveHref(ctx, "/farm/")}">Рассчитать ферму</a>
              <button type="button" class="catalog-primary-button" data-action="open-assistant" data-intent="question">Сверить с задачей</button>
            </div>
          </section>
          <div class="catalog-product-summary__grid">
            <div class="catalog-buy-box">
              <div class="catalog-buy-box__sticky">
                <div class="catalog-buy-box__kicker">Быстрый сценарий покупки</div>
                <div class="catalog-buy-box__price">
                  <strong>${formatPrice(data.product.price)}</strong>
                  ${data.product.oldPrice ? `<span class="catalog-old-price">${formatPrice(data.product.oldPrice)}</span>` : ""}
                </div>
                <button type="button" class="catalog-link-button" data-action="open-price-tiers" data-product-id="${data.product.id}">
                  Варианты цен
                </button>
                <div class="catalog-buy-box__stock">${renderStockBadge(data.product.stockStatus)}</div>
                <div class="catalog-buy-box__actions">
                  ${
                    stock.purchasable
                      ? `<button type="button" class="catalog-primary-button${isInCart(state, data.product.id) ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${
                          data.product.id
                        }">${isInCart(state, data.product.id) ? "Уже в корзине" : "Добавить в корзину"}</button>`
                      : `<button type="button" class="catalog-primary-button" disabled>Нет в наличии</button>`
                  }
                  <button type="button" class="catalog-secondary-button" data-action="open-assistant" data-intent="one-click">Купить в 1 клик</button>
                </div>
                <div class="catalog-buy-box__links">
                  <button type="button" class="catalog-link-button" data-action="open-assistant" data-intent="better-price">Нашли дешевле?</button>
                  <button type="button" class="catalog-link-button" data-action="open-assistant" data-intent="delivery">Рассчитать доставку</button>
                  <button type="button" class="catalog-link-button" data-action="open-assistant" data-intent="gift">Хочу в подарок</button>
                </div>
                <div class="catalog-buy-box__note">
                  <strong>Когда брать сразу</strong>
                  <p>Если узел и совместимость уже понятны, добавляйте в корзину. Если позиция влияет на схему модуля, лучше сначала сверить сценарий с нами.</p>
                </div>
                ${renderProductSpecs(data.product)}
                <button type="button" class="catalog-link-button" data-action="set-tab" data-tab="description">Все характеристики</button>
              </div>
            </div>
            <div class="catalog-product-content">
              <div class="catalog-product-highlights">
                <div class="catalog-product-rating">
                  ${renderRatingStars(data.product.rating || 0)}
                  <button type="button" class="catalog-link-button" data-action="set-tab" data-tab="reviews">${data.product.reviewCount} отзывов</button>
                </div>
              </div>
              ${renderProductTabs(ctx, state, data)}
              <section class="catalog-qa-section">
                <div class="catalog-section-head">
                  <h2>Вопросы и ответы</h2>
                </div>
                <div class="catalog-qa-list">
                  ${data.product.faq
                    .map(
                      (item) => `
                        <article class="catalog-qa-item">
                          <strong>${escapeHtml(item.question)}</strong>
                          <p>${escapeHtml(item.answer)}</p>
                          <div>
                            <span>Вопрос: ${new Date(item.askedAt).toLocaleDateString("ru-RU")}</span>
                            <span>Ответ магазина: ${new Date(item.answeredAt).toLocaleDateString("ru-RU")}</span>
                          </div>
                        </article>
                      `
                    )
                    .join("")}
                </div>
              </section>
              <section class="catalog-consultation-cta">
                <h2>Нужна консультация?</h2>
                <p>Если позиция выглядит знакомо, но не до конца ясно, как она встанет в ваш модуль, лучше сверить схему до оплаты.</p>
                <button type="button" class="catalog-primary-button" data-action="open-assistant" data-intent="question">Задать вопрос</button>
              </section>
              <section class="catalog-related-products">
                <div class="catalog-section-head">
                  <h2>Соседние позиции</h2>
                </div>
                <div class="catalog-grid-listing catalog-grid-listing--compact">
                  ${data.relatedProducts.map((product) => renderProductCard(ctx, state, data.category.slug, product)).join("")}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderLandingPage(ctx) {
  const data = getLandingPageData();
  const heroCategories = data.categories.slice(0, 4);
  const topCategoryCount = data.categories.length;
  const totalProductCount = data.categories.reduce((sum, category) => sum + category.productCount, 0);
  return `
    <section class="catalog-landing-hero">
      ${renderBreadcrumbs(ctx, data.breadcrumbs)}
      <div class="catalog-landing-hero__content">
        <div class="catalog-landing-hero__copy">
          <span class="catalog-eyebrow">Каталог для клубничной фермы</span>
          <h1>Каталог для тех случаев, когда задача уже понятна</h1>
          <p>${escapeHtml(CATALOG_META.slogan)}</p>
          <p class="catalog-landing-hero__sublead">Здесь удобно быстро перейти в нужную категорию, проверить наличие и собрать закупку. Если схема ещё собирается, лучше сначала начать с расчёта или короткого вопроса.</p>
          <div class="catalog-landing-hero__actions">
            <a class="catalog-primary-button" href="#catalog-categories">Открыть категории</a>
            <a class="catalog-secondary-button" href="${resolveHref(ctx, "/farm/")}">Сначала сверить задачу</a>
          </div>
          <div class="catalog-landing-hero__signals">
            <span>Когда уже знаете, что нужно купить</span>
            <span>Когда добираете конкретный узел</span>
            <span>Когда хотите быстро проверить наличие и цену</span>
          </div>
          <div class="catalog-landing-hero__map">
            <div class="catalog-landing-hero__map-head">
              <strong>С чего обычно начинают закупку</strong>
              <p>Основные рабочие разделы, с которых удобно начать, если вы уже понимаете задачу.</p>
            </div>
            <div class="catalog-landing-hero__map-grid">
              ${heroCategories
                .map(
                  (category) => `
                    <a class="catalog-landing-hero__map-card" href="${resolveHref(ctx, `/catalog/${category.slug}/`)}">
                      <span class="catalog-landing-hero__map-media">
                        <img src="${resolveAsset(ctx, category.image)}" alt="${escapeHtml(category.name)}" loading="lazy" />
                      </span>
                      <span class="catalog-landing-hero__map-body">
                        <strong>${escapeHtml(category.name)}</strong>
                        <span>${category.productCount} товаров</span>
                      </span>
                    </a>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
        <div class="catalog-landing-hero__aside">
          <div class="catalog-landing-hero__card">
            <strong>Каталог собран для рабочей закупки</strong>
            <p>Это не просто список позиций, а удобный вход в разделы, сценарии закупки и понятные действия без лишних прыжков.</p>
            <div class="catalog-landing-hero__stats">
              <div class="catalog-landing-hero__stat">
                <strong>${topCategoryCount}</strong>
                <span>верхнеуровневых разделов</span>
              </div>
              <div class="catalog-landing-hero__stat">
                <strong>${totalProductCount}</strong>
                <span>товаров в каталоге</span>
              </div>
              <div class="catalog-landing-hero__stat">
                <strong>Q&amp;A</strong>
                <span>документы, отзывы и быстрые действия по позициям</span>
              </div>
              <div class="catalog-landing-hero__stat">
                <strong>Live</strong>
                <span>фильтры, быстрый просмотр и корзина без перезагрузки</span>
              </div>
            </div>
          </div>
          <div class="catalog-landing-hero__route">
            <strong>Когда лучше сначала не покупать</strong>
            <p>Если вы ещё выбираете формат фермы, не уверены в совместимости узлов или только собираете первую схему, правильнее начать с расчёта, а не с покупок поштучно.</p>
            <div class="catalog-landing-hero__route-actions">
              <a class="catalog-secondary-button" href="${resolveHref(ctx, "/consultations/")}">Обсудить схему</a>
              <a class="catalog-primary-button" href="${resolveHref(ctx, "/calc/")}">Открыть калькулятор</a>
            </div>
          </div>
          <div class="catalog-landing-hero__utility">
            <strong>Что можно сделать сразу</strong>
            <div class="catalog-landing-hero__utility-list">
              <a href="#catalog-categories">Выбрать категорию</a>
              <a href="${resolveHref(ctx, "/farm/")}">Сверить состав фермы</a>
              <a href="${resolveHref(ctx, "/consultations/")}">Задать вопрос</a>
            </div>
          </div>
        </div>
      </div>
      <div class="catalog-section-head">
        <h2>Категории магазина</h2>
        <p>Сначала выберите рабочий узел, потом уже сравнивайте товары внутри раздела.</p>
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
      <div class="catalog-section-head">
        <h2>Как купить</h2>
        <p>Если задача уже понятна, здесь можно быстро собрать закупку. Если нет, каталог помогает не потерять контекст и перейти к вопросу или расчёту.</p>
      </div>
      <div class="catalog-how-buy-grid">
        <article>
          <strong>1. Выберите категорию</strong>
          <p>Если модуль и узел уже понятны, заходите в нужный раздел и отфильтруйте позиции по атрибутам.</p>
        </article>
        <article>
          <strong>2. Сравните цены и характеристики</strong>
          <p>У каждой позиции есть варианты цен, быстрый просмотр, документы и короткий список того, что важно проверить до оплаты.</p>
        </article>
        <article>
          <strong>3. Добавьте в корзину или задайте вопрос</strong>
          <p>Понятные позиции можно сразу положить в корзину, а спорные лучше быстро уточнить, не уходя со страницы.</p>
        </article>
      </div>
    </section>
  `;
}

function renderFooter(ctx, state) {
  return `
    <footer class="catalog-footer" id="catalog-contacts">
      <div class="catalog-footer__grid">
        <div>
          <h2>${escapeHtml(CATALOG_META.brandName)}</h2>
          <p>${escapeHtml(CATALOG_META.slogan)}</p>
          <div class="catalog-footer__socials">
            ${CATALOG_META.socialLinks
              .map((item) => `<a href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`)
              .join("")}
          </div>
        </div>
        <div>
          <h3>Каталог</h3>
          <ul>
            ${getTopCategories()
              .map((category) => `<li><a href="${resolveHref(ctx, `/catalog/${category.slug}/`)}">${escapeHtml(category.name)}</a></li>`)
              .join("")}
          </ul>
        </div>
        <div>
          <h3>Информация</h3>
          <ul>
            <li><a href="${resolveHref(ctx, "/consultations/")}">Задать вопрос</a></li>
            <li><a href="${resolveHref(ctx, "/farm/")}">Расчёт фермы</a></li>
            <li><a href="${resolveHref(ctx, "/study/")}">Сопровождение</a></li>
            <li><a href="${resolveHref(ctx, "/calc/")}">Калькулятор</a></li>
          </ul>
        </div>
        <div>
          <h3>Контакты</h3>
          <ul class="catalog-footer__contacts">
            ${CATALOG_META.phones.map((phone) => `<li><a href="${phone.href}">${phone.value}</a></li>`).join("")}
            <li><a href="mailto:${CATALOG_META.email}">${CATALOG_META.email}</a></li>
            <li>${escapeHtml(CATALOG_META.address)}</li>
          </ul>
        </div>
      </div>
      <div class="catalog-footer__newsletter">
        <div>
          <h3>Подписка на рассылку</h3>
          <p>Получайте новые позиции, изменения наличия и обновления по категориям.</p>
        </div>
        <form class="catalog-newsletter-form" data-newsletter-form>
          <input type="email" name="email" placeholder="Email для обновлений" required />
          <button type="submit" class="catalog-primary-button">Подписаться</button>
        </form>
        ${state.newsletterStatus ? `<p class="catalog-inline-message">${escapeHtml(state.newsletterStatus)}</p>` : ""}
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
                              <span>${escapeHtml(item.article)} · ${escapeHtml(item.shortDescription)}</span>
                            </a>
                          `
                        )
                        .join("")
                    : "<p>По этому запросу товары не нашлись.</p>"
                }</section>
              `
              : "<p>Введите название, артикул или рабочий узел, чтобы начать поиск.</p>"
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
            : `<p>Корзина пока пустая. Добавляйте позиции из списка или из карточки товара.</p>`
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
        <p>Можно сразу передать задачу в работу или на подбор, не теряя контекст страницы и выбранных позиций.</p>
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
            <p>${escapeHtml(product.shortDescription)}</p>
            ${renderStockBadge(product.stockStatus)}
            <strong>${formatPrice(product.price)}</strong>
            ${renderProductSpecs(product)}
            <div class="catalog-quick-view__actions">
              <button type="button" class="catalog-primary-button${isInCart(state, product.id) ? " is-active" : ""}" data-action="toggle-cart" data-product-id="${product.id}">${
                isInCart(state, product.id) ? "Уже в корзине" : "Добавить в корзину"
              }</button>
              <button type="button" class="catalog-secondary-button" data-action="open-price-tiers" data-product-id="${product.id}">Варианты цен</button>
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
          <h2 id="catalog-price-title">Варианты цен</h2>
          <button type="button" class="catalog-icon-button" data-action="close-price-tiers" aria-label="Закрыть варианты цен">×</button>
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
      <div class="catalog-overlay__panel catalog-overlay__panel--side" role="dialog" aria-modal="true" aria-labelledby="catalog-menu-title">
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
          <a class="catalog-mobile-nav__link" href="${resolveHref(ctx, "/account/")}">Личный кабинет</a>
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
  const summary = getCartSummary(state);
  return `
    <header class="catalog-header">
      <div class="catalog-header__top catalog-topbar">
        <div class="catalog-brand brand">
          <a class="brand-home" href="${resolveHref(ctx, "/")}">
            <div class="brand-logo">
              <img src="${resolveAsset(ctx, "assets/brand-berry-beige.svg")}" alt="Знак Klubnika Project" />
            </div>
            <div class="brand-copy">
              <div class="brand-title">
                <span class="brand-title-line">Klubnika</span>
                <span class="brand-title-line">Project</span>
              </div>
            </div>
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
          <a class="nav-link" href="${resolveHref(ctx, "/")}">Главная</a>
          <div class="nav-group">
            <button class="nav-trigger" type="button">Решения</button>
            <div class="nav-menu">
              <a href="${resolveHref(ctx, "/farm/")}"><strong>Расчёт фермы</strong><span>Состав запуска, рамка бюджета и следующий шаг.</span></a>
              <a href="${resolveHref(ctx, "/study/")}"><strong>Сопровождение</strong><span>Разбор действующей фермы, узких мест и технологии.</span></a>
              <a href="${resolveHref(ctx, "/consultations/")}"><strong>Консультации</strong><span>Точечный разбор задачи, совместимости и выбора.</span></a>
              <a href="${resolveHref(ctx, "/klubhack/")}"><strong>Клубничный Хак</strong><span>Практическая база по технологии клубничной фермы.</span></a>
            </div>
          </div>
          <div class="nav-group">
            <button class="nav-trigger" type="button">Каталог</button>
            <div class="nav-menu nav-menu-wide">
              <a href="${resolveHref(ctx, "/catalog/")}"><strong>Магазин</strong><span>Вход в рабочие категории и закупку без лишней витринности.</span></a>
              <a href="${resolveHref(ctx, "/catalog/led/")}"><strong>LED</strong><span>Линейные и тепличные сценарии досветки.</span></a>
              <a href="${resolveHref(ctx, "/catalog/irrigation/")}"><strong>Полив</strong><span>Полив, дозирование и расходники по узлам.</span></a>
              <a href="${resolveHref(ctx, "/catalog/racks/")}"><strong>Стеллажи</strong><span>Каркасы, лотки и модульные ряды.</span></a>
              <a href="${resolveHref(ctx, "/catalog/substrates/")}"><strong>Субстрат</strong><span>Маты, кубики и старт корневой зоны.</span></a>
              <a href="${resolveHref(ctx, "/seeds/")}"><strong>Семена и Frigo</strong><span>Посадочный материал под запуск и докупку.</span></a>
            </div>
          </div>
          <a class="nav-link" href="${resolveHref(ctx, "/calc/")}">Калькулятор</a>
        </nav>
        <div class="catalog-header-utility">
          <a class="catalog-icon-pill catalog-header-utility-link" href="#catalog-how-buy">Как купить</a>
          <a class="catalog-icon-pill catalog-header-utility-link" href="${resolveHref(ctx, "/account/")}">Кабинет</a>
          <button type="button" class="catalog-header-cart" data-action="open-cart">
            Корзина <span>${summary.itemCount}</span>
          </button>
        </div>
        <div class="catalog-header-mobile-actions">
          <button type="button" class="catalog-icon-pill" data-action="open-search" aria-label="Открыть поиск">Поиск</button>
          <button type="button" class="catalog-icon-pill" data-action="open-cart" aria-label="Открыть корзину">Корзина <span>${summary.itemCount}</span></button>
          <button type="button" class="catalog-icon-pill" data-action="open-menu" aria-label="Открыть меню">Меню</button>
        </div>
      </div>
      <div class="catalog-header__bottom">
        <div class="catalog-header-workbar">
          <form class="catalog-header-search" data-header-search>
            <div class="catalog-search-shell">
              <input type="search" value="${escapeHtml(state.search.query)}" placeholder="Название, артикул или рабочий узел" />
              <button type="submit" class="catalog-search-submit" aria-label="Искать по магазину">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M10.5 4a6.5 6.5 0 1 0 4.018 11.61l4.436 4.436 1.06-1.06-4.436-4.436A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
                </svg>
                <span class="sr-only">Искать</span>
              </button>
            </div>
          </form>
          <div class="catalog-header-support">
            <div class="catalog-header-contactline">
              ${CATALOG_META.phones.map((phone) => `<a href="${phone.href}">${phone.value}</a>`).join("")}
            </div>
            <div class="catalog-header-actions">
              <a class="catalog-icon-pill catalog-header-anchor" href="#catalog-contacts">Контакты</a>
              <button type="button" class="catalog-secondary-button" data-action="open-assistant" data-intent="callback">Попросить звонок</button>
              <button type="button" class="catalog-secondary-button" data-action="open-assistant" data-intent="question">Задать вопрос</button>
            </div>
          </div>
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
