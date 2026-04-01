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
  "Не уверен, какой сценарий мне подходит": "Not sure which route fits me",
  "Нужна консультация по задаче": "Need a consultation",
  "Нужна базовая система по технологии": "Need a core technology system",
  "Запуск и расчёт": "Launch and estimate",
  "Когда нужно понять состав фермы, очередность закупки и рамку бюджета.": "When you need to understand the farm layout, purchase order, and budget range.",
  "Магазин и расходники": "Shop and consumables",
  "Когда задача понятна и нужно быстро перейти к выбору категории или товара.": "When the task is clear and you need to move quickly to a category or product.",
  "Подбор и консультация": "Selection and consultation",
  "Когда проект уже работает или ошибка в одном узле тянет за собой всю схему.": "When the project is already running or one faulty node affects the whole system.",
  "Три сценария входа вместо лишних переходов": "Three entry routes instead of extra clicks",
  "Запуск, действующая ферма и точечная закупка требуют разного первого шага.": "Launch, an operating farm, and targeted purchasing require different first steps.",
  "Сначала выбираете сценарий, потом уже форму, каталог или расчёт.": "Pick the route first, then move into the form, catalog, or estimate.",
  "Выберите маршрут, а не случайный переход": "Choose a route, not a random click",
  "Перейти к расчёту": "Open farm estimate",
  "Открыть сопровождение": "Open support",
  "Открыть магазин": "Open shop",
  "Получить состав комплекта": "Request kit composition",
  "Если нужен только быстрый ориентир по смете и составу, начните с калькулятора.": "If you only need a quick estimate and composition outline, start with the calculator.",
  "Он не заменяет расчёт под объект, но помогает быстро собрать вводные и понять, когда уже нужен проектный разбор.": "It does not replace a site-specific estimate, but it helps you collect the basics fast and see when a project review is already needed.",
  "На выходе": "Outcome",
  "Состав фермы, порядок запуска и рамка бюджета без хаотичных закупок.": "A farm structure, launch order, and budget range without chaotic purchasing.",
  "Понятно, что менять сейчас, а что не трогать, чтобы не сломать рабочую схему.": "It becomes clear what to change now and what not to touch so the working scheme is not broken.",
  "Быстрый вход в категорию, карточку товара или готовое решение без лишних переходов.": "A quick path into a category, product page, or ready solution without extra clicks.",
  "Нужна системная база по клубнике, а не разбор одного объекта?": "Need a system-level strawberry foundation, not a review of just one site?",
  "Нужна системная база по технологии, а не разбор конкретного объекта?": "Need a system-level understanding of the technology, not a review of one specific site?",
  "Для этого есть отдельный курс. Он не конкурирует с расчётом и не заменяет сопровождение. Это спокойный вход в тему для тех, кому сначала нужно собрать в голове систему фермы.": "There is a separate course for that. It does not compete with the estimate and does not replace support. It is a calm entry point for those who first need to assemble the farm system in their head.",
  "по полному циклу": "for the full cycle",
  "на прохождение": "to complete",
  "к материалам": "to the materials",
  "Открыть курс": "Open the course",
  "Если нужен разбор проекта": "If you need a project review",
  "Курс нужен, когда хочется не просто купить узел, а собрать в голове всю систему фермы.": "The course is for when you do not just want to buy a node, but understand the whole farm system in your head.",
  "Спокойный путь в тему": "A calm way into the topic",
  "Без спешки, с доступом к материалам и возможностью возвращаться к ним в процессе запуска.": "No rush, with access to the materials and the ability to return to them during launch.",
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
  "Что это дало": "What it gave",
  "КлубникаПро — это не просто каталог товаров": "KlubnikaPro is more than a product catalog",
  "Не просто витрина": "Not just a storefront",
  "Каталог, расчёт и сопровождение собираются вокруг одной задачи: чтобы ферма работала как система.": "Catalog, estimate, and support are built around one task: making the farm work as a system.",
  "Оставить задачу": "Submit a task",
  "Вопросы, которые нужно закрыть до заявки": "Questions to resolve before you submit a request",
  "Когда нужен разбор, а не каталог?": "When do you need a review instead of the catalog?",
  "Когда ферма уже работает, нужно менять узел в связке с другими системами или ошибка выбора может потянуть за собой весь объект.": "When the farm is already running, you need to change a node together with other systems, or a wrong choice can affect the whole site.",
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
  "Когда задача уже дошла до света, полива, стеллажа, субстрата или посадочного материала, категорию удобно выбирать глазами. Если до этого ещё далеко, сначала нужен подбор или расчёт.": "Once the task has narrowed down to lighting, irrigation, racks, substrate, or planting material, it is easier to choose visually. If you are not there yet, start with selection or an estimate.",
  "Открыть категорию": "Open category",
  "Открыть раздел": "Open section",
  "Смотреть решения": "View solutions",
  "Свет оценивают в рабочем ярусе, а не только по ваттам на коробке.": "Lighting is judged in the working tier, not just by the watts on the box.",
  "На практике важны подвес, пролёт, режим мощности и плотность растения в ряду.": "In practice, mounting, span, power mode, and plant density in the row matter.",
  "Типовой светильник удобен, когда схема уже понятна.": "A standard fixture works well when the scheme is already clear.",
  "Если вопрос ещё в логике света, карточка товара не должна быть первым шагом.": "If the issue is still in the lighting logic, the product page should not be the first step.",
  "Свет редко живёт отдельно от стеллажа и обслуживания.": "Lighting rarely exists separately from racks and service logic.",
  "Меняете ярус или плотность посадки — почти всегда надо пересмотреть и свет.": "If you change the tier or planting density, you almost always need to revisit the lighting too.",
  "Когда свет уже встроен в понятную схему, категория помогает быстро выбрать типовой путь без лишней теории.": "When lighting is already part of a clear scheme, the category helps you choose the standard path quickly without extra theory.",
  "Полив здесь начинается со схемы узла, а не с россыпи отдельных деталей.": "Irrigation here starts from the node scheme, not from a scatter of separate parts.",
  "Когда линия уже понятна, комплектующие докупаются быстро. До этого лучше собирать не корзину, а логику узла.": "When the line is already understood, components are easy to buy quickly. Before that, you should build the node logic, not a cart.",
  "Корневая зона меняется не сама по себе.": "The root zone does not change in isolation.",
  "Расход, длина линии и дозирование начинают влиять на растение сразу, а не только на список деталей.": "Flow rate, line length, and dosing affect the plant immediately, not just the parts list.",
  "Узел дозирования почти всегда требует проверки всей связки.": "The dosing node almost always requires checking the whole chain.",
  "Если в вопросе появляется Dosatron, это уже ближе к подбору и составу, чем к обычной витрине.": "If Dosatron enters the conversation, it is already closer to selection and composition than to a regular storefront.",
  "Когда модуль уже понятен, категория помогает быстро добрать детали. Когда модуль ещё не определён, важнее сначала разобрать схему.": "When the module is already clear, the category helps you quickly complete the parts. When the module is not yet defined, it matters more to sort out the scheme first.",
  "Перед покупкой важнее понять роль узла в системе, чем название товара": "Before buying, it matters more to understand the node’s role in the system than the product name",
  "Что за объект": "What kind of site",
  "Площадь, формат фермы и стадия проекта уже сильно сужают выбор.": "The area, farm format, and project stage already narrow the choice a lot.",
  "Что уже стоит": "What is already installed",
  "Свет, полив, лоток и конструкция задают рамки совместимости.": "Lighting, irrigation, tray layout, and structure define the compatibility limits.",
  "Что нужно закрыть": "What has to be solved",
  "Замена узла, запуск, дооснащение или покупка расходника ведут по разным путям.": "Replacing a node, launching, upgrading, or buying a consumable lead to different paths.",
  "Если этих вводных пока нет, не открывайте каталог как замену подбору.": "If you do not have these inputs yet, do not use the catalog as a substitute for selection.",
  "Сначала оставьте задачу, и станет понятно, что можно брать сразу, а что уже требует расчёта и состава.": "Leave the task first, and it becomes clear what can be bought right away and what already needs an estimate and a composition.",
  "Получить консультацию": "Get a consultation",
  "Нужен расчёт фермы": "Need a farm estimate",
  "Витрина нужна тем, у кого задача уже дошла до категории или карточки": "The grid is for people whose task has already narrowed down to a category or product page",
  "Быстрые метки нужны не для игры с фильтрами, а чтобы сразу попасть в правильный тип покупки.": "The quick tags are not there to play with filters, but to get you straight into the right buying path.",
  "Если карточка уже ясна, идите в витрину. Если нет, не тратьте клики на угадывание по SKU.": "If the product page is already clear, go to the catalog grid. If not, do not waste clicks guessing by SKU.",
  "Типовые закупки должны читаться быстро. Всё, что влияет на схему фермы, лучше сначала перевести в подбор или состав.": "Standard purchases should read fast. Anything that affects the farm scheme is better moved into selection or composition first.",
  "Проверить совместимость": "Check compatibility",
  "Открыть товар": "Open product",
  "Получить состав и смету": "Get composition and estimate",
  "Запросить состав": "Request composition",
  "Этот светильник читается нормально только в контексте рабочего ряда.": "This fixture makes sense only in the context of a working row.",
  "Если ряд и подвес уже понятны, карточка помогает быстро закрыть вопрос. Если нет, нужна не покупка, а сверка схемы.": "If the row and mounting are already clear, the product page helps close the question fast. If not, what you need is not a purchase, but a scheme check.",
  "Где его ставят": "Where it is installed",
  "Типовой вход для многоярусной линии": "A standard entry point for a multi-tier line",
  "Это не универсальный “свет под всё”, а понятная позиция для фермы, где уже известны длина пролёта, режим мощности и логика подвеса.": "This is not a universal “light for everything”, but a clear position for a farm where the span length, power mode, and mounting logic are already known.",
  "Когда тормознуть": "When to slow down",
  "Если вместе меняется и стеллаж, и свет": "If both the rack and the lighting are changing together",
  "В такой ситуации один светильник уже не решает задачу. Лучше сначала проверить связку узла, а потом возвращаться к карточке.": "In that situation, a single fixture no longer solves the problem. It is better to check the node chain first and then return to the product page.",
  "Коротко по сценарию": "Scenario summary",
  "Типовой светильник покупают после сверки fit, а не вместо неё.": "A standard fixture is bought after checking fit, not instead of it.",
  "Если вопрос уже свёлся к длине, мощности и подвесу, карточка закрывает задачу быстро. Если нет, правильнее уйти в консультацию и не ломать схему фермы случайной покупкой.": "If the question has already narrowed down to length, power, and mounting, the page closes the task quickly. If not, it is better to move into consultation and avoid breaking the farm scheme with a random purchase.",
  "Эта карточка показывает рамку узла, а не заменяет разбор всей схемы полива.": "This page shows the outline of the node, not a substitute for reviewing the entire irrigation scheme.",
  "Если модуль и линия уже понятны, отсюда легко перейти к составу. Если нет, лучше сначала собрать вводные по объекту.": "If the module and line are already clear, it is easy to move from here to the composition. If not, it is better to collect the site inputs first.",
  "Где это работает": "Where it works",
  "Понятный модуль или ярус": "A clear module or tier",
  "Комплект помогает, когда ферма уже описана по рядам, длине линии и типу лотка. Тогда карточка становится точкой сборки узла, а не гаданием.": "The kit helps when the farm is already described by rows, line length, and tray type. Then the product page becomes a node assembly point instead of guesswork.",
  "Когда не спешить": "When not to rush",
  "Если полив тянет за собой корневую зону": "If irrigation pulls the root zone with it",
  "Когда вместе меняются расход, дозирование, режим полива и логика растения, это уже разговор не о комплекте, а о системе.": "When flow, dosing, irrigation regime, and plant logic all change together, the discussion is no longer about a kit, but about a system.",
  "Типовой комплект помогает, когда схема уже собрана в голове.": "A standard kit helps when the scheme is already assembled in your head.",
  "Если вы уже понимаете модуль и линию, следующий шаг — состав и смета. Если вопрос ещё в совместимости и логике полива, правильнее сначала вынести его в консультацию.": "If you already understand the module and the line, the next step is composition and estimate. If the question is still about compatibility and irrigation logic, it is better to take it into consultation first.",
  "Сравнить сорт": "Compare variety",
  "Открыть материал": "Open material",
  "Обсудить модуль": "Discuss the module",
  "Как смотреть категорию": "How to read this category",
  "Сначала модуль и ряд, потом отдельный компонент": "First the module and row, then the individual component",
  "В стеллажах ошибка чаще начинается не с товара, а с неверной геометрии модуля. Сначала смотрят на рабочий фрагмент фермы, потом уже на лоток или дополнительный узел.": "With racks, the mistake usually starts not with the product, but with the wrong module geometry. First you look at a working section of the farm, and only then at the tray or the extra unit.",
  "Базовый модуль задаёт не только металл, но и логику света, лотка, обслуживания и шага расширения.": "The base module defines not only the metalwork, but also the logic of lighting, tray layout, service access, and expansion steps.",
  "Проход, высота и доступ к ряду влияют на fit сильнее, чем название отдельной позиции в каталоге.": "Aisle width, height, and access to the row affect fit more than the name of an individual position in the catalog.",
  "Дополнительный модуль берут тогда, когда базовая геометрия уже подтверждена и остаётся продолжить ряд без пересборки.": "An additional module is taken when the base geometry is already confirmed and all that remains is to extend the row without rebuilding.",
  "Мат выбирают вместе с посадкой и поливом": "The slab is chosen together with planting and irrigation",
  "Субстрат редко живёт отдельно. Для нормального выбора нужно понимать, какой посадочный материал стоит в модуле, какой режим полива вы ведёте и что происходит в корневой зоне.": "Substrate rarely lives on its own. To choose it properly, you need to understand what planting material is in the module, what irrigation regime you run, and what is happening in the root zone.",
  "Что важно проверить до выбора мата": "What to check before choosing a slab",
  "Какой сценарий старта у вас сейчас: семена, Frigo или действующий модуль.": "What startup scenario you have now: seeds, Frigo, or an operating module.",
  "Есть ли уже утверждённый лоток, шаг посадки и режим полива.": "Whether the tray, planting spacing, and irrigation regime are already defined.",
  "Нужен типовой мат под понятную схему или вы ещё собираете корневую зону целиком.": "Whether you need a standard slab for a defined scheme or are still assembling the whole root zone.",
  "Типовой мат хорош тогда, когда он уже встроен в понятную связку посадки, полива и режима растения.": "A standard slab works well when it is already part of a clear chain of planting, irrigation, and plant regime.",
  "Если вместе меняются сорт, посадочный материал и полив, субстрат лучше выбирать не изолированно, а как часть всей схемы.": "If the variety, planting material, and irrigation are changing together, substrate is better chosen not in isolation, but as part of the full scheme.",
  "Семена и Frigo не решают одну и ту же задачу старта": "Seeds and Frigo do not solve the same startup task",
  "Семенной путь и Frigo стоит смотреть не как две похожие карточки посадочного материала, а как два разных сценария входа в ферму. Ниже весь актуальный набор, но выбирать его лучше уже с пониманием, что именно вы хотите запустить.": "Seeds and Frigo should not be viewed as two similar planting-material cards, but as two different entry scenarios into the farm. The full current range is below, but it is better to choose it once you understand what exactly you want to launch.",
  "Если пока неясно, нужен сорт под технологию или быстрый старт через Frigo, не выбирайте вслепую": "If it is still unclear whether you need a variety matched to the technology or a fast start through Frigo, do not choose blindly",
  "Сначала лучше сверить сценарий запуска, канал сбыта и формат фермы. После этого уже становится понятно, идти в сорт, Frigo или расчёт всей схемы запуска.": "It is better to first align the launch scenario, sales channel, and farm format. After that, it becomes clear whether to move into a variety, Frigo, or an estimate for the full launch scheme.",
  "Обсудить посадочный материал": "Discuss planting material",
  "Как смотреть это решение": "How to read this solution",
  "Сначала на ряд, проход и обслуживание, а не на цену металла отдельно.": "Start with the row, aisle, and service access, not with the metal price on its own.",
  "Потом на связку со светом, лотком, поливом и шагом расширения фермы.": "Then look at the connection with lighting, tray layout, irrigation, and the farm expansion step.",
  "И только после этого на состав конкретного модуля и смету под объект.": "Only after that should you look at the exact module composition and the estimate for the site.",
  "Хорошая стеллажная система читается по рабочему проходу и доступу к ряду, а не по одному красивому рендеру металла.": "A good rack system is read through the working aisle and row access, not through a single pretty render of metal.",
  "Если меняется конструкция, почти всегда следом приходится проверять свет, обслуживание и порядок расширения фермы.": "If the structure changes, you almost always have to review the lighting, service logic, and farm expansion order next.",
  "Как читать эту позицию": "How to read this item",
  "Не как отдельный мат “на удачу”, а как часть уже понятной корневой зоны.": "Not as a random slab “just in case,” but as part of an already defined root-zone setup.",
  "Сначала сверяют лоток, посадочный материал и режим полива, потом уже сам формат мата.": "First you verify the tray, planting material, and irrigation regime, and only then the slab format itself.",
  "Если меняется вся схема посадки, карточка товара должна быть не первым, а вторым шагом.": "If the entire planting scheme is changing, the product page should be the second step, not the first.",
  "Как смотреть сорт в фермерской логике": "How to read a variety in farm logic",
  "Не как красивую ягоду на фото, а как поведение сорта в вашей системе.": "Not as a beautiful berry in a photo, but as the variety’s behavior inside your system.",
  "Сначала сверяют канал сбыта, генерацию и работу под досветкой.": "First you verify the sales channel, generative behavior, and work under supplemental lighting.",
  "Потом уже оценивают вкус, размер и fit под конкретную ферму.": "Only then do you evaluate taste, size, and fit for a specific farm.",
  "Сильный внешний вид сам по себе не продаёт сорт, если он не совпадает с вашим рынком, досветкой и ритмом сбора.": "Strong visual appeal alone does not sell a variety if it does not match your market, lighting scheme, and harvest rhythm.",
  "Сорт в controlled environment смотрят в связке с технологией фермы, а не как отдельную красивую характеристику на упаковке.": "In a controlled environment, a variety is evaluated together with the farm technology, not as a standalone pretty feature on the pack.",
  "Как смотреть FRIGO без путаницы": "How to read FRIGO without confusion",
  "Не как “любую рассаду”, а как отдельный сценарий запуска фермы.": "Not as “just any seedlings,” but as a separate farm launch scenario.",
  "Сначала на срок входа в цикл, предсказуемость партии и тип запуска.": "First look at time-to-cycle, batch predictability, and launch type.",
  "Потом уже на сорт, объём партии и fit под вашу схему проекта.": "Then look at the variety, batch volume, and fit for your project scheme.",
  "FRIGO работает как профессиональный инструмент старта, когда вам важны предсказуемость партии и понятный вход в цикл.": "FRIGO works as a professional launch tool when batch predictability and a clear entry into the cycle matter.",
  "Если схема запуска ещё не собрана, FRIGO лучше обсуждать вместе со светом, поливом и логикой первой очереди фермы.": "If the launch scheme is not yet assembled, FRIGO is better discussed together with lighting, irrigation, and the logic of the first farm phase.",
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
  "Рост, новая очередь или комплект": "Growth, next phase, or a full kit",
  "Нужно считать следующую очередь, новую плотность или набор решений под запуск.": "You need to estimate the next phase, a new density, or a launch solution set.",
  "Важно не тиражировать старые ошибки и не собирать комплект по частям вслепую.": "It is important not to repeat old mistakes and not to assemble a kit blindly piece by piece.",
  "Результат: рамка очереди, состава и порядка закупки без хаоса.": "Result: an outline for the next phase, composition, and purchase order without chaos.",
  "Если после расчёта вопрос уже упирается в технологию, запуск или пересборку, дальше нужен не каталог, а проектный разбор.": "If after the estimate the question already comes down to technology, launch, or a rebuild, the next step is not the catalog but a project review.",
  "Расчёт собирает рамку. Если задача выходит за рамки комплекта и уходит в логику фермы, следующий шаг — консультация или сопровождение.": "The estimate builds the outline. If the task goes beyond the kit and into farm logic, the next step is consultation or support.",
  "Открыть консультации": "Open consultations",
  "Перейти в сопровождение": "Go to support",
  "Что это даёт проекту": "What it gives the project",
  "Если нужна база по технологии, а не разбор проекта, для этого есть Клубничный Хак": "If you need a technology foundation rather than a project review, Strawberry Hack is for that",
  "Это отдельный маршрут для тех, кому сначала нужно собрать систему фермы в голове, а не разбирать свой объект по узлам и решениям.": "This is a separate path for those who first need to assemble the farm system in their head rather than break down their site by nodes and decisions.",
  "На выходе у проекта появляется не ещё один совет, а более управляемая логика решений.": "The result is not one more piece of advice, but a more manageable decision logic for the project.",
  "Понятно, что менять сначала, где первопричина, какие закупки уже можно делать и где без сопровождения дальше лучше не двигаться.": "It becomes clear what to change first, where the root cause is, which purchases can already be made, and where it is better not to move further without support.",
  "Когда нужна консультация": "When consultation is needed",
  "Разовая консультация нужна там, где вопрос уже острый, но ещё не требует длинного сопровождения": "A one-time consultation is needed where the issue is already acute but does not yet require long-term support",
  "Если задачу можно сузить до одного узла, одного решения или одного критичного вопроса, консультация даёт быстрый следующий шаг без длинного процесса.": "If the task can be narrowed down to one node, one decision, or one critical question, a consultation gives a quick next step without a long process.",
  "Нужно быстро проверить решение": "Need to quickly verify a decision",
  "Есть один узел, конфигурация или развилка, где не хочется ошибиться.": "There is one node, configuration, or fork where you do not want to make a mistake.",
  "Нужно быстро понять, что делать сначала и что не покупать вслепую.": "You need to quickly understand what to do first and what not to buy blindly.",
  "Результат: один понятный следующий шаг без лишней теории.": "Result: one clear next step without unnecessary theory.",
  "Есть проблема по ягоде, свету, поливу или корневой зоне.": "There is a problem with the berry, lighting, irrigation, or root zone.",
  "Нужно понять вероятную причину и порядок проверки.": "You need to understand the likely cause and the order of checks.",
  "Результат: приоритеты, а не набор случайных гипотез.": "Result: priorities, not a set of random hypotheses.",
  "Нужно понять, хватит ли консультации": "Need to understand whether consultation is enough",
  "Пока неясно, это точечный вопрос или уже системная задача.": "It is not yet clear whether this is a pinpoint question or already a systemic task.",
  "Нужно быстро решить, идти дальше в сопровождение или нет.": "You need to quickly decide whether to move into support or not.",
  "Результат: понятный формат работы вместо лишних касаний.": "Result: a clear work format instead of extra touchpoints.",
  "Что даёт консультация": "What consultation gives",
  "Консультация нужна, когда один точный разбор уже может сэкономить деньги и время": "Consultation is needed when one precise review can already save time and money",
  "Здесь не ищут волшебную кнопку. Здесь быстро выясняют, где реальная причина, что проверять первым и стоит ли дальше переводить задачу в сопровождение.": "No one is looking for a magic button here. Instead, you quickly find out where the real cause is, what to check first, and whether the task should move into support.",
  "На выходе": "Outcome",
  "Не общий совет, а предметный следующий шаг": "Not generic advice, but a concrete next step",
  "Понимание, покупать ли, пересчитывать ли или переводить вопрос в сопровождение.": "Understanding whether to buy, re-estimate, or move the question into support.",
  "План действий, который можно применить сразу после разговора.": "An action plan you can apply right after the call.",
  "Что важно понять до записи": "What matters before booking",
  "После консультации у вас должен оставаться не общий совет, а понятный следующий шаг по проекту.": "After the consultation, you should be left not with generic advice, but with a clear next step for the project.",
  "Если вопрос закрывается точечно, вы идёте в закупку, расчёт или корректировку. Если нет, становится понятно, что задачу уже лучше вести в сопровождении.": "If the question is solved point-by-point, you move into purchasing, estimating, or adjustment. If not, it becomes clear that the task is better handled through support.",
  "Разбор должен быть понятным заранее": "The review process should be clear in advance",
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
  "Ферма уже работает": "The farm is already operating",
  "Нужно понять конфигурацию, состав комплекта и порядок запуска.": "You need to understand the configuration, the kit composition, and the launch sequence.",
  "Нужно понять, где узкое место, и что менять в текущей схеме фермы.": "You need to see where the bottleneck is and what to change in the current farm setup.",
  "Задача уже понятна, и нужно быстро выбрать категорию или типовой товар.": "The task is already clear, and you need to quickly choose a category or a standard item.",
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
  "Главная цель — собрать рабочую рамку проекта, а не гадать по отдельным позициям.": "The main goal is to build a working project outline, not to guess by individual positions.",
  "Расчёт нужен не для одной позиции, а чтобы собрать в одну систему стеллаж, свет, полив и логику запуска.": "The estimate is not for a single item, but to bring the rack, light, irrigation, and launch logic into one system.",
  "Даже проход и обслуживание влияют на состав решения. Поэтому ферму считают как объект, а не как список товаров.": "Even aisle width and maintenance affect the solution composition. That is why the farm is estimated as a site, not as a shopping list.",
  "Когда схема собрана правильно, потом проще управлять не только закупкой, но и качеством ягоды на выходе.": "When the scheme is assembled correctly, it becomes easier to manage not only procurement, but also the berry quality at the output.",
  "Даже если не все данные готовы, по объекту уже можно собрать рабочую рамку и понять, что считать глубже.": "Even if not all data is ready, you can already build a working outline for the site and see what needs deeper calculation.",
  "Расчёт не заменяет реальность объекта, но убирает угадывание и помогает прийти к решению более коротким путём.": "The estimate does not replace the reality of the site, but it removes guesswork and helps you reach a decision through a shorter path.",
  "Сопровождение почти всегда начинается с того, что свет и среда проверяют вместе, а не по отдельным симптомам.": "Support almost always begins with checking light and environment together, not by isolated symptoms.",
  "Размер, плотность и вкус ягоды редко ломаются в одной точке. Обычно это уже следствие цепочки решений по узлам.": "Berry size, density, and taste rarely break at a single point. More often they are the result of a chain of node-level decisions.",
  "Смысл сопровождения не в советах, а в том, чтобы довести корректировки до внедрения и эффекта на проекте.": "The point of support is not advice, but to carry adjustments through implementation and real effect on the project.",
  "Проект и внедрение": "Project and implementation",
  "Запуск, пересборка и приоритеты": "Launch, rebuild, and priorities",
  "Проверка логики проекта, подбор узлов и порядок внедрения без хаотичных действий по симптомам.": "Checking the project logic, selecting nodes, and setting the implementation order without chaotic symptom-driven actions.",
  "Частый запрос на консультацию начинается с ягоды, но быстро упирается в свет, полив или корневую зону.": "A common consultation request starts with the berry, but quickly runs into light, irrigation, or the root zone.",
  "Разовый разбор нужен там, где уже можно сузить вопрос до одного узла, одной ошибки или одного решения.": "A one-off review is needed when the question can already be narrowed to one node, one mistake, or one decision.",
  "Хорошая консультация заканчивается не общими словами, а понятным следующим шагом по проекту.": "A good consultation ends not with general words, but with a clear next step for the project.",
  "Решение": "Decision",
  "Проектный вопрос и следующий шаг": "Project question and next step",
  "Проверка логики решения, fit по узлу и понимание, идти ли дальше в расчёт, закупку или сопровождение.": "Checking the decision logic, node fit, and understanding whether to move on to estimating, procurement, or support."
  ,"Сначала сценарий. Потом уже расчёт, консультация или магазин.": "Start with the scenario. Then move into estimate, consultation, or shop."
  ,"Нужно понять состав, очередность и рамку запуска.": "You need to understand the composition, sequence, and launch outline."
  ,"Площадь, формат объекта и ограничения.": "Area, site format, and constraints."
  ,"Свет, полив, стеллажи и посадочный материал в одной логике.": "Lighting, irrigation, racks, and planting material in one logic."
  ,"Нужно понять, где узкое место и что менять первым.": "You need to see where the bottleneck is and what to change first."
  ,"Проблемы по свету, поливу, корневой зоне или ягоде.": "Issues with lighting, irrigation, the root zone, or the berry."
  ,"Корректировки без хаоса и лишних закупок.": "Adjustments without chaos or unnecessary purchases."
  ,"Задача уже понятна, и нужен быстрый вход в категорию или товар.": "The task is already clear, and you need a quick path into a category or product."
  ,"Сразу видно, что можно брать, а что сначала проверить.": "It is immediately clear what can be bought and what should be checked first."
  ,"Он быстро собирает вводные и показывает, когда уже нужен проектный разбор.": "It quickly collects the inputs and shows when a project review is already needed."
  ,"Нужна база по технологии, а не разбор конкретного объекта?": "Need a technology foundation rather than a review of a specific site?"
  ,"Для этого есть отдельный курс. Он не заменяет расчёт и не конкурирует с сопровождением.": "There is a separate course for that. It does not replace the estimate and does not compete with support."
  ,"КлубникаПро собирает ферму как систему, а не как набор случайных закупок": "KlubnikaPro builds the farm as a system, not as a set of random purchases"
  ,"Здесь важно связать конструкцию, свет, полив, субстрат и посадочный материал в одну рабочую схему.": "Here the goal is to connect structure, lighting, irrigation, substrate, and planting material into one working scheme."
  ,"Свет, полив, стеллаж и субстрат собираются как единая схема.": "Lighting, irrigation, racks, and substrate are assembled as one scheme."
  ,"Сначала ясно, что можно брать сразу, а что нужно считать.": "It becomes clear right away what can be bought immediately and what needs to be estimated."
  ,"Здесь важно быстро понять состав решения, его границы и следующий шаг.": "Here it is important to quickly understand the solution composition, its limits, and the next step."
  ,"Калькулятор нужен, чтобы быстро понять состав фермы, бюджет и границу между ориентиром и проектным расчётом.": "The calculator helps you quickly understand the farm composition, the budget, and the line between a benchmark and a project estimate."
  ,"Стеллажи, свет, полив и посадочный материал в одной рамке.": "Racks, lighting, irrigation, and planting material in one outline."
  ,"На выходе не одна цифра, а рабочая рамка проекта": "The result is not one number, but a working project outline"
  ,"Понимание, что потом уйдёт в магазин, а что останется проектной частью.": "You understand what will later move into the shop and what will remain part of the project."
  ,"Переход в расчёт под объект, если типовой рамки уже мало.": "A move into a site-specific estimate if the standard outline is no longer enough."
  ,"Типовые ситуации, где такой маршрут реально полезен": "Typical situations where this route is genuinely useful"
  ,"Опишите задачу в четырёх вводных, а мы направим её в правильный сценарий": "Describe the task in four inputs, and we will route it into the right scenario"
  ,"Нужны не длинные объяснения, а факты: стадия проекта, масштаб, задача и главный риск.": "What is needed is not a long explanation, but facts: project stage, scale, task, and the main risk."
  ,"Кому-то нужен расчёт, кому-то консультация, а кому-то уже можно идти в категорию или готовое решение.": "Some people need an estimate, some need consultation, and some can already go into a category or a ready-made solution."
  ,"Если вы ещё считаете состав фермы и бюджет, каталог не должен быть первым шагом.": "If you are still figuring out the farm composition and budget, the catalog should not be the first step."
  ,"Если нужно заменить узел, понять причину просадки или проверить совместимость, сначала нужен разбор схемы.": "If you need to replace a node, understand the cause of a drop, or check compatibility, you first need a review of the scheme."
  ,"Если задача уже свелась к категории или SKU, можно идти в категории и потом в карточку.": "If the task has already narrowed to a category or SKU, you can go into the categories and then into the product page."
  ,"Если не хотите собирать всё по частям, правильнее идти в готовые решения, а не в розничную витрину.": "If you do not want to assemble everything piece by piece, it is better to go into ready-made solutions rather than the retail showcase."
  ,"Каждая карточка показывает, кому подходит решение, что в него входит и когда нужен расчёт вместо прямой покупки.": "Each card shows who the solution fits, what it includes, and when an estimate is needed instead of a direct purchase."
  ,"Когда задача уже дошла до света, полива, стеллажа, субстрата или посадочного материала, категорию удобно выбирать глазами.": "When the task has already narrowed to lighting, irrigation, racks, substrate, or planting material, the category becomes easy to choose visually."
  ,"Даже без точного названия товара этих вводных уже достаточно, чтобы не ошибиться в категории и типе решения.": "Even without the exact product name, these inputs are already enough to avoid choosing the wrong category or solution type."
  ,"Замена узла, запуск, дооснащение или расходник ведут по разным путям.": "A node replacement, launch, upgrade, or consumable each lead down a different path."
  ,"Сначала оставьте задачу, и станет понятно, что можно брать сразу, а что требует расчёта и состава.": "Start by leaving the task, and it will become clear what can be bought immediately and what requires an estimate and composition."
  ,"Быстрые метки ниже помогают отделить типовые позиции от проектных и не тратить клики на неправильный путь.": "The quick tags below help separate standard items from project items and avoid wasting clicks on the wrong path."
  ,"Это не фильтры ради интерфейса, а быстрый вход в правильный тип покупки.": "These are not filters for the sake of interface, but a quick entry into the right type of purchase."
  ,"Магазин помогает разделить типовую закупку, проектную позицию и ситуацию, где сначала нужен разбор.": "The shop helps separate a standard purchase, a project item, and a situation where a review is needed first."
  ,"Фокус на клубнике в controlled environment.": "The focus stays on strawberries in a controlled environment."
  ,"Свет, полив, субстрат и конструкция читаются как одна система.": "Lighting, irrigation, substrate, and structure are read as one system."
  ,"До оплаты видно, где хватит карточки товара, а где нужна смета или консультация.": "Before payment, it is clear where a product page is enough and where an estimate or consultation is needed."
  ,"Проект можно собирать частями без потери логики.": "The project can be assembled in parts without losing its logic."
  ,"Оставьте несколько вводных, и станет понятно, что можно купить сразу, а что лучше сначала считать.": "Leave a few inputs, and it will become clear what can be bought immediately and what is better estimated first."
  ,"Если ошибка в одном узле тянет за собой остальные, проекту нужен расчёт и состав под реальные вводные.": "If an error in one node pulls the others with it, the project needs an estimate and a composition based on real inputs."
  ,"Не просто счёт, а рамку проекта": "Not just a quote, but a project outline"
  ,"Состав решения под объект, а не абстрактный список товаров.": "A solution composition for the site, not an abstract list of products."
  ,"Понимание, что можно закупать сразу, а что считать отдельно.": "An understanding of what can be purchased immediately and what should be estimated separately."
  ,"На выходе нужна рабочая рамка проекта": "The output should be a working project outline"
  ,"После расчёта проект идёт по понятной последовательности": "After the estimate, the project moves in a clear sequence"
  ,"Срок зависит от состава проекта и набора узлов.": "The timing depends on the project composition and the set of nodes."
  ,"Формат зависит от размера фермы и состава заказа.": "The format depends on the size of the farm and the order composition."
  ,"Сборка на месте, тест систем и запуск рабочей схемы.": "On-site assembly, system testing, and launch of the working scheme."
  ,"Нужны площадь, стадия проекта, задача и несколько ограничений по объекту.": "What is needed is the area, project stage, task, and a few site constraints."
  ,"Если цена ошибки уже заметна для проекта, правильнее сначала разобрать ситуацию, чем двигаться через случайные гипотезы.": "If the cost of a mistake is already visible for the project, it is better to review the situation first than move through random hypotheses."
  ,"Здесь важно увидеть цепочку решений и отклонений.": "Here it is important to see the chain of decisions and deviations."
  ,"План действий, который можно внедрять.": "An action plan that can actually be implemented."
  ,"Разбираем узлы, где реально теряются деньги": "We review the nodes where money is actually being lost"
  ,"Это отдельный маршрут для тех, кому сначала нужно собрать систему фермы в голове, а не разбирать свой объект.": "This is a separate route for those who first need to build a clear model of the farm in their head, not review their own site."
  ,"Понятно, что менять сначала, где первопричина и когда без сопровождения дальше лучше не двигаться.": "It becomes clear what to change first, where the root cause is, and when it is better not to move further without support."
  ,"Здесь важны не длинные описания, а факты: стадия проекта, масштаб, где сейчас главный затык и нужен ли точечный разбор или сопровождение.": "What matters here is not long descriptions, but facts: the project stage, scale, where the main blockage is right now, and whether you need a one-off review or support."
  ,"Здесь быстро выясняют, где реальная причина, что проверять первым и нужен ли дальше более длинный формат работы.": "Here you quickly find out where the real cause is, what to check first, and whether a longer work format is needed afterward."
  ,"Не общий совет, а следующий шаг": "Not generic advice, but the next step"
  ,"Разбираем один узкий вопрос, а не всю ферму сразу": "We review one narrow issue, not the whole farm at once"
  ,"Параметры среды и их влияние на цикл, генерацию и стабильность результата.": "Environmental parameters and their impact on the cycle, generation, and result stability."
  ,"Режим полива, схема подачи раствора, дефициты и управляемость корня.": "Irrigation regime, solution delivery pattern, deficits, and root-zone control."
  ,"Размер, вкус, плотность и то, как отклонения бьют по конечному результату.": "Size, taste, density, and how deviations hit the final result."
  ,"Это отдельный маршрут для тех, кому сначала нужно собрать систему фермы в голове, а не разбирать свой объект по узлам.": "This is a separate route for those who first need to build a clear mental model of the farm, not review their own site node by node."
  ,"После консультации у вас должен оставаться понятный следующий шаг по проекту.": "After the consultation, you should be left with a clear next step for the project."
  ,"Если вопрос закрывается точечно, вы идёте в закупку, расчёт или корректировку. Если нет, становится ясно, что задачу уже лучше вести в сопровождении.": "If the issue is resolved point-by-point, you move into procurement, estimating, or adjustment. If not, it becomes clear that the task is better carried forward in support."
  ,"Разовая консультация должна быть понятна заранее": "A one-off consultation should be clear in advance"
  ,"Понимаем, идти дальше в закупку, расчёт или сопровождение.": "We determine whether to move into procurement, estimating, or support."
  ,"Где консультации уже достаточно": "Where consultation alone is already enough"
  ,"Нужно быстро проверить решение до покупки": "Need to verify a decision before purchase"
  ,"Что происходит:": "What happens:"
  ,"Что даёт консультация:": "What consultation gives:"
  ,"вопрос уже сузился до одного узла, модели или развилки.": "the issue has already narrowed to one node, one model, or one decision branch."
  ,"появляется понятный ответ, что брать, а что пока не трогать.": "you get a clear answer on what to buy and what not to touch yet."
  ,"Есть сбой в действующей ферме": "There is a failure in an operating farm"
  ,"команда видит симптом, но не понимает, с чего начинать проверку.": "the team sees the symptom, but does not know where to begin the check."
  ,"появляется приоритетный порядок действий без хаоса и лишних гипотез.": "a priority action order appears without chaos and unnecessary hypotheses."
  ,"становится ясно, закрывается ли вопрос за один разбор или нужен другой формат.": "it becomes clear whether the issue can be closed in one review or needs another format."
  ,"Семенной путь и Frigo стоит смотреть как два разных сценария входа в ферму. Ниже весь актуальный набор, но выбирать его лучше уже с пониманием, что именно вы хотите запустить.": "Seeds and Frigo should be viewed as two different routes into the farm. Below is the full current lineup, but it is better to choose with a clear understanding of what exactly you want to launch."
  ,"Ранний гибрид с крупной ягодой и сладким вкусом с лёгкой кислинкой. Хороший ориентир под стабильную коммерческую ягоду.": "An early hybrid with a large berry and a sweet taste with light acidity. A strong option for stable commercial fruit."
  ,"Как смотреть эту позицию": "How to read this position"
  ,"Grodan Classic стоит брать тогда, когда схема корневой зоны уже определена": "Grodan Classic should be chosen when the root-zone scheme is already defined"
  ,"Мат хорош там, где уже понятны лоток, шаг посадки и логика полива.": "The slab works well where the tray, planting spacing, and irrigation logic are already clear."
  ,"Если меняется сама архитектура корневой зоны, лучше сначала сверить всю связку.": "If the root-zone architecture itself is changing, it is better to verify the whole bundle first."
  ,"Это типовой товар только внутри уже понятной фермерской схемы.": "It is a standard product only inside an already clear farm scheme."
  ,"Субстрат выбирают не отдельно, а в связке с лотком, поливом и типом посадочного материала.": "Substrate is not chosen in isolation, but together with the tray, irrigation, and planting material type."
  ,"Правильный мат влияет не только на старт, но и на управляемость корня и стабильность ягоды дальше.": "The right slab affects not only the start, but also root-zone control and berry stability later on."
  ,"Пробка выглядит мелочью, но работает только внутри уже понятной схемы": "The plug looks like a small item, but it only works inside an already clear scheme"
  ,"Она должна совпадать с матом, посадочным материалом и режимом полива.": "It must match the slab, the planting material, and the irrigation regime."
  ,"Если меняется субстратный сценарий, сам расходник тоже нужно проверять заново.": "If the substrate scenario changes, the consumable itself also needs to be checked again."
  ,"Это удобная типовая позиция, когда основа корневой зоны уже не обсуждается.": "It is a convenient standard item when the root-zone foundation is already settled."
  ,"Даже небольшие элементы работают нормально только тогда, когда вся связка посадки уже собрана правильно.": "Even small elements work properly only when the whole planting bundle has already been assembled correctly."
  ,"Если схема запуска ещё не зафиксирована, лучше сначала проверить fit, а потом уже добирать расходники.": "If the launch scheme is not fixed yet, it is better to check fit first and only then add consumables."
  ,"Трубку стоит брать тогда, когда линия уже посчитана": "The tube should be bought when the line is already calculated"
  ,"Позиция становится быстрой покупкой только внутри уже понятной схемы.": "The item becomes a quick purchase only inside an already clear scheme."
  ,"Сначала сверяют длину ряда, точки подключения и шаг капельниц.": "First you verify the row length, connection points, and dripper spacing."
  ,"Если меняется сама логика узла, сначала лучше сверить состав, а потом добирать расходники.": "If the node logic itself is changing, it is better to verify the composition first and only then add consumables."
  ,"Линию читают по ряду, а не по одной трубке.": "You read the line through the whole row, not through a single tube."
  ,"Даже типовой расходник должен совпасть с геометрией и обслуживанием.": "Even a standard consumable must match the geometry and service logic."
  ,"Бухта имеет смысл, когда вы уже понимаете расход по очереди": "The roll makes sense when you already understand the consumption for the phase"
  ,"Такой формат удобен, когда метраж и монтажный сценарий уже не плавают.": "This format is convenient when the meterage and installation scenario are already fixed."
  ,"Сначала сверяют длину линии на несколько рядов и запас под расширение.": "First you verify the line length for several rows and the reserve for expansion."
  ,"Если схема ещё собирается, объёмная покупка только добавит лишний остаток и шум.": "If the scheme is still being assembled, a large-volume purchase will only add excess leftovers and noise."
  ,"Бухту читают через объём ряда, а не как просто большую упаковку.": "You read the roll through row volume, not as just a bigger package."
  ,"Большой метраж оправдан только внутри уже понятной очереди.": "A large meterage is justified only inside an already clear phase."
  ,"Фитинги работают только внутри уже собранной схемы": "Fittings only work inside an already assembled scheme"
  ,"Комплект становится удобным, когда модуль уже понятен по геометрии и подаче.": "The kit becomes convenient when the module geometry and feed are already clear."
  ,"Даже небольшие фитинги должны совпасть с линией, переходами и сценарием обслуживания.": "Even small fittings must match the line, adapters, and service scenario."
  ,"Фитинги читают внутри уже понятного поливочного ряда.": "Fittings are read inside an already clear irrigation row."
  ,"Мелкие элементы должны совпасть с узлом, а не спорить с ним.": "Small elements must match the node rather than fight it."
  ,"Инструмент полезен только там, где схема уже не спорная": "The tool is useful only where the scheme is already settled"
  ,"Пробойник не выбирает диаметр и узел за вас, он лишь помогает аккуратно собрать уже понятную линию.": "The punch tool does not choose the diameter and node for you; it only helps assemble an already clear line neatly."
  ,"Если схема ещё плавает, инструмент покупают последним, а не первым.": "If the scheme is still uncertain, the tool is bought last, not first."
  ,"Инструмент нужен тогда, когда ряд и точки уже разложены на бумаге.": "The tool is needed when the row and points are already mapped out on paper."
  ,"Аккуратная сборка помогает только внутри уже понятной схемы.": "Neat assembly only helps inside an already clear scheme."
  ,"Базовый модуль нужно смотреть как первый рабочий фрагмент фермы": "The base module should be viewed as the first working fragment of the farm"
  ,"Сначала на проход, свет, лоток и обслуживание, а уже потом на цену одной ячейки.": "Start with aisle, light, tray, and service logic, and only then look at the price of one module."
  ,"Такой модуль удобен, когда нужно запустить понятный старт без расчёта всей очереди сразу.": "Such a module is convenient when you need to launch a clear start without estimating the entire phase at once."
  ,"Если вместе с ним уже меняются климат, полив и логика расширения, это повод идти в расчёт.": "If climate, irrigation, and expansion logic are changing together with it, that is a reason to move into estimating."
  ,"Модуль читают по рабочему ряду и доступу к растениям.": "The module is read through the working row and plant access."
  ,"Хороший стартовый фрагмент должен сразу показывать логику расширения.": "A good starter fragment should immediately show the expansion logic."
  ,"Дополнительный модуль нужен, когда базовая геометрия уже подтверждена": "An extra module is needed when the base geometry is already confirmed"
  ,"Он работает как шаг роста, а не как отдельная покупка вне существующей линии.": "It works as a growth step, not as a separate purchase outside the existing line."
  ,"Сначала проверяют, выдержит ли объект следующий ряд по свету, поливу и проходам.": "First you check whether the site can support the next row in terms of light, irrigation, and aisles."
  ,"Если расширение тянет за собой пересборку схемы, лучше сразу идти в расчёт.": "If the expansion drags a rebuild of the scheme with it, it is better to go straight into estimating."
  ,"Модуль должен продолжать уже работающую логику ряда.": "The module must continue the already working row logic."
  ,"Рост без пересборки возможен только на подтверждённой базе.": "Growth without rebuilding is only possible on a confirmed base."
  ,"Капельницу смотрят не как отдельную мелочь, а как часть всей линии": "A dripper is not viewed as a separate small item, but as part of the entire line"
  ,"Даже типовая позиция должна совпасть с расходом, длиной линии и схемой ряда.": "Even a standard item has to match the flow rate, line length, and row scheme."
  ,"Если меняется число растений или конфигурация модуля, пересматривать надо не только одну капельницу.": "If the number of plants or the module configuration changes, more than just the dripper needs to be reviewed."
  ,"Покупка становится быстрой, когда сама линия уже собрана на бумаге.": "The purchase becomes fast when the line itself has already been assembled on paper."
  ,"Неравномерность подачи редко выглядит критичной сразу, но быстро уходит в стресс по корню и нестабильность ряда.": "Uneven delivery rarely looks critical at once, but it quickly turns into root stress and row instability."
  ,"Если сам модуль ещё не собран, лучше сначала сверить схему линии, а потом уже добирать такие позиции.": "If the module itself is not assembled yet, it is better to verify the line scheme first and only then add positions like this."
};
