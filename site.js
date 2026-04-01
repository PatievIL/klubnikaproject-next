document.addEventListener("DOMContentLoaded", () => {
  const siteScript = document.querySelector('script[src*="site.js"]');
  const root = (siteScript?.getAttribute("src") || "./site.js").replace(/site\.js(?:\?.*)?$/, "") || "./";
  const hasTopbar = Boolean(document.querySelector(".topbar"));
  const hasFooter = Boolean(document.querySelector(".footer-main"));

  classifyPage(hasTopbar);

  if (!hasTopbar) {
    injectCompactShell(root);
  }

  if (!hasFooter) {
    injectSharedFooter(root);
  } else {
    normalizeExistingFooter();
  }

  normalizeSecondaryCtas();
  injectUiControls();
  markActiveCompactNav();
  bindTopbarMenus();
  bindUiControls();
  applyStoredUi();
  bindDraftForms();
});

function classifyPage(hasTopbar) {
  if (!hasTopbar) document.body.classList.add("secondary-page");
  if (document.querySelector(".page-hero")) document.body.classList.add("category-page");
  if (document.querySelector(".product-layout")) document.body.classList.add("product-page");
}

function injectCompactShell(root) {
  const shell = document.createElement("header");
  shell.className = "compact-shell";
  shell.innerHTML = `
    <div class="container">
      <div class="compact-shell-inner">
        <div class="compact-topbar">
          <a class="compact-brand" href="${root}">
            <img class="compact-brand-logo" src="${root}assets/brand-berry-beige.svg" alt="Знак Klubnika Project" />
            <div class="compact-brand-copy">
              <div class="compact-brand-title">
                <span>Klubnika</span>
                <span>Project</span>
              </div>
              <div class="compact-brand-note">Расчёт, комплектация и запуск клубничных ферм</div>
            </div>
          </a>
          <nav class="compact-nav" aria-label="Основная навигация">
            <a href="${root}">Главная</a>
            <a href="${root}study/">Решения</a>
            <a href="${root}shop/">Каталог</a>
            <a href="${root}calc/">Калькулятор</a>
          </nav>
        </div>
      </div>
    </div>
  `;

  document.body.insertBefore(shell, document.body.firstChild);
}

