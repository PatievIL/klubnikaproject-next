# Codex Instructions: Separate CRM Project

## Статус блока

Этот документ относится к отдельному roadmap-блоку:

- `Block N: CRM Core`

Правило для следующих сессий:

- CRM развивается отдельно от основного сайта;
- задачи из этого файла не смешивать с текущим основным backend-блоком сайта, если это не оговорено отдельно;
- основной сайт и его backend могут только интегрироваться с CRM-контуром, но не подменять его.

## Контекст

Текущий проект `KlubnikaProject` уже умеет:

- принимать публичные лиды с сайта;
- сохранять их в локальный backend;
- показывать lead inbox в админке;
- работать в смешанном режиме "сайт + backend + ручной CRM handoff".

Бизнес-решение:

- CRM нужно развивать как отдельный проект;
- сейчас нужен адаптер к `amoCRM`;
- в будущем CRM должна полностью переехать на свою реализацию;
- поэтому `amoCRM` нельзя закладывать как центр архитектуры.

## Главный архитектурный принцип

Нельзя строить систему по схеме `site -> amoCRM`.

Нужно строить систему по схеме:

`site -> site backend -> crm service -> crm adapters -> amoCRM`

Где:

- `crm service` — наш источник истины по лидам, статусам, owner, задачам и истории;
- `amoCRM` — внешний sink/source, который работает через adapter layer;
- доменная модель CRM принадлежит нам, а не `amoCRM`.

## Цель проекта

Сделать отдельный CRM-проект, который:

- принимает лиды из сайта и других каналов;
- хранит собственную доменную модель лида;
- ведёт pipeline, owner, note, task и историю событий;
- синхронизируется с `amoCRM` через отдельный адаптер;
- допускает последующее отключение `amoCRM` без миграции ядра.

## Non-goals для первой итерации

Не делать в первой итерации:

- полный UI новой CRM;
- биллинг;
- склад;
- сложную аналитику;
- чат-центр;
- двустороннюю синхронизацию всех сущностей `amoCRM`;
- прямую отправку лидов из фронтенда в `amoCRM`.

## Границы ответственности

### Сайт

Сайт отвечает только за:

- сбор формы;
- первичную валидацию UX-уровня;
- отправку лида в backend сайта.

### Backend сайта

Backend сайта отвечает за:

- приём лида от формы;
- локальное сохранение входящего запроса;
- отправку нормализованного события в CRM-сервис;
- отображение статуса доставки.

### CRM-сервис

CRM-сервис отвечает за:

- доменную модель;
- lead inbox;
- pipeline;
- owner;
- notes;
- tasks;
- event log;
- external adapters;
- retry и sync status.

### `amoCRM` adapter

Адаптер отвечает только за:

- auth / token refresh;
- mapping внешних полей;
- push / pull в `amoCRM`;
- сохранение внешних идентификаторов;
- логирование sync-ошибок.

Он не должен хранить бизнес-логику pipeline как единственный источник истины.

## Целевая структура нового проекта

Если создаётся отдельная кодовая база, стартовая структура должна быть такой:

```text
crm/
  README.md
  CODEX_INSTRUCTIONS.md
  app/
    main.py
    config.py
    db.py
    domain/
      leads.py
      contacts.py
      pipelines.py
      tasks.py
      events.py
    services/
      lead_service.py
      sync_service.py
      task_service.py
    adapters/
      inbound/
        site_api.py
      outbound/
        amocrm.py
    repositories/
      leads_repo.py
      contacts_repo.py
      pipelines_repo.py
      events_repo.py
    schemas/
      public.py
      internal.py
      sync.py
    workers/
      sync_worker.py
  tests/
```

Если на первой фазе работа остаётся в текущем репозитории, этот layout всё равно использовать как целевую модель модулей.

## Доменная модель

Нужно ввести собственные сущности.

### Lead

Поля минимум:

- `id`
- `created_at`
- `updated_at`
- `source`
- `channel`
- `route`
- `page_path`
- `page_title`
- `form_name`
- `name`
- `phone`
- `email`
- `telegram`
- `project_stage`
- `request_type`
- `message`
- `brief_text`
- `payload_json`
- `status_code`
- `owner_id`
- `priority`
- `temperature`
- `last_contact_at`
- `next_action_at`
- `is_archived`

