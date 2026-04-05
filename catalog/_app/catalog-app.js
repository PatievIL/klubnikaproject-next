import {
  createDefaultCategoryDraft,
  getCategoryPageData,
  getProductPageData,
  parseCategorySearchParams,
} from "./catalog-data.mjs";
import { renderCatalogApp } from "./catalog-renderers.mjs";

const CART_KEY = "klubnika.catalog.cart.v1";
const REVIEW_KEY = "klubnika.catalog.reviews.v1";

const appRoot = document.getElementById("catalog-app");
const route = window.__CATALOG_ROUTE__;
const ctx = window.__CATALOG_CONTEXT__;

let state = buildStateFromLocation();

function loadCart() {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCart(cart) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function loadStoredReviews() {
  try {
    return JSON.parse(window.localStorage.getItem(REVIEW_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredReviews(reviews) {
  window.localStorage.setItem(REVIEW_KEY, JSON.stringify(reviews));
}

function getRouteProductData() {
  if (route.type !== "product") return null;
  return getProductPageData(route.categorySlug, route.productSlug);
}

function buildStateFromLocation() {
  const baseState = {
    cart: loadCart(),
    dialogs: {},
    search: {
      query: "",
      mode: "catalog",
    },
    menuCategorySlug: null,
    flashMessage: "",
  };

  if (route.type === "category") {
    const params = new URLSearchParams(window.location.search);
    const applied = parseCategorySearchParams(params);
    return {
      ...baseState,
      category: {
        searchParams: params,
        applied,
        draft: structuredClone(applied),
        selectedProductIds: [],
      },
    };
  }

  if (route.type === "product") {
    const productData = getRouteProductData();
    const storedReviews = loadStoredReviews();
    const userReviews = storedReviews[productData.product.id] || [];
    return {
      ...baseState,
      product: {
        activeTab: normalizeTab(window.location.hash.replace("#", "")),
        activeImageIndex: 0,
        reviewSort: "newest",
        reviews: [...productData.reviews, ...userReviews],
      },
    };
  }

  return baseState;
}

function normalizeTab(value) {
  return ["reviews", "description", "additional"].includes(value) ? value : "description";
}

function syncBodyState() {
  const open = Object.values(state.dialogs || {}).some((value) => Boolean(value));
  document.body.classList.toggle("catalog-ui-locked", open);
}

function render() {
  appRoot.innerHTML = renderCatalogApp(ctx, state);
  syncBodyState();
}

function closeAllDialogs() {
  state.dialogs = {
    search: false,
    cart: false,
    assistant: false,
    menu: false,
    filters: false,
    account: false,
    quickViewProductId: null,
    priceTiersProductId: null,
  };
}

function setDialog(dialog, value) {
  closeAllDialogs();
  if (dialog === "quickViewProductId" || dialog === "priceTiersProductId") {
    state.dialogs[dialog] = value;
  } else {
    state.dialogs[dialog] = value;
  }
  render();
}

function updateCart(productId, delta = 1) {
  const current = state.cart[productId] || 0;
  const next = current + delta;
  if (next <= 0) {
    delete state.cart[productId];
  } else {
    state.cart[productId] = next;
  }
  saveCart(state.cart);
}

function addToCart(productId) {
  if (state.cart[productId]) {
    setDialog("cart", true);
    return;
  }
  updateCart(productId, 1);
  state.flashMessage = "Позиция добавлена в корзину";
  render();
}

function clearFlashSoon() {
  if (!state.flashMessage) return;
  window.setTimeout(() => {
    state.flashMessage = "";
    render();
  }, 1500);
}

function pushCategoryState() {
  const params = new URLSearchParams();
  const applied = state.category.applied;
  if (applied.sort !== "popularity-desc") params.set("sort", applied.sort);
  if (applied.display !== "grid") params.set("display", applied.display);
  if (applied.page !== 1) params.set("page", String(applied.page));
  if (applied.priceMin !== null || applied.priceMax !== null) {
    params.set("price", `${applied.priceMin ?? ""}-${applied.priceMax ?? ""}`);
  }
  if (applied.stockStatuses.length) params.set("stock", applied.stockStatuses.join(","));
  if (applied.badges.length) params.set("badges", applied.badges.join(","));
  Object.entries(applied.attributes).forEach(([key, values]) => {
    if (values.length) params.set(`f_${key}`, values.join(","));
  });
  const query = params.toString();
  const href = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.pushState({}, "", href);
  state.category.searchParams = new URLSearchParams(params);
}

function rerenderCategoryWithUrl() {
  const params = new URLSearchParams(window.location.search);
  const applied = parseCategorySearchParams(params);
  state.category = {
    ...state.category,
    searchParams: params,
    applied,
    draft: structuredClone(applied),
    selectedProductIds: [],
  };
  render();
}

function toggleDraftValue(kind, value, key) {
  const draft = state.category.draft;
  if (kind === "stock") {
    draft.stockStatuses = toggleListValue(draft.stockStatuses, value);
  }
  if (kind === "badge") {
    draft.badges = toggleListValue(draft.badges, value);
  }
  if (kind === "attribute") {
    draft.attributes[key] = toggleListValue(draft.attributes[key] || [], value);
  }
  render();
}

function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function selectAllVisible(checked) {
  const data = getCategoryPageData(route.categorySlug, state.category.searchParams);
  state.category.selectedProductIds = checked ? data.pageItems.map((item) => item.id) : [];
  render();
}

function toggleSelectedProduct(productId, checked) {
  const current = new Set(state.category.selectedProductIds);
  if (checked) current.add(productId);
  if (!checked) current.delete(productId);
  state.category.selectedProductIds = Array.from(current);
  render();
}

function submitReview(form) {
  const productData = getRouteProductData();
  const stored = loadStoredReviews();
  const productReviews = stored[productData.product.id] || [];
  const payload = {
    id: `user-${Date.now()}`,
    productId: productData.product.id,
    author: form.get("author"),
    rating: Number(form.get("rating")),
    pros: form.get("pros"),
    cons: form.get("cons"),
    comment: form.get("comment"),
    createdAt: new Date().toISOString().slice(0, 10),
    verified: false,
    helpful: 0,
    media: [],
  };
  stored[productData.product.id] = [payload, ...productReviews];
  saveStoredReviews(stored);
  state.product.reviews = [payload, ...state.product.reviews];
  state.product.activeTab = "reviews";
  state.flashMessage = "Отзыв добавлен";
  render();
  clearFlashSoon();
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "open-search") {
    setDialog("search", true);
    return;
  }
  if (action === "open-cart") {
    setDialog("cart", true);
    return;
  }
  if (action === "open-menu") {
    state.menuCategorySlug = null;
    setDialog("menu", true);
    return;
  }
  if (action === "open-account") {
    window.location.href = `${ctx.siteRoot}cabinet/login/`;
    return;
  }
  if (action === "open-assistant") {
    setDialog("assistant", true);
    return;
  }
  if (action === "open-filters") {
    setDialog("filters", true);
    return;
  }
  if (action === "close-filters") {
    state.dialogs.filters = false;
    render();
    return;
  }
  if (action === "close-dialog") {
    closeAllDialogs();
    render();
    return;
  }
  if (action === "open-quick-view") {
    setDialog("quickViewProductId", target.dataset.productId);
    return;
  }
  if (action === "close-quick-view") {
    state.dialogs.quickViewProductId = null;
    render();
    return;
  }
  if (action === "open-price-tiers") {
    setDialog("priceTiersProductId", target.dataset.productId);
    return;
  }
  if (action === "close-price-tiers") {
    state.dialogs.priceTiersProductId = null;
    render();
    return;
  }
  if (action === "toggle-cart") {
    addToCart(target.dataset.productId);
    clearFlashSoon();
    return;
  }
  if (action === "remove-from-cart") {
    delete state.cart[target.dataset.productId];
    saveCart(state.cart);
    render();
    return;
  }
  if (action === "change-qty") {
    updateCart(target.dataset.productId, Number(target.dataset.delta || "0"));
    render();
    return;
  }
  if (action === "set-display" && route.type === "category") {
    state.category.applied.display = target.dataset.value;
    state.category.draft.display = target.dataset.value;
    state.category.applied.page = 1;
    pushCategoryState();
    render();
    return;
  }
  if (action === "reset-filters" && route.type === "category") {
    const reset = createDefaultCategoryDraft(new URLSearchParams());
    reset.sort = state.category.applied.sort;
    reset.display = state.category.applied.display;
    state.category.draft = structuredClone(reset);
    state.category.applied = structuredClone(reset);
    pushCategoryState();
    render();
    return;
  }
  if (action === "apply-filters" && route.type === "category") {
    state.category.applied = structuredClone(state.category.draft);
    state.category.applied.page = 1;
    state.category.selectedProductIds = [];
    pushCategoryState();
    closeAllDialogs();
    render();
    return;
  }
  if (action === "toggle-selection" && route.type === "category") {
    toggleSelectedProduct(target.dataset.productId, target.checked);
    return;
  }
  if (action === "select-all-visible" && route.type === "category") {
    selectAllVisible(target.checked);
    return;
  }
  if (action === "bulk-add-to-cart" && route.type === "category") {
    state.category.selectedProductIds.forEach((productId) => updateCart(productId, state.cart[productId] ? 0 : 1));
    saveCart(state.cart);
    state.flashMessage = "Выбранные позиции добавлены в корзину";
    render();
    clearFlashSoon();
    return;
  }
  if (action === "set-tab" && route.type === "product") {
    state.product.activeTab = target.dataset.tab;
    window.history.replaceState({}, "", `${window.location.pathname}#${target.dataset.tab}`);
    render();
    return;
  }
  if (action === "set-image" && route.type === "product") {
    state.product.activeImageIndex = Number(target.dataset.index || "0");
    render();
    return;
  }
  if (action === "set-search-mode") {
    state.search.mode = target.dataset.value;
    render();
    return;
  }
  if (action === "open-menu-category") {
    state.menuCategorySlug = target.dataset.categorySlug;
    render();
    return;
  }
  if (action === "back-menu-category") {
    state.menuCategorySlug = null;
    render();
    return;
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.matches('[data-action="search-input"]')) {
    state.search.query = target.value;
    render();
    return;
  }

  if (route.type !== "category") return;

  if (target.matches('[data-filter-kind="price-min"]')) {
    state.category.draft.priceMin = target.value ? Number(target.value) : null;
    render();
    return;
  }
  if (target.matches('[data-filter-kind="price-max"]')) {
    state.category.draft.priceMax = target.value ? Number(target.value) : null;
    render();
    return;
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.matches('[data-action="set-sort"]') && route.type === "category") {
    state.category.applied.sort = target.value;
    state.category.draft.sort = target.value;
    state.category.applied.page = 1;
    pushCategoryState();
    render();
    return;
  }

  if (target.matches('[data-action="set-review-sort"]') && route.type === "product") {
    state.product.reviewSort = target.value;
    render();
    return;
  }

  if (route.type === "category" && target.matches('[data-filter-kind="stock"]')) {
    toggleDraftValue("stock", target.value);
    return;
  }

  if (route.type === "category" && target.matches('[data-filter-kind="badge"]')) {
    toggleDraftValue("badge", target.value);
    return;
  }

  if (route.type === "category" && target.matches('[data-filter-kind="attribute"]')) {
    toggleDraftValue("attribute", target.value, target.dataset.filterKey);
  }
}

function handleSubmit(event) {
  const form = event.target;
  if (form.matches("[data-header-search]")) {
    event.preventDefault();
    const input = form.querySelector('input[type="search"]');
    state.search.query = input.value.trim();
    setDialog("search", true);
    return;
  }

  if (form.matches("[data-review-form]") && route.type === "product") {
    event.preventDefault();
    submitReview(new FormData(form));
  }
}

window.addEventListener("popstate", () => {
  state = buildStateFromLocation();
  render();
});

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("submit", handleSubmit);

render();
