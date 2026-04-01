document.addEventListener("DOMContentLoaded", () => {
  const siteScript = document.querySelector('script[src$="site.js"]');
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
    <div class="ui-switch" role="group" aria-label="Language">
      <button class="ui-switch-btn" type="button" data-site-lang="ru">RU</button>
      <button class="ui-switch-btn" type="button" data-site-lang="en">EN</button>
    </div>
    <div class="ui-switch" role="group" aria-label="Theme">
      <button class="ui-switch-btn" type="button" data-site-theme="light" title="Light theme">LT</button>
      <button class="ui-switch-btn" type="button" data-site-theme="dark" title="Dark theme">DK</button>
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

  translateLeafNodes(normalizedLang);
  translateFieldAttributes(normalizedLang);
  translateDocumentTitle(normalizedLang);
  updateAriaLabels(normalizedLang);
  updateUiControlState(normalizedLang);
  syncBriefButtons();
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
      const copied = await copyText(text);

      if (status) {
        status.textContent = copied
          ? (lang === "en"
            ? "The brief has been copied. You can paste it into Telegram, email, or your CRM."
            : "Вводные скопированы. Их можно вставить в Telegram, письмо или CRM.")
          : (lang === "en"
            ? "Automatic copy failed. Please transfer the brief manually."
            : "Не удалось скопировать автоматически. Перенесите вводные вручную.");
      }

      button.textContent = copied
        ? (lang === "en" ? "Copied" : "Скопировано")
        : (lang === "en" ? "Copy brief" : "Собрать вводные");
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
  "Получить подбор": "Request подбор",
  "Получить подбор": "Request selection",
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
  "Начать расчёт": "Start the estimate",
  "Сначала понять, что я получу": "See what I get first",
  "Не “доступ к калькулятору”, а понятную рамку проекта": "Not “access to a calculator”, but a clear project outline",
  "Короткий поток без длинной анкеты и лишних полей": "A short flow without a long questionnaire or unnecessary fields",
  "Сначала отвечаете на несколько вопросов, потом сразу видите рамку проекта": "Answer a few questions first, then immediately see the project outline",
  "Назад": "Back",
  "Продолжить расчёт": "Continue the estimate",
  "Перейти к проектному расчёту": "Go to project estimate",
  "Вот что уже видно по вашим вводным": "Here is what is already visible from your inputs",
  "Открыть проектный расчёт": "Open project estimate",
  "Сценарии по урожайности и денежному потоку модели": "Yield and cash-flow scenarios for the model",
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
  "Нужна рекомендация по формату": "Need a format recommendation"
};