function injectSharedFooter(root) {
  const footer = document.createElement("footer");
  footer.className = "footer-main";
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-card">
          <h3>Klubnika Project</h3>
          <p class="sublead">Расчёт, магазин, подбор и сопровождение для клубничных ферм в контролируемой среде.</p>
        </div>
        <div class="footer-card">
          <h3>Сценарии</h3>
          <ul class="footer-links">
            <li><a href="${root}farm/">Расчёт фермы</a></li>
            <li><a href="${root}shop/">Магазин</a></li>
            <li><a href="${root}study/">Сопровождение</a></li>
            <li><a href="${root}klubhack/">Клубничный Хак</a></li>
            <li><a href="${root}seeds/">Посадочный материал</a></li>
          </ul>
        </div>
        <div class="footer-card">
          <h3>Информация</h3>
          <ul class="footer-links">
            <li><a href="https://klubnikaproject.ru/docs/offero">Оферта</a></li>
            <li><a href="https://klubnikaproject.ru/docs/warrenty">Гарантия на товары</a></li>
            <li><a href="https://klubnikaproject.ru/docs/policy">Политика конфиденциальности</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-row">
        <div>© Klubnika Project</div>
        <div>Расчёт, магазин, подбор и сопровождение решений</div>
      </div>
    </div>
  `;

  document.body.appendChild(footer);
}

function normalizeExistingFooter() {
  const footer = document.querySelector(".footer-main");
  if (!footer) return;

  const primaryHeading = footer.querySelector(".footer-card h3");
  if (primaryHeading) {
    primaryHeading.textContent = "Klubnika Project";
  }

  const footerRowCells = footer.querySelectorAll(".footer-row > div");
  if (footerRowCells[0]) footerRowCells[0].textContent = "© Klubnika Project";
  if (footerRowCells[1]) footerRowCells[1].textContent = "Расчёт, магазин, подбор и сопровождение решений";
}

function normalizeSecondaryCtas() {
  const textMap = new Map([
    ["Открыть товар", "Смотреть позицию"],
    ["Открыть карточку", "Смотреть позицию"],
    ["Смотреть пример карточки", "Смотреть пример позиции"],
    ["Проверить типовой светильник", "Смотреть типовую позицию"]
  ]);

  document.querySelectorAll(".btn").forEach((button) => {
    const text = button.textContent.trim().replace(/\s+/g, " ");
    if (textMap.has(text)) {
      button.textContent = textMap.get(text);
    }
  });
}

function injectUiControls() {
  const topbar = document.querySelector(".topbar");
  if (topbar && !topbar.querySelector(".topbar-tools")) {
    const tools = document.createElement("div");
    tools.className = "topbar-tools";
    tools.innerHTML = buildUiControlsMarkup();
    const toggle = topbar.querySelector(".nav-toggle");
    if (toggle) {
      topbar.insertBefore(tools, toggle);
    } else {
      topbar.appendChild(tools);
    }
  }

  const compactTopbar = document.querySelector(".compact-topbar");
  if (compactTopbar && !compactTopbar.querySelector(".compact-tools")) {
    const tools = document.createElement("div");
    tools.className = "compact-tools";
    tools.innerHTML = buildUiControlsMarkup();
    const nav = compactTopbar.querySelector(".compact-nav");
    if (nav) {
      compactTopbar.insertBefore(tools, nav);
    } else {
      compactTopbar.appendChild(tools);
    }
  }
}

function buildUiControlsMarkup() {
  return `
    <div class="ui-switch" role="group" aria-label="Language switch">
      <button class="ui-switch-btn" type="button" data-site-lang="ru">RU</button>
      <button class="ui-switch-btn" type="button" data-site-lang="en">EN</button>
    </div>
    <div class="ui-switch" role="group" aria-label="Theme switch">
      <button class="ui-switch-btn ui-switch-btn-theme" type="button" data-site-theme="light" title="Light theme" aria-label="Light theme">◐</button>
      <button class="ui-switch-btn ui-switch-btn-theme" type="button" data-site-theme="dark" title="Dark theme" aria-label="Dark theme">◼</button>
    </div>
  `;
}

function bindUiControls() {
  document.querySelectorAll("[data-site-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.siteLang || "ru";
      window.localStorage.setItem("kp-lang", lang);
      applyLanguage(lang);
    });
  });

  document.querySelectorAll("[data-site-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.siteTheme || "light";
      window.localStorage.setItem("kp-theme", theme);
      applyTheme(theme);
    });
  });
}

function applyStoredUi() {
  const storedTheme = window.localStorage.getItem("kp-theme");
  const storedLang = window.localStorage.getItem("kp-lang");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(storedTheme || (prefersDark ? "dark" : "light"));
  applyLanguage(storedLang || "ru");
}

function applyTheme(theme) {
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = normalizedTheme;
  document.querySelectorAll("[data-site-theme]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.siteTheme === normalizedTheme);
  });
}

function applyLanguage(lang) {
  const normalizedLang = lang === "en" ? "en" : "ru";
  document.documentElement.lang = normalizedLang;
  document.body.dataset.language = normalizedLang;

  translateTextNodes(normalizedLang);
  translateLeafNodes(normalizedLang);
  translateFieldAttributes(normalizedLang);
  translateDocumentTitle(normalizedLang);
  updateAriaLabels(normalizedLang);
  updateUiControlState(normalizedLang);
  syncBriefButtons();
}

function translateTextNodes(lang) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest("script, style, noscript")) return NodeFilter.FILTER_REJECT;
      if (!normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (node.__i18nOriginal === undefined) {
      node.__i18nOriginal = node.nodeValue;
    }

    const original = node.__i18nOriginal;
    const trimmed = normalizeText(original);
    const match = original.match(/^(\s*)(.*?)(\s*)$/s);
    const prefix = match?.[1] || "";
    const suffix = match?.[3] || "";
    const translated = lang === "en" ? TRANSLATIONS_EN[trimmed] : null;

    node.nodeValue = translated ? `${prefix}${translated}${suffix}` : original;
  }
}

function translateLeafNodes(lang) {
  const translatable = document.querySelectorAll("h1, h2, h3, h4, p, a, button, span, strong, li, summary, option, label, small, div");

  translatable.forEach((element) => {
    if (element.closest("script, style")) return;
    if (element.children.length) return;

    if (!element.dataset.i18nOriginal) {
      element.dataset.i18nOriginal = element.textContent;
    }

    const original = element.dataset.i18nOriginal;
    const key = normalizeText(original);
    if (!key) return;

    if (lang === "en" && TRANSLATIONS_EN[key]) {
      element.textContent = TRANSLATIONS_EN[key];
    } else if (lang === "ru") {
      element.textContent = original;
    }
  });
}

function translateFieldAttributes(lang) {
  document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((field) => {
    if (!field.dataset.i18nPlaceholderOriginal) {
      field.dataset.i18nPlaceholderOriginal = field.getAttribute("placeholder") || "";
    }

    const original = field.dataset.i18nPlaceholderOriginal;
    const key = normalizeText(original);
    const translated = lang === "en" ? TRANSLATIONS_EN[key] : original;
    field.setAttribute("placeholder", translated || original);
  });
}

function translateDocumentTitle(lang) {
  if (!document.documentElement.dataset.i18nTitleOriginal) {
    document.documentElement.dataset.i18nTitleOriginal = document.title;
  }

  const original = document.documentElement.dataset.i18nTitleOriginal;
  const key = normalizeText(original);
  if (lang === "en" && TRANSLATIONS_EN[key]) {
    document.title = TRANSLATIONS_EN[key];
  } else {
    document.title = original;
  }
}

function updateAriaLabels(lang) {
  document.querySelectorAll(".nav-toggle").forEach((toggle) => {
    toggle.setAttribute("aria-label", lang === "en" ? "Open menu" : "Открыть меню");
  });

  document.querySelectorAll('[data-site-theme="light"]').forEach((button) => {
    const label = lang === "en" ? "Light theme" : "Светлая тема";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  document.querySelectorAll('[data-site-theme="dark"]').forEach((button) => {
    const label = lang === "en" ? "Dark theme" : "Тёмная тема";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function updateUiControlState(lang) {
  document.querySelectorAll("[data-site-lang]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.siteLang === lang);
  });
}

function syncBriefButtons() {
  document.querySelectorAll("[data-brief-button]").forEach((button) => {
    button.dataset.siteInitialLabel = button.textContent.trim();
  });
}

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function bindDraftForms() {
  document.querySelectorAll("[data-brief-form]").forEach((form) => {
    const button = form.querySelector("[data-brief-button]");
    const status = form.querySelector("[data-brief-status]");
    if (!button) return;

    button.addEventListener("click", async () => {
      const lines = buildBriefLines(form);
      const lang = document.documentElement.lang === "en" ? "en" : "ru";
      const idleLabel = button.dataset.siteInitialLabel || button.textContent.trim();

      if (!lines.length) {
        if (status) {
          status.textContent = lang === "en"
            ? "Fill in at least one field to prepare the brief."
            : "Заполните хотя бы одно поле, чтобы собрать вводные.";
        }
        return;
      }

      const title = form.dataset.briefForm || document.title;
      const text = [`${title}`, "", ...lines].join("\n");
      const popup = window.open("https://t.me/patiev_admin", "_blank", "noopener,noreferrer");
      const openedTelegram = Boolean(popup);
      const copied = await copyText(text);

      if (status) {
        if (copied && openedTelegram) {
          status.textContent = lang === "en"
            ? "The brief has been copied and Telegram opened in a new tab."
            : "Вводные скопированы, Telegram открыт в новой вкладке.";
        } else if (copied) {
          status.textContent = lang === "en"
            ? "The brief has been copied. Open Telegram and paste it there."
            : "Вводные скопированы. Откройте Telegram и вставьте их туда.";
        } else if (openedTelegram) {
          status.textContent = lang === "en"
            ? "Telegram is open. If the text did not copy, use the direct Telegram button and transfer the brief manually."
            : "Telegram открыт. Если текст не скопировался, откройте диалог и перенесите вводные вручную.";
        } else {
          status.textContent = lang === "en"
            ? "Automatic copy failed. Use the Telegram button or transfer the brief manually."
            : "Не удалось скопировать автоматически. Используйте кнопку Telegram или перенесите вводные вручную.";
        }
      }

      button.textContent = copied
        ? (lang === "en" ? "Copied and opened" : "Скопировано и открыто")
        : (lang === "en" ? "Prepare brief" : "Собрать вводные");
      window.setTimeout(() => {
        button.textContent = idleLabel;
      }, 1800);
    });
  });
}

function markActiveCompactNav() {
  const path = window.location.pathname || "/";
  const links = document.querySelectorAll(".compact-nav a");

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("http")) return;

    let targetPath = "";
    try {
      targetPath = new URL(href, window.location.href).pathname.replace(/index\.html$/, "");
    } catch {
      return;
    }

    const currentPath = path.replace(/index\.html$/, "");

    if (
      targetPath === "/study/" &&
      ["/farm/", "/study/", "/consultations/", "/klubhack/"].some((prefix) => currentPath.startsWith(prefix))
    ) {
      link.setAttribute("aria-current", "page");
      return;
    }

    if (
      targetPath === "/shop/" &&
      ["/shop/", "/seeds/"].some((prefix) => currentPath.startsWith(prefix))
    ) {
      link.setAttribute("aria-current", "page");
      return;
    }

    if (
      (targetPath === "/" && currentPath === "/") ||
      (targetPath !== "/" && currentPath.startsWith(targetPath))
    ) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function buildBriefLines(form) {
  return Array.from(form.querySelectorAll("input, select, textarea")).reduce((rows, field) => {
    if (field.tagName === "SELECT") {
      const firstOption = field.options[0]?.textContent?.trim();
      const currentValue = field.options[field.selectedIndex]?.textContent?.trim();
      if (!currentValue || currentValue === firstOption) return rows;
      rows.push(`${firstOption}: ${currentValue}`);
      return rows;
    }

    const value = field.value?.trim();
    if (!value) return rows;
    const label = field.getAttribute("placeholder") || field.name || "Поле";
    rows.push(`${label}: ${value}`);
    return rows;
  }, []);
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function bindTopbarMenus() {
  const topbars = document.querySelectorAll(".topbar");

  topbars.forEach((topbar) => {
    const toggle = topbar.querySelector(".nav-toggle");
    const nav = topbar.querySelector(".nav");
    const groups = topbar.querySelectorAll(".nav-group");

    if (!toggle || !nav) return;

    const isMobile = () => window.matchMedia("(max-width: 1100px)").matches;

    const closeGroups = () => {
      groups.forEach((group) => {
        group.classList.remove("is-open");
        const trigger = group.querySelector(".nav-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
    };

    const closeMenu = () => {
      topbar.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      closeGroups();
    };

    const openMenu = () => {
      topbar.classList.add("menu-open");
      toggle.setAttribute("aria-expanded", "true");
    };

    toggle.addEventListener("click", () => {
      if (topbar.classList.contains("menu-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    groups.forEach((group) => {
      const trigger = group.querySelector(".nav-trigger");
      if (!trigger) return;

      trigger.setAttribute("aria-expanded", "false");

      trigger.addEventListener("click", (event) => {
        if (!isMobile()) return;
        event.preventDefault();
        const willOpen = !group.classList.contains("is-open");
        closeGroups();
        if (willOpen) {
          group.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!topbar.contains(event.target)) {
        closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (!isMobile()) {
        closeMenu();
      }
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (isMobile()) closeMenu();
      });
    });
  });
}

const TRANSLATIONS_EN = {
  "Klubnika Project — расчёт, комплектация и запуск клубничных ферм": "Klubnika Project — farm planning, sourcing, and launch for strawberry farms",
  "Расчёт, комплектация и запуск клубничных ферм": "Farm planning, sourcing, and launch for strawberry farms",
  "Главная": "Home",
  "Решения": "Solutions",
  "Каталог": "Catalog",
  "Калькулятор": "Calculator",
  "Оставить заявку": "Get in touch",
  "Получить подбор": "Request selection",
  "Нужен разбор": "Need review",
  "Магазин решений для клубничных сити-ферм": "Solution shop for strawberry city farms",
  "Здесь есть свет, полив, стеллажи, субстрат, посадочный материал, расходники и готовые решения для запуска, дооснащения и обслуживания фермы.": "Here you can find lighting, irrigation, racks, substrate, planting material, consumables, and ready-made solutions for launch, upgrades, and farm maintenance.",
  "Часть товаров можно купить сразу. Часть лучше сначала подобрать под объект, чтобы не ошибиться в совместимости, составе и логике закупки.": "Some items can be bought right away. Others are better selected for the site first, so you do not make mistakes with compatibility, composition, or purchasing logic.",
  "Типовые товары, расходники, комплектующие и проектные решения для клубничной фермы.": "Standard products, consumables, components, and project solutions for a strawberry farm.",
  "Мелкие позиции идут в розничную логику, сложные решения — в подбор и смету.": "Small items follow a retail flow, while complex solutions go through selection and an estimate.",
  "Категория, карточка товара, запрос на подбор или расчёт комплекта под объект.": "A category, a product page, a selection request, or a kit estimate for the site.",
  "Если задача ещё не свелась к одному товару, лучше идти через категорию или подбор, а не угадывать по SKU.": "If the task has not narrowed down to one product yet, it is better to start with a category or selection instead of guessing by SKU.",
  "Здесь можно купить типовой товар, запросить состав комплекта или оставить задачу на разбор.": "Here you can buy a standard item, request a kit breakdown, or submit a task for review.",
  "Посмотреть живой интерфейс фермы": "View the live farm interface",
  "Климат, узлы, статус фермы и рабочие сигналы в одном окне.": "Climate, nodes, farm status, and operational signals in one interface.",
  "Контролируемые фермы клубники": "Controlled-environment strawberry farms",
  "Что здесь есть": "What is here",
  "Типовые товары, расходники, комплектующие и проектные решения для клубничной фермы.": "Standard products, consumables, components, and project solutions for a strawberry farm.",
  "Как здесь покупают": "How buying works",
  "Куда идти дальше": "Where to go next",
  "Смотреть позицию": "View item",
  "Расчёт фермы": "Farm estimate",
  "Состав комплекта, рамка бюджета и следующий шаг.": "System layout, budget range, and the right next step.",
  "Сопровождение": "Support",
  "Разбор действующей фермы, критических узлов и технологии.": "Analysis of an operating farm, critical nodes, and technology.",
  "Консультации": "Consultations",
  "Точечный разбор задачи, совместимости и следующего шага.": "Focused review of the task, compatibility, and the next step.",
  "Клубничный Хак": "Strawberry Hack",
  "База по клубнике в контролируемой среде без проектной сметы.": "Core strawberry know-how for controlled environment farming without a project estimate.",
  "Клубничный Хак — это практическая база по клубнике в контролируемой среде.": "Strawberry Hack is a practical foundation for strawberries in controlled environments.",
  "Магазин": "Shop",
  "Весь каталог решений для клубничной фермы.": "The full catalog of solutions for a strawberry farm.",
  "LED": "LED",
  "Светильники M23 и тепличные модели.": "M23 fixtures and greenhouse models.",
  "Полив": "Irrigation",
  "Комплектующие, узлы и типовые комплекты.": "Components, nodes, and standard kits.",
  "Стеллажи": "Racks",
  "Модули, каркасы и конструктив фермы.": "Modules, frames, and farm structure.",
  "Субстрат": "Substrate",
  "Grodan и корневая зона под controlled environment.": "Grodan and root-zone media for controlled environments.",
  "Семена и Frigo": "Seeds and Frigo",
  "Посадочный материал под фермерский запуск.": "Planting material for farm launches.",
  "© Klubnika Project": "© Klubnika Project",
  "Расчёт, магазин, подбор и сопровождение решений": "Planning, shopping, selection, and support",
  "Расчёт, магазин, подбор и сопровождение для клубничных ферм в контролируемой среде.": "Planning, shopping, selection, and support for strawberry farms in controlled environments.",
  "Сценарии": "Paths",
  "Информация": "Info",
  "Оферта": "Offer",
  "Гарантия на товары": "Product warranty",
  "Политика конфиденциальности": "Privacy policy",
  "Клубничные фермы в контролируемой среде": "Controlled-environment strawberry farms",
  "Быстрый выбор": "Quick choice",
  "Куда идти дальше": "Where to go next",
  "Что получите": "What you get",
  "Кому подходит": "Who it fits",
  "Результат": "Result",
  "FAQ": "FAQ",
  "Клубничная ферма: расчёт, комплектация и запуск в одной логике": "Strawberry farm: estimate, sourcing, and launch in one workflow",
  "КлубникаПро помогает не гадать по отдельным товарам, а быстро понять, какой путь нужен именно вам: расчёт фермы, магазин, подбор решения или сопровождение действующего проекта.": "KlubnikaPro helps you stop guessing by individual products and quickly understand the right path: farm estimate, shop, solution selection, or support for an operating project.",
  "Здесь не пытаются продать всё сразу. Сначала задача разводится по правильному сценарию, потом вы идёте в расчёт, каталог, курс или работу по проекту.": "This site does not try to sell everything at once. First, your task is routed to the right path, then you move into estimate, catalog, course, or project work.",
  "Рассчитать ферму": "Estimate the farm",
  "Перейти в магазин": "Go to the shop",
  "Нужна консультация по задаче": "Need a consultation",
  "Нужна базовая система по технологии": "Need a core technology system",
  "Запуск и расчёт": "Launch and estimate",
  "Когда нужно понять состав фермы, очередность закупки и рамку бюджета.": "When you need to understand the farm layout, purchase order, and budget range.",
  "Магазин и расходники": "Shop and consumables",
  "Когда задача понятна и нужно быстро перейти к выбору категории или товара.": "When the task is clear and you need to move quickly to a category or product.",
  "Подбор и консультация": "Selection and consultation",
  "Когда проект уже работает или ошибка в одном узле тянет за собой всю схему.": "When the project is already running or one faulty node affects the whole system.",
  "Выберите маршрут, а не случайный переход": "Choose a route, not a random click",
  "Перейти к расчёту": "Open farm estimate",
  "Открыть сопровождение": "Open support",
  "Открыть магазин": "Open shop",
  "Получить состав комплекта": "Request kit composition",
  "Нужна системная база по клубнике, а не разбор одного объекта?": "Need a system-level strawberry foundation, not a review of just one site?",
  "Открыть курс": "Open the course",
  "Если нужен разбор проекта": "If you need a project review",
  "КлубникаПро собирает ферму как систему, а не как набор разрозненных покупок": "KlubnikaPro builds the farm as a system, not as a set of disconnected purchases",
  "Не общий агрорынок, а рабочие узлы и решения для клубничной фермы": "Not a generic agri market, but working nodes and solutions for strawberry farms",
  "Смотреть категории": "Browse categories",
  "Оставить задачу на подбор": "Submit a selection task",
  "Готовые решения для старта, дооснащения и замены узлов": "Ready-made solutions for launch, upgrade, and node replacement",
  "Смотреть готовые решения": "View ready-made solutions",
  "Открыть карточку": "Open product page",
  "Открыть решение": "Open solution",
  "Открыть решения": "Open solutions",
  "Сначала собираете вводные, потом сразу видите рамку проекта": "First you provide the inputs, then you immediately see the project outline",
  "Открыть калькулятор": "Open calculator",
  "Запросить расчёт под проект": "Request a project estimate",
  "Запуск фермы по шагам: от вводных до запуска": "Farm launch step by step: from inputs to launch",
  "Типовые проектные ситуации, в которых уже была практическая польза": "Typical project situations where the approach has already proven useful",
  "КлубникаПро — это не просто каталог товаров": "KlubnikaPro is more than a product catalog",
  "Оставить задачу": "Submit a task",
  "Вопросы, которые нужно закрыть до заявки": "Questions to resolve before you submit a request",
  "Опишите задачу в четырёх вводных, а мы направим её в нужный сценарий": "Describe the task in four inputs and we will route it to the right path",
  "Скопировать вводные": "Copy brief",
  "Собрать вводные и открыть Telegram": "Prepare brief and open Telegram",
  "Собрать задачу и открыть Telegram": "Prepare task and open Telegram",
  "Собрать запрос и открыть Telegram": "Prepare request and open Telegram",
  "Открыть Telegram": "Open Telegram",
  "Кнопка соберёт вводные, скопирует их и сразу откроет рабочий Telegram. Рабочий Telegram:": "The button will prepare the brief, copy it, and open the working Telegram right away. Working Telegram:",
  "Магазин решений для клубничной фермы": "Solution shop for a strawberry farm",
  "Выбрать свой сценарий": "Choose your path",
  "Есть действующая ферма и нужен разбор": "You already have a farm and need a review",
  "Что здесь есть": "What is here",
  "Как здесь покупают": "How buying works here",
  "Куда идти дальше": "Where to go next",
  "Не начинайте с каталога, пока не понятен сценарий": "Do not start from the catalog until the scenario is clear",
  "Перейти к расчёту фермы": "Go to farm estimate",
  "Открыть консультации": "Open consultations",
  "Открыть категории": "Open categories",
  "Открыть линию решений": "Open the solution line",
  "Смотреть витрину": "View the catalog grid",
  "В категории стоит идти только когда задача уже сузилась до узла": "Categories work only when the task is already narrowed down to a node",
  "Открыть категорию": "Open category",
  "Открыть раздел": "Open section",
  "Смотреть решения": "View solutions",
  "Перед покупкой важнее понять роль узла в системе, чем название товара": "Before buying, it matters more to understand the node’s role in the system than the product name",
  "Получить консультацию": "Get a consultation",
  "Нужен расчёт фермы": "Need a farm estimate",
  "Витрина нужна тем, у кого задача уже дошла до категории или карточки": "The grid is for people whose task has already narrowed down to a category or product page",
  "Проверить совместимость": "Check compatibility",
  "Открыть товар": "Open product",
  "Получить состав и смету": "Get composition and estimate",
  "Запросить состав": "Request composition",
  "Сравнить сорт": "Compare variety",
  "Открыть материал": "Open material",
  "Обсудить модуль": "Discuss the module",
  "Почему здесь проще не ошибиться": "Why it is easier not to make mistakes here",
  "Как устроены наличие, отгрузка и проектные позиции": "How availability, shipment, and project positions are handled",
  "Если сомневаетесь, не тратьте время на лишние переходы по витрине": "If you are unsure, do not waste time on extra moves through the grid",
  "Что важно понять до оформления заявки или заказа": "What matters before you place a request or order",
  "Расчёт клубничной фермы под ваш объект": "Strawberry farm estimate for your site",
  "Оставить вводные на расчёт": "Submit estimate inputs",
  "Есть задачи, которые уже дороже решать через разрозненные покупки": "Some tasks are already more expensive to solve through fragmented purchases",
  "После расчёта понятно, из чего состоит ферма и что считать дальше": "After the estimate, it becomes clear what the farm consists of and what to calculate next",
  "На выходе нужна не общая идея, а рабочая рамка проекта": "The outcome should not be a vague idea, but a working project framework",
  "После расчёта реализация проекта идёт по понятной последовательности": "After the estimate, implementation follows a clear sequence",
  "Что важно понять до заявки на расчёт": "What matters before requesting an estimate",
  "Оставьте вводные по объекту и получите расчёт фермы": "Leave your site inputs and get a farm estimate",
  "Сопровождение клубничной фермы: когда одной покупки и одной консультации уже мало": "Strawberry farm support: when one purchase and one consultation are not enough",
  "Сопровождение нужно там, где цена ошибки уже ощутима для проекта": "Support is needed where the cost of a mistake is already tangible for the project",
  "Сопровождение нужно, когда одна консультация уже не закрывает задачу": "Support is needed when a single consultation no longer covers the task",
  "Разбираем не всё про ферму, а узлы, где реально теряются деньги": "We do not review everything about the farm, only the nodes where money is actually being lost",
  "Если вам нужна базовая система по клубнике, а не разбор проекта, для этого есть Клубничный Хак": "If you need a core system on strawberry farming rather than a project review, use Strawberry Hack",
  "Открыть страницу курса": "Open the course page",
  "Если нужен именно разбор задачи": "If you need a focused task review",
  "Сопровождение должно быть понятным заранее": "Support must be clear in advance",
  "Где сопровождение реально добавляет ценность": "Where support adds real value",
  "Что важно понять до заявки": "What matters before you submit a request",
  "Опишите ситуацию по ферме, а мы предложим формат работы": "Describe the farm situation and we will suggest the right working format",
  "Скопировать задачу": "Copy task",
  "Консультации по клубничной ферме: когда нужен точный разбор без длинного сопровождения": "Consultations for a strawberry farm: when you need a precise review without long-term support",
  "Записаться на консультацию": "Book a consultation",
  "Записаться": "Sign up",
  "Клубничный Хак: практический курс по выращиванию клубники в контролируемой среде": "Strawberry Hack: a practical course on growing strawberries in controlled environments",
  "Записаться на курс": "Join the course",
  "Смотреть программу": "View the program",
  "Курс нужен тем, кому нужна системная база, а не разовый ответ на один объект": "The course is for people who need a system-level foundation, not a one-off answer for one site",
  "После курса у вас будет не набор видео, а рабочая логика": "After the course, you will have not just videos, but a working logic",
  "Модули собраны вокруг полного цикла: от запуска до масштабирования": "The modules cover the full cycle: from launch to scaling",
  "Что важно понять перед записью на курс": "What matters before joining the course",
  "Оставьте контакт и получите программу курса": "Leave your contact and receive the course program",
  "Скопировать запрос": "Copy request",
  "Получите предварительный состав фермы и рамку экономики под ваши вводные": "Get a preliminary farm composition and an economic outline based on your inputs",
  "Предварительный состав фермы и рамка экономики без длинной анкеты": "A preliminary farm composition and economic outline without a long form",
  "Калькулятор нужен, чтобы быстро увидеть состав фермы по узлам, порядок цифр по смете и понять, где хватает типовой рамки, а где уже нужен разговор по объекту.": "The calculator helps you quickly see the farm by nodes, the order of magnitude in the estimate, and understand where a standard outline is enough and where a site-specific discussion is already needed.",
  "Он не заменяет проектный расчёт, но убирает угадывание на старте и помогает быстрее перейти к смете, подбору или разбору действующей схемы.": "It does not replace a project estimate, but removes guesswork at the start and helps you move faster to an estimate, selection, or a review of the current setup.",
  "Начать расчёт": "Start the estimate",
  "Сначала понять, что я получу": "See what I get first",
  "Есть действующая ферма и нужен точный разбор": "Have an operating farm and need a precise review",
  "Не “доступ к калькулятору”, а понятную рамку проекта": "Not “access to a calculator”, but a clear project outline",
  "Короткий поток без длинной анкеты и лишних полей": "A short flow without a long questionnaire or unnecessary fields",
  "Сначала отвечаете на несколько вопросов, потом сразу видите рамку проекта": "Answer a few questions first, then immediately see the project outline",
  "Назад": "Back",
  "Продолжить расчёт": "Continue the estimate",
  "Скопировать ссылку": "Copy link",
  "Сбросить расчёт": "Reset estimate",
  "Если хотите передать расчёт вручную": "If you want to hand the estimate off manually",
  "Скопируйте вводные и сразу отправьте их в рабочий Telegram. Так вы не потеряете расчёт и быстрее перейдёте к следующему шагу.": "Copy the brief and send it straight to the working Telegram. This way you do not lose the estimate and move to the next step faster.",
  "Открыть Telegram": "Open Telegram",
  "Перейти к проектному расчёту": "Go to project estimate",
  "Вот что уже видно по вашим вводным": "Here is what is already visible from your inputs",
  "Рамка зафиксирована. Теперь важен правильный следующий шаг": "The outline is fixed. Now the right next step matters",
  "Маршрут уже начинает читаться по текущим вводным": "The route is already becoming clear from the current inputs",
  "Открыть проектный расчёт": "Open project estimate",
  "Сценарии по урожайности и денежному потоку модели": "Yield and cash-flow scenarios for the model",
  "Скопировать вводные": "Copy brief",
  "Если проект сложный или объект уже работает, калькулятор — это только первый шаг": "If the project is complex or the site is already running, the calculator is only the first step",
  "Обсудить нестандартный проект": "Discuss a non-standard project",
  "Если хотите быстро понять состав проекта и порядок цифр — начните с расчёта": "If you want to quickly understand the project composition and order of magnitude, start with the estimate",
  "Открыть расчёт под объект": "Open estimate for your site",
  "Посадочный материал и сорта для клубничной фермы": "Planting material and varieties for a strawberry farm",
  "Смотреть пример карточки": "View sample product page",
  "Обсудить подбор сорта": "Discuss variety selection",
  "Сорт и посадочный материал смотрят не отдельно, а в связке с циклом фермы": "Variety and planting material should not be viewed separately, but as part of the farm cycle",
  "Сверить fit по ферме": "Check fit for the farm",
  "Смотреть Frigo": "View Frigo",
  "Все позиции, которые были в старом каталоге семян": "All positions that were listed in the old seed catalog",
  "Имя": "Name",
  "Telegram / WhatsApp / телефон": "Telegram / WhatsApp / phone",
  "Контакт для связи": "Contact info",
  "Площадь / тип проекта / стадия": "Area / project type / stage",
  "Опишите ситуацию: что уже сделано, где сейчас главная проблема и какой результат нужен": "Describe the situation: what has already been done, what the main issue is now, and what result you need",
  "Площадь / масштаб проекта": "Area / project scale",
  "Опишите ситуацию по ферме, узлу или подбору": "Describe the farm, node, or selection task",
  "Что нужно: расчёт / подбор / магазин / консультация": "What you need: estimate / selection / shop / consultation",
  "Формат интереса": "Preferred format",
  "Разовая консультация": "One-off consultation",
  "Долгосрочное сопровождение": "Long-term support",
  "Нужна рекомендация по формату": "Need a format recommendation",
  "Что это даёт клиенту": "What this gives the client",
  "Запускаю ферму": "Launching a farm",
  "Уже выращиваю": "Already growing",
  "Нужны расходники и оборудование": "Need supplies and equipment",
  "Нужен расчёт и состав комплекта": "Need an estimate and kit composition",
  "Свет под ярус, зону или проект": "Light for a tier, zone, or project",
  "Подача раствора и корневая зона": "Solution delivery and the root zone",
  "Компоновка фермы и экономика площади": "Farm layout and area economics",
  "Основа для корневой зоны": "Root-zone base",
  "Семена, рассада, frigo": "Seeds, seedlings, frigo",
  "Когда проблема уже не только в товаре": "When the problem is no longer just the product",
  "Модуль для первого запуска": "Module for the first launch",
  "Светильник M23 для яруса": "M23 light for a tier",
  "Комплект полива под объект": "Irrigation kit for the site",
  "Стеллажная система или модуль": "Rack system or module",
  "На выходе не одна цифра, а рабочая рамка": "The output is not one number, but a working outline",
  "Сбор вводных": "Input collection",
  "Расчёт и подбор": "Estimate and selection",
  "Комплектация и доставка": "Sourcing and delivery",
  "Монтаж и запуск": "Installation and launch",
  "Запуск новой конфигурации фермы": "Launching a new farm configuration",
  "Действующая ферма с нестабильным результатом": "An operating farm with unstable results",
  "Дооснащение без полной пересборки": "Upgrading without a full rebuild",
  "Собрать вводные": "Prepare the brief",
  "Есть задачи, которые уже дороже решать через разрозненные покупки": "Some tasks are already too expensive to solve through fragmented purchases",
  "Запуск с нуля": "Launch from scratch",
  "Пересборка схемы": "Rebuilding the scheme",
  "Рост и новая очередь": "Growth and a new phase",
  "Нужен состав комплекта": "Need the kit composition",
  "Стеллажная схема": "Rack layout",
  "Свет и полив": "Lighting and irrigation",
  "Субстрат и посадочный материал": "Substrate and planting material",
  "Состав и смета": "Composition and estimate",
  "Коммерческая рамка": "Commercial outline",
  "Переход в сопровождение": "Move into support",
  "Чем точнее вводные, тем полезнее расчёт": "The more precise the inputs, the more useful the estimate",
  "Расчёт не заменяет реальность объекта": "An estimate does not replace the reality of the site",
  "Проектирование фермы": "Farm design",
  "Сборка заказа": "Order assembly",
  "Доставка": "Delivery",
  "Рамку комплекта": "A kit outline",
  "Собрать вводные по объекту": "Prepare the site brief",
  "Критический этап": "Critical stage",
  "Пересборка и рост": "Rebuild and growth",
  "Не отдельные советы, а рабочую логику решений": "Not isolated tips, but a working decision logic",
  "Свет, климат, VPD": "Light, climate, VPD",
  "Полив и субстрат": "Irrigation and substrate",
  "Фазы растения и ягода": "Plant stages and berry quality",
  "Запуск и пересборка": "Launch and rebuild",
  "Подбор узлов и комплектов": "Selection of nodes and kits",
  "Приоритеты и внедрение": "Priorities and implementation",
  "Когда нужен точный разбор одной задачи": "When one task needs a precise review",
  "Когда проект нужно вести не один день": "When the project needs more than a one-day intervention",
  "Понятная логика действий": "A clear action logic",
  "Более управляемая логика проекта": "A more controllable project logic",
  "Диагностика": "Diagnostics",
  "План действий": "Action plan",
  "Сопровождение внедрения": "Implementation support",
  "Ферма уже работает, но результат нестабилен": "The farm is already running, but the result is unstable",
  "Проект в запуске, цена ошибки уже высокая": "The project is launching and the cost of a mistake is already high",
  "Нужно пройти критический этап без хаоса": "You need to pass a critical stage without chaos",
  "Один точный вопрос": "One precise question",
  "Несколько связанных решений": "Several connected decisions",
  "Запускаю ферму с нуля": "Launching a farm from scratch",
  "Ферма уже работает": "The farm is already operating",
  "Нужен типовой товар или расходник": "Need a standard product or consumable",
  "Нужен узел, модуль или комплект": "Need a node, module, or kit",
  "Комплект для запуска фермы": "Farm launch kit",
  "Светильник M23 для ряда или яруса": "M23 light for a row or tier",
  "Полив под проект или зону": "Irrigation for a project or zone",
  "Каркас или готовый модуль": "Frame or ready-made module",
  "Освещение": "Lighting",
  "Корневая зона и подача раствора": "Root zone and solution delivery",
  "Каркас и компоновка фермы": "Frame and farm layout",
  "Основа корневой зоны": "Root-zone base",
  "Комплекты и проектные позиции": "Kits and project positions",
  "Не открывайте каталог как замену подбору": "Do not use the catalog as a substitute for selection",
  "Светильник M23 100 Вт, 191 см": "M23 light 100 W, 191 cm",
  "Субстратный мат": "Substrate slab",
  "Собрать задачу на подбор": "Prepare a selection brief",
  "Новички": "Beginners",
  "Действующие фермеры": "Active growers",
  "Инвесторы и предприниматели": "Investors and entrepreneurs",
  "Пошаговый маршрут, а не просто набор уроков": "A step-by-step path, not just a set of lessons",
  "База и старт клубничной фермы": "Strawberry farm foundations and launch",
  "Инженерия и условия": "Engineering and conditions",
  "Рост, цикл жизни и развитие куста": "Growth, life cycle, and plant development",
  "Цветение, урожай и качество ягоды": "Flowering, harvest, and berry quality",
  "Сбор, хранение и масштабирование": "Harvest, storage, and scaling",
  "Что делать дальше": "What to do next",
  "Как устроен доступ": "How access works",
  "Одна рамка стоимости без сложной тарифной сетки": "One pricing frame without a complex tariff grid",
  "Понятную программу": "A clear program",
  "Собрать запрос по курсу": "Prepare a course brief",
  "Оборудование по узлам": "Equipment by nodes",
  "Ориентир по закупке": "Procurement benchmark",
  "Расходы и выручка": "Costs and revenue",
  "Когда калькулятор даёт реальную пользу": "When the calculator gives real value",
  "Когда лучше сразу идти в подбор или сопровождение": "When it is better to go straight into selection or support",
  "Короткий поток без длинной анкеты и лишних полей": "A short flow without a long form and extra fields",
  "Фиксируем сценарий": "Fix the scenario",
  "Собираем базовые вводные": "Collect the basic inputs",
  "Смотрим рабочую рамку": "Review the working outline",
  "Понимаем маршрут дальше": "Understand the route forward",
  "Сценарий проекта": "Project scenario",
  "Что уже видно по текущим вводным": "What is already visible from the current inputs",
  "Вот что уже видно по вашим вводным": "Here is what is already visible from your inputs",
  "Результат нужен не для одной цифры": "The result is not for one number",
  "Пока это предварительная рамка": "For now this is a preliminary outline",
  "Когда не стоит идти в каталог сразу": "When you should not go straight to the catalog",
  "Как выглядит структура бюджета сейчас": "What the budget structure looks like now",
  "Ежемесячная и годовая рамка расходов": "Monthly and yearly cost outline",
  "Как читать эту сценарную рамку": "How to read this scenario outline",
  "Калькулятор убирает слепой старт": "The calculator removes a blind start",
  "Это предварительная рамка, а не финальная смета": "This is a preliminary outline, not a final estimate",
  "Не красивую форму, а осмысленный маршрут": "Not a pretty form, but a meaningful route",
  "Калькулятор проекта": "Project calculator",
  "Калькулятор нужен, чтобы убрать угадывание на старте и быстро понять, что именно стоит считать глубже.": "The calculator removes guesswork at the start and helps you see what needs deeper calculation.",
  "Стеллажи, свет, полив, субстрат, расходники и посадочный материал в одной рамке.": "Racks, lighting, irrigation, substrate, consumables, and planting material in one outline.",
  "Видно не только итоговую сумму, но и то, из чего она складывается.": "You see not only the total, but what it is made of.",
  "Предварительная модель помогает понять порядок цифр до проектного расчёта.": "The preliminary model helps you understand the order of magnitude before a project estimate.",
  "Сразу видно, когда достаточно расчёта, а когда уже нужен разбор действующего объекта.": "You can immediately see when the estimate is enough and when a review of an operating site is already needed.",
  "Как работает расчёт": "How the estimate works",
  "Понимаем, вы запускаете ферму, расширяетесь или хотите проверить рамку проекта.": "We determine whether you are launching a farm, expanding, or checking the project outline.",
  "Площадь, формат объекта, выращивание и базовые цифры, которые реально влияют на расчёт.": "Area, site format, cultivation model, and the core figures that actually affect the estimate.",
  "Система сразу собирает предварительный состав оборудования, смету, расходы и выручку.": "The system immediately assembles a preliminary equipment composition, estimate, costs, and revenue.",
  "Если проект выходит за рамки типового сценария, сразу видно, куда идти дальше: в расчёт или сопровождение.": "If the project goes beyond a standard scenario, it becomes clear right away whether to move into estimate or support.",
  "Пошаговый расчёт": "Step-by-step estimate",
  "Вопросы разбиты по шагам, чтобы было понятно, зачем нужен каждый ввод и как он влияет на расчёт.": "The questions are broken into steps so it is clear why each input matters and how it affects the estimate.",
  "От сценария зависит, когда хватит предварительной рамки, а когда уже нужен разговор по объекту.": "The scenario determines when a preliminary outline is enough and when a site-specific discussion is needed.",
  "Сценарий": "Scenario",
  "Объект": "Site",
  "Выращивание": "Cultivation",
  "Масштаб": "Scale",
  "Цель": "Goal",
  "Сбыт": "Sales",
  "Контакты": "Contacts",
  "Сопровождение и консультации": "Support and consultations",
  "Эта страница для запусков, действующих ферм и пересборки технологии. Здесь не продаётся абстрактное обучение, а предлагается участие в реальных решениях по ферме.": "This page is for launches, operating farms, and technology rebuilds. It does not sell abstract learning; it offers participation in real farm decisions.",
  "Если вопрос упирается в качество ягоды, свет, полив, корневую зону, логику запуска или критический этап проекта, правильный путь — разбор ситуации и план действий, а не случайная покупка.": "If the issue is berry quality, lighting, irrigation, the root zone, launch logic, or a critical project stage, the right path is a situation review and an action plan, not a random purchase.",
  "Что даёт сопровождение": "What support gives you",
  "Свет, полив, корневая зона, фазы растения и качество ягоды часто связаны. Поэтому задача не в том, чтобы найти одну волшебную кнопку, а в том, чтобы увидеть цепочку решений и отклонений.": "Light, irrigation, the root zone, plant stages, and berry quality are often linked. The task is not to find one magic button, but to see the chain of decisions and deviations.",
  "Курс нужен тем, кто хочет спокойно собрать у себя в голове логику выращивания, запуска и роста без хаотичного сбора знаний по кускам.": "The course is for people who want to calmly build a clear mental model of cultivation, launch, and growth instead of collecting fragments of knowledge chaotically.",
  "Что вы получите": "What you will get",
  "Внутри не абстрактная теория, а последовательное понимание стадий растения, света, климата, полива, качества ягоды и базовой экономики фермы.": "Inside is not abstract theory, but a structured understanding of plant stages, light, climate, irrigation, berry quality, and the farm’s basic economics.",
  "Физиология": "Physiology",
  "понимание стадий развития растения и критических окон": "understanding plant development stages and critical windows",
  "Инженерия": "Engineering",
  "свет, климат, VPD, полив, EC и pH под реальные условия": "light, climate, VPD, irrigation, EC, and pH under real conditions",
  "Ягода": "Berry",
  "размер, сладость, качество и стабильность плодоношения": "size, sweetness, quality, and stable fruiting",
  "Экономика": "Economics",
  "рамка рентабельности, масштабов и стартовых ошибок": "a framework for profitability, scale, and startup mistakes",
  "Программа": "Program",
  "Запись на курс": "Course sign-up",
  "Если вам нужен именно образовательный маршрут, а не разбор проекта, отсюда начинается нормальный вход в курс.": "If you need an educational route rather than a project review, this is the right entry point into the course.",
  "Короткая форма для записи на курс.": "A short form for course enrollment.",
  "Почему доверяют": "Why they trust us",
  "Что вы реально даёте": "What you actually provide",
  "Кейсы и проекты": "Cases and projects",
  "О проекте": "About the project",
  "Финальный CTA": "Final CTA",
  "Нужна консультация по задаче Нужна базовая система по технологии": "Need a consultation on the task Need a core technology foundation",
  "Запуск и расчёт Когда нужно понять состав фермы, очередность закупки и рамку бюджета.": "Launch and estimate When you need to understand the farm setup, purchase order, and budget range.",
  "Магазин и расходники Когда задача понятна и нужно быстро перейти к выбору категории или товара.": "Shop and consumables When the task is clear and you need to move quickly to a category or product.",
  "Подбор и консультация Когда проект уже работает или ошибка в одном узле тянет за собой всю схему.": "Selection and consultation When the project is already operating or one wrong node affects the whole setup.",
  "Площадь, формат фермы и ограничения объекта.": "The area, farm format, and site constraints.",
  "Свет, полив, стеллажи, субстрат и посадочный материал.": "Lighting, irrigation, racks, substrate, and planting material.",
  "Результат: состав фермы, рамка бюджета и список приоритетов.": "Result: farm composition, budget outline, and a list of priorities.",
  "Проблемы по свету, поливу, корневой зоне или качеству ягоды.": "Issues with lighting, irrigation, the root zone, or berry quality.",
  "Подбор оборудования, корректировок и порядок действий без хаоса.": "Selection of equipment, corrections, and an action order without chaos.",
  "Результат: консультация или сопровождение под реальную задачу.": "Result: consultation or support for the real task.",
  "LED, полив, субстрат, посадочный материал и комплектующие.": "LED, irrigation, substrate, planting material, and components.",
  "Разделение между тем, что можно купить сразу, и тем, что лучше сначала проверить.": "A split between what can be bought immediately and what should be checked first.",
  "Результат: быстрый вход в категорию, карточку товара или готовое решение.": "Result: a quick entry into a category, product page, or ready-made solution.",
  "Когда нужно собрать систему частями или целиком.": "When you need to assemble the system in parts or as a whole.",
  "Когда ошибка в одном узле тянет за собой весь проект.": "When one wrong node affects the entire project.",
  "Результат: расчёт фермы, смета и понятный состав комплекта.": "Result: farm estimate, cost outline, and a clear kit composition.",
  "5 модулей по полному циклу выращивания": "5 modules across the full cultivation cycle",
  "6 месяцев на прохождение без спешки": "6 months to complete without rushing",
  "1 год доступа к занятиям и материалам курса": "1 year of access to course sessions and materials",
  "Что внутри": "What is inside",
  "Старт фермы, инженерия, рост куста, качество ягоды и масштабирование.": "Farm launch, engineering, plant growth, berry quality, and scaling.",
  "Разборы практических заданий и работа в закрытом чате.": "Reviews of practical assignments and work in a closed chat.",
  "Материалы, к которым можно возвращаться в процессе запуска и роста.": "Materials you can return to during launch and growth.",
  "Кому подойдёт": "Who it fits",
  "Тем, кто только входит в тему и хочет собрать систему без хаоса.": "For people entering the topic who want to build a system without chaos.",
  "Действующим фермерам, которым нужно структурировать опыт и пересобрать базу.": "For active growers who need to structure their experience and rebuild the foundation.",
  "Инвесторам и предпринимателям, которым важно понять логику проекта до входа в расчёт.": "For investors and entrepreneurs who need to understand the project logic before moving into an estimate.",
  "Основание для доверия": "Why you can trust this",
  "4 года работы в нише клубничных ферм и сопутствующих решений": "4 years of work in the strawberry farm niche and related solutions",
  "10 000+ м² проектов по площади": "10,000+ m² of project area",
  "50 000+ растений в проектах": "50,000+ plants in projects",
  "1 система расчёт, магазин, сопровождение и обучение в одной логике": "1 system with estimates, shop, support, and training in one logic",
  "LED-освещение": "LED lighting",
  "Стартовый комплект": "Starter kit",
  "Кому подходит: пилотному запуску, тестовой схеме и первой рабочей очереди.": "Who it fits: a pilot launch, a test setup, and the first working phase.",
  "Что входит: модуль 2×2 м, 8 лотков, 16 матов и базовая логика по свету и конструкции.": "What is included: a 2×2 m module, 8 trays, 16 slabs, and the basic lighting and structure logic.",
  "Когда идти дальше: если нужно понять состав, смету и объём допзакупки.": "When to move forward: if you need to understand composition, cost outline, and the volume of add-on purchases.",
  "Что видно после расчёта": "What becomes visible after the estimate",
  "Количество базовых модулей и состав оборудования по узлам.": "The number of base modules and equipment composition by node.",
  "Ориентир по закупке, ежемесячным расходам и выручке.": "A guide to procurement, monthly costs, and revenue.",
  "Понимание, какие позиции потом уйдут в магазин, а какие в смету.": "Understanding which positions will later go to the shop and which will go into the estimate.",
  "Понятный переход в расчёт под объект, если типовой рамки уже мало.": "A clear move into a site-specific estimate if the standard outline is no longer enough.",
  "Если объект нестандартный, вы не начинаете всё заново: вводные уже собраны, и их можно передать дальше в проектную работу.": "If the site is non-standard, you do not start from scratch: the inputs are already collected and can be passed into project work.",
  "Площадь, формат объекта, стадия проекта и ограничения.": "Area, site format, project stage, and constraints.",
  "Конфигурация ключевых узлов и состав решения.": "The configuration of key nodes and the solution composition.",
  "Что отправляется как товар, а что идёт как проектная позиция.": "What goes out as a product and what moves as a project position.",
  "Переход от комплекта на бумаге к рабочей схеме на объекте.": "The transition from a kit on paper to a working scheme on the site.",
  "FAQ Вопросы, которые нужно закрыть до заявки": "FAQ Questions to close before submitting a request",
  "Расчёт фермы и состав комплекта под объект": "Farm estimate and kit composition for the site",
  "Если вы считаете ферму как систему, начните с вводных по объекту, а не с отдельных SKU.": "If you calculate the farm as a system, start with the site inputs, not with individual SKUs.",
  "Понимание состава решения под объект, а не абстрактный список товаров.": "An understanding of the solution composition for the site, not an abstract product list.",
  "Приоритеты по закупке, если всё не покупается одним пакетом.": "Procurement priorities if everything is not bought in one package.",
  "Понимание, где нужен подбор, а где достаточно типового решения.": "An understanding of where selection is needed and where a standard solution is enough.",
  "Понимание, что можно закупать сразу, а что нужно считать отдельно.": "An understanding of what can be purchased immediately and what should be calculated separately.",
  "Компоновка": "Layout",
  "Плотность по площади, компоновка и логистика обслуживания.": "Density per area, layout, and service logistics.",
  "Среда": "Environment",
  "Подбор узлов под формат объекта и сценарий выращивания.": "Selection of nodes for the site format and cultivation scenario.",
  "Расходники": "Consumables",
  "Связка с корневой зоной, каналом сбыта и задачей по ягоде.": "The link to the root zone, sales channel, and berry task.",
  "Коммерция": "Commercial side",
  "Что входит в рамку решения, а что лучше считать отдельным шагом.": "What is included in the solution outline and what is better calculated as a separate step.",
  "Что прислать в заявку": "What to send in the request",
  "Площадь, тип помещения и ограничения по объекту.": "Area, room type, and site constraints.",
  "Стадия проекта: запуск, действующая ферма или пересборка.": "Project stage: launch, operating farm, or rebuild.",
  "Что нужно сейчас: вся схема, отдельный узел или рамка комплекта.": "What is needed now: the full scheme, a separate node, or a kit outline.",
  "Что уже куплено и какие решения менять нельзя.": "What has already been bought and which decisions cannot be changed.",
  "Итоговое решение всегда опирается на фактические вводные по помещению и задаче.": "The final solution always depends on the actual inputs of the room and the task.",
  "Если часть данных пока неизвестна, расчёт всё равно помогает собрать рамку действий.": "If some data is still unknown, the estimate still helps build an action outline.",
  "Главная цель — собрать рабочую рамку проекта, а не гадать по отдельным позициям.": "The main goal is to build a working project outline, not to guess by individual positions."
};
