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
  bindDraftForms();
  markActiveCompactNav();
  bindTopbarMenus();
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

function bindDraftForms() {
  document.querySelectorAll("[data-brief-form]").forEach((form) => {
    const button = form.querySelector("[data-brief-button]");
    const status = form.querySelector("[data-brief-status]");
    if (!button) return;

    const initialLabel = button.textContent.trim();

    button.addEventListener("click", async () => {
      const lines = buildBriefLines(form);

      if (!lines.length) {
        if (status) status.textContent = "Заполните хотя бы одно поле, чтобы собрать вводные.";
        return;
      }

      const title = form.dataset.briefForm || document.title;
      const text = [`${title}`, "", ...lines].join("\n");
      const copied = await copyText(text);

      if (status) {
        status.textContent = copied
          ? "Вводные скопированы. Их можно вставить в Telegram, письмо или CRM."
          : "Не удалось скопировать автоматически. Перенесите вводные вручную.";
      }

      button.textContent = copied ? "Скопировано" : "Собрать вводные";
      window.setTimeout(() => {
        button.textContent = initialLabel;
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