### Contact

Поля минимум:

- `id`
- `name`
- `phone`
- `email`
- `telegram`
- `company_name`
- `note`

### Pipeline

Поля минимум:

- `id`
- `code`
- `name`
- `sort_order`
- `is_default`

### PipelineStatus

Поля минимум:

- `id`
- `pipeline_id`
- `code`
- `name`
- `sort_order`
- `is_closed`
- `close_reason`

### LeadEvent

Поля минимум:

- `id`
- `lead_id`
- `event_type`
- `actor_type`
- `actor_id`
- `payload_json`
- `created_at`

### ExternalSyncState

Поля минимум:

- `id`
- `entity_type`
- `entity_id`
- `provider`
- `external_id`
- `sync_status`
- `last_attempt_at`
- `last_success_at`
- `last_error`
- `payload_snapshot_json`

## Архитектурные правила

1. Внутренние статусы CRM должны жить в нашей таблице статусов.
2. Маппинг в статусы `amoCRM` должен быть отдельной конфигурацией.
3. Внутренний `lead.id` не равен `amo_lead_id`.
4. Нельзя сохранять `amo`-специфичные поля прямо в ядро сущности без adapter-layer.
5. Любая интеграция с внешней CRM должна быть идемпотентной.
6. Любая входящая заявка должна сначала сохраняться локально, потом синкаться наружу.
7. Ошибка `amoCRM` не должна приводить к потере лида.

## Контракт между backend сайта и CRM

Backend сайта должен отправлять в CRM нормализованный payload.

Минимальный входной контракт:

```json
{
  "source": "site",
  "channel": "web_form",
  "route": "Расчёт фермы",
  "page_path": "/farm/",
  "page_title": "Расчёт фермы",
  "form_name": "Расчёт фермы — вводные по объекту",
  "name": "Имя клиента",
  "phone": "+66...",
  "email": "client@example.com",
  "telegram": "@client",
  "project_stage": "Запуск",
  "request_type": "Нужен расчёт",
  "message": "Короткий запрос",
  "brief_text": "Полный текст вводных",
  "payload": {
    "Площадь": "120 м2",
    "Город": "Bangkok"
  }
}
```

## API CRM-сервиса: первая итерация

Нужно спроектировать минимум такие маршруты:

- `GET /v1/health`
- `POST /v1/public/leads`
- `GET /v1/internal/leads`
- `GET /v1/internal/leads/{id}`
- `PATCH /v1/internal/leads/{id}`
- `GET /v1/internal/leads/{id}/events`
- `POST /v1/internal/leads/{id}/retry-sync`
- `GET /v1/internal/pipelines`
- `GET /v1/internal/users`

Если нужен auth, он должен быть внутренним и не завязан на `amoCRM`.

## Sync-стратегия

Использовать схему `store first, sync second`.

Последовательность:

1. CRM получает лид.
2. CRM сохраняет лид в своей БД.
3. CRM пишет событие `lead.created`.
4. CRM ставит задачу на sync во внешний adapter.
5. Worker синкает лид в `amoCRM`.
6. Результат sync пишется в `ExternalSyncState`.
7. При ошибке лидер остаётся доступным внутри CRM.

## Требования к `amoCRM` adapter

Адаптер должен уметь:

- получать и обновлять OAuth токены;
- создавать или находить контакт;
- создавать сделку;
- добавлять note;
- обновлять статус сделки;
- хранить `external_id`;
- корректно ретраить временные ошибки;
- различать retryable и non-retryable ошибки.

Адаптер не должен:

- определять внутренние стадии CRM;
- содержать бизнес-решения про qualification;
- менять внутреннюю модель CRM под ограничения `amoCRM`.

## Конфиг и секреты

Секреты только через env или секрет-хранилище.

Минимум:

- `CRM_APP_ENV`
- `CRM_APP_HOST`
- `CRM_APP_PORT`
- `CRM_DB_PATH`
- `CRM_INTERNAL_TOKEN`
- `AMO_BASE_URL`
- `AMO_CLIENT_ID`
- `AMO_CLIENT_SECRET`
- `AMO_REDIRECT_URI`
- `AMO_ACCESS_TOKEN`
- `AMO_REFRESH_TOKEN`

Запрещено:

