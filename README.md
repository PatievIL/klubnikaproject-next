# KlubnikaProject

Отдельная рабочая папка под новый сайт `KlubnikaProject`.

База взята из актуального прототипа `klubnika-sprint1`, но вынесена в отдельный каталог без старого `.git`, чтобы дальше вести проект отдельно.

## Что внутри

- `index.html` — главная как маршрутизатор спроса
- `farm/index.html` — сценарий расчёта фермы
- `study/index.html` — сценарий консультаций и сопровождения
- `shop/index.html` — магазин как каталог решений
- `seeds/index.html` — раздел посадочного материала
- `styles.css` — общая дизайн-система
- `docs/strategy-brief.md` — рабочий CRO/UX-бриф по новой версии
- `docs/brand-ui-visual-guide.md` — опорная visual/UI-инструкция по бренду, сайту и адаптации
- `docs/brand-ui-visual-guide.pdf` — экспорт этой инструкции в PDF
- `docs/klubnikaproject-brandbook-project.pdf` — визуальный брендбук в формате проектного документа
- `docs/klubnikaproject-brandbook-project-v2.pdf` — усиленная art-directed версия брендбука с key screens
- `docs/catalog-cro-prompt.md` — рабочий prompt-стандарт для category/product pages
- `calc/index.html` — новый калькулятор фермы
- `calc/pricing.json` — цены и расчётные константы калькулятора
- `admin/index.html` — единый внутренний кабинет сайта, форм и CRM-схемы
- `calc/admin/index.html` — внутренняя страница редактирования draft-цен с экспортом JSON
- `site.js` — общий UI-слой, язык/тема, формы и привязка к admin-config
- `crm/` — отдельный контур под новый CRM-проект и инструкцию для Codex

Отдельный CRM-контур:

- `crm/README.md` — запуск и устройство нового CRM backend
- `crm/CODEX_INSTRUCTIONS.md` — ТЗ для дальнейшей разработки CRM как отдельного проекта

## Локальный запуск

```bash
cd /path/to/klubnikaproject
python3 -m http.server 8011 --bind 127.0.0.1
```

После запуска:

`http://127.0.0.1:8011/`

Дополнительно:

- `http://127.0.0.1:8011/admin/`
- `http://127.0.0.1:8011/calc/`
- `http://127.0.0.1:8011/calc/admin/`

Боевой стенд:

- `https://patievil.github.io/klubnikaproject-next/`
- `https://patievil.github.io/klubnikaproject-next/admin/`
- `https://patievil.github.io/klubnikaproject-next/calc/`

## PDF бренд-гайда

Пересобрать PDF из markdown-источника:

```bash
cd /path/to/klubnikaproject
python3 scripts/build-brand-guide-pdf.py
```

Пересобрать визуальный проектный брендбук:

```bash
cd /path/to/klubnikaproject
python3 scripts/build-brandbook-project-pdf.py
```

Пересобрать визуальный брендбук `v2`:

```bash
cd /path/to/klubnikaproject
python3 scripts/build-brandbook-project-v2.py
```

Примечания:

- Скрипты сами определяют корень проекта от своего расположения, абсолютные пути больше не нужны.
- Для сборки нужен `python3` с `Pillow`, `reportlab` и доступный системный шрифт `Arial` или `DejaVu Sans`.
- `build-brandbook-project*.py` используют `qlmanage` для рендера SVG preview и нормально работают на macOS. На другой системе либо задайте `KP_FONT_REGULAR` / `KP_FONT_BOLD`, либо предварительно положите PNG-preview в `docs/.brandbook-cache/`.

## SEO / GEO пакет

В проект добавлен технический SEO/GEO-пакет. Это не разовая заметка, а рабочая поддержка сайта в коде.

Что входит:

- `scripts/build-seo.mjs` — обновляет `canonical`, `robots`, JSON-LD и нормализует бренд в `<title>`
- `robots.txt` — закрывает служебные разделы и публикует sitemap
- `sitemap.xml` — собирается автоматически из индексируемых HTML-страниц
- этот `README.md` — короткая инструкция по поддержке

Запуск:

```bash
cd /path/to/klubnikaproject
node scripts/build-seo.mjs
```

Что делает пакет:

- ставит `canonical` на все индексируемые HTML-страницы
- добавляет `robots`-meta
- закрывает служебные разделы от индексации, включая `admin/` и `calc/admin/`
- генерирует JSON-LD по типу страницы: `WebPage`, `Organization`, `WebSite`, `BreadcrumbList`, `Product`, `FAQPage`
- пересобирает `sitemap.xml`
- нормализует бренд в `<title>` под `Klubnika Project`

Примеры уже в проекте:

- главная: `index.html`
- продуктовая карточка: `shop/products/led-300wt/index.html`
- админ кабинет с `noindex`: `admin/index.html`
- админка с `noindex`: `calc/admin/index.html`