- хардкодить токены в коде;
- отдавать токены в публичный frontend;
- хранить refresh token в браузере.

## База данных: первая версия

Нужно подготовить таблицы:

- `contacts`
- `leads`
- `pipelines`
- `pipeline_statuses`
- `users`
- `lead_events`
- `tasks`
- `external_sync_states`
- `oauth_credentials`

## Начальный pipeline

Во внутренней CRM использовать свои коды статусов, например:

- `new`
- `qualified`
- `needs_estimate`
- `needs_consultation`
- `proposal_sent`
- `in_progress`
- `won`
- `lost`

Маппинг в `amoCRM` хранить отдельно, например:

```json
{
  "new": {
    "pipeline_id": 123,
    "status_id": 111
  },
  "qualified": {
    "pipeline_id": 123,
    "status_id": 112
  }
}
```

## Очереди и retry

Если отдельной очереди пока нет, допустим SQLite-backed outbox или таблица job-ов.

Минимум нужно:

- `pending`
- `processing`
- `succeeded`
- `failed`
- `retry_at`
- `attempt_count`

## Наблюдаемость

Нужно логировать:

- входящий lead request;
- создание лида;
- старт sync;
- успешный sync;
- ответ `amoCRM` с ошибкой;
- refresh token;
- ручной retry.

Нужно отделять:

- бизнес-события;
- технические ошибки;
- ошибки внешнего провайдера.

## Тесты

Обязательные тесты первой волны:

1. Создание лида без внешнего sync.
2. Создание лида с успешным sync в mock `amoCRM`.
3. Ошибка `amoCRM` не ломает локальное сохранение.
4. Повторный retry после ошибки создаёт успешный sync state.
5. Дубли по телефону не плодят лишние контакты, если выбран такой режим дедупликации.
6. Маппинг внутреннего статуса в `amoCRM` работает через отдельный конфиг.

## План реализации

### Фаза 1. Domain-first foundation

Сделать:

- отдельный CRM-модуль;
- БД и миграции;
- доменные сущности;
- API для приёма лидов;
- event log;
- внутренние статусы;
- базовый internal auth.

Результат:

- CRM работает без `amoCRM`.

### Фаза 2. `amoCRM` adapter

Сделать:

- OAuth;
- token refresh;
- create contact;
- create lead;
- note sync;
- sync state;
- retry.

Результат:

- CRM остаётся основой, `amoCRM` только внешняя интеграция.

### Фаза 3. Site integration

Сделать:

- backend сайта отправляет лид не в `amoCRM`, а в CRM-сервис;
- backend сайта хранит `crm_lead_id`;
- текущий lead inbox либо постепенно переносится, либо читает CRM API.

Результат:

- сайт уже не зависит от `amoCRM` напрямую.

### Фаза 4. Internal CRM operations

Сделать:

- owner assignment;
- notes;
- tasks;
- manual retry sync;
- фильтры inbox;
- timeline.

### Фаза 5. `amoCRM` deprecation readiness

Сделать:

- убрать `amo`-специфичные assumptions из внутренних сервисов;
- подготовить режим `adapter disabled`;
- убедиться, что CRM продолжает работать автономно.

## Что Codex должен сделать первым

При начале реализации идти в таком порядке:

1. Выделить CRM как отдельный модуль/сервис.
2. Зафиксировать доменную модель и таблицы.
3. Поднять `POST /v1/public/leads` уже в новом CRM-контуре.
4. Сделать локальное сохранение и event log.
5. Только потом добавлять `amoCRM` adapter.

## Что Codex делать не должен

Codex не должен:

- внедрять `amoCRM`-специфику в core models;
- делать `amo_lead_id` первичным идентификатором;
- отправлять формы напрямую из `site.js` в `amoCRM`;
- строить новую CRM вокруг существующих ограничений `amoCRM`;
- связывать internal auth CRM с OAuth `amoCRM`.

## Definition of Done для MVP

MVP считается готовым, когда:

1. Сайт может отправить лид в отдельный CRM-сервис.
2. CRM сохраняет лид локально как источник истины.
3. CRM пишет события по лиду.
4. CRM умеет синкать лид в `amoCRM` через adapter.
5. Ошибка `amoCRM` не теряет лид.
6. Есть ручной retry sync.
7. Есть тесты на основной happy path и failure path.