Когда запускать:

- после добавления новых страниц
- после переименования URL или разделов
- после изменений в логике индексации

Текущее состояние на сегодня:

- обработано `47` HTML-страниц
- в `sitemap.xml` входит `43` публичных URL
- служебные разделы выведены из индексации

Полезные ориентиры по поддержке:

- Google Search Central: SEO Starter Guide
- Google Search Central: canonical / duplicate URLs
- Google Search Central: site names
- Google Search Central: AI features

## Рабочая логика проекта

Новая структура сайта строится вокруг трёх основных сценариев:

1. `Расчёт фермы`
2. `Магазин / подбор оборудования`
3. `Консультации / сопровождение`

Главная не должна продавать всё сразу. Её задача — быстро отправить пользователя в правильный сценарий.

## Админ-слой и формы

Сайт уже умеет читать часть runtime-настроек из единого админ-кабинета:

- контакты и Telegram handoff
- режим работы публичных форм
- обязательные CRM-поля
- success/status copy

Текущая схема теперь смешанная:

- `/admin/` хранит локальный draft, но умеет входить в backend-сессию и тянуть/сохранять боевые настройки
- публичные формы читают runtime-конфиг через `site.js` и отправляют лиды в backend
- lead inbox уже читает реальные лиды из API
- catalog manifest вынесен в отдельный backend layer как задел под CMS-lite
- пользователи и роли доступа вынесены в backend как первый access-layer
- история изменений по лидам уже пишется в `lead events`

Это позволяет дальше развивать сайт уже не как набор HTML-страниц с ручным handoff, а как управляемую систему.

## Runtime backend

Backend уже поднят на существующей VM `farms-vm` в Google Cloud. Он не смешан с FarmS по папкам и крутится как отдельный сервис.

Текущий layout на VM:

- `/opt/farms` — действующий FarmS runtime
- `/opt/klubnikaproject-backend/app` — будущий backend-код
- `/opt/klubnikaproject-backend/shared/config` — `.env` и конфиг
- `/opt/klubnikaproject-backend/shared/logs` — логи
- `/opt/klubnikaproject-backend/shared/uploads` — uploads
- `/opt/klubnikaproject-backend/shared/backups` — backups
- `/opt/klubnikaproject-backend/deploy` — шаблоны `systemd` и `caddy`

На VM уже подготовлены и используются:

- `README-BOOTSTRAP.md`
- `.env.example`
- `klubnikaproject-backend.service.example`
- `klubnikaproject-api.caddy.example`

Публичный API:

- `https://api.klubnikaproject.ru/site/v1/health`
- `https://api.klubnikaproject.ru/site/v1/public/settings`
- `https://api.klubnikaproject.ru/site/v1/public/catalog/items`

Внутренний слой через `/admin/` уже умеет:

- backend login / session / logout
- тянуть и сохранять site settings
- работать с lead inbox
- обновлять статус / owner / note у лида
- смотреть историю изменений лида
- управлять первым слоем пользователей и ролей
- редактировать catalog manifest

Доступ:

- внешний `22` не использовался
- рабочий доступ получен через Tailscale / внутренний ssh-контур
- serial console включена как аварийный fallback

## Актуальный roadmap по блокам

### Block N: CRM Core

Статус:

- вынесен в отдельную сессию и отдельный CRM-контур `crm/`
- не является текущим активным блоком в основном сайте

Что относится сюда:

- pipeline / inbox / карточка лида
- комментарии, follow-up, owner, stage, tags
- отдельный CRM UI и логика работы команды
- интеграционный слой под `amoCRM`

Ориентиры:

- `crm/README.md`
- `crm/CODEX_INSTRUCTIONS.md`

### Block O: Catalog Data Layer

Статус:

- отложен до завершения внешнего анализа каталога
- инструкция по реализации будет добавлена отдельно после анализа

Что относится сюда:

- единая модель категорий и товаров
- SEO-поля и CTA-mode
- изображения, related items, compatibility
- хранение контента каталога в data-layer, а не в ручном HTML

Важно:

- сейчас не перепроектировать каталог наугад
- дождаться итоговой инструкции после анализа ассортимента

### Block Q: Auth and Security

Статус:

- текущий активный backend-блок для основного проекта

Что уже сделано:

- backend session login / logout
- secure cookie session для `/admin/`
- users / roles как первый access-layer
- lead events / history
- временный SSH-ключ удалён с VM

Что ещё относится сюда:

- нормальный login flow вместо access key everywhere
- audit log действий в админке
- rate limiting на auth и формы
- cleanup по CORS / cookie / admin access
- дальнейшее усиление production-безопасности

### Неактивные блоки по умолчанию

Пока без отдельной инструкции не начинать:

- `Block N: CRM Core`
- `Block O: Catalog Data Layer`

Текущий приоритет по основному проекту:

- `Block Q: Auth and Security`
