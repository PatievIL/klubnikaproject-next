# KlubnikaProject Backend

Минимальный backend-слой под сайт и будущую CRM.

Что закрывает сейчас:

- `site settings` как единый JSON-конфиг
- `admin auth` через token, пароль и secure session cookie
- `member auth` через логин/пароль и отдельную member session cookie
- приём `leads` от публичных форм
- `lead inbox` и обновление лидов из внутреннего кабинета
- `catalog data-layer` как отдельный manifest под категории и ключевые позиции
- `users / roles` как первый access-layer под внутреннюю CRM
- `lead events` как история изменений по лиду
- bridge в отдельный CRM-сервис после локального сохранения лида

Базовые маршруты:

- `GET /v1/health`
- `GET /v1/public/settings`
- `GET /v1/public/catalog/items`
- `POST /v1/public/leads`
- `POST /v1/admin/auth/verify`
- `POST /v1/admin/auth/login`
- `POST /v1/admin/auth/password-login`
- `GET /v1/admin/auth/session`
- `POST /v1/admin/auth/logout`
- `GET /v1/admin/settings`
- `PUT /v1/admin/settings`
- `GET /v1/admin/catalog/items`
- `PUT /v1/admin/catalog/items`
- `GET /v1/admin/users`
- `POST /v1/admin/users`
- `PATCH /v1/admin/users/{id}`
- `POST /v1/admin/users/{id}/set-password`
- `POST /v1/admin/users/{id}/rotate-key`
- `POST /v1/auth/login`
- `GET /v1/auth/session`
- `POST /v1/auth/logout`
- `GET /v1/member/catalog/items`
- `GET /v1/member/special-pages`
- `GET /v1/admin/leads`
- `GET /v1/admin/leads/{id}`
- `GET /v1/admin/leads/{id}/events`
- `PATCH /v1/admin/leads/{id}`

Дополнительные env для CRM bridge:

- `KP_CRM_BASE_URL` — базовый URL нового CRM-сервиса, например `http://127.0.0.1:8020`
- `KP_CRM_PUBLIC_TOKEN` — токен для `POST /v1/public/leads` нового CRM, если включена защита ingest
- `KP_CRM_INTERNAL_TOKEN` — internal bearer token для admin proxy в CRM service
- `KP_CRM_FORWARD_TIMEOUT_SECONDS` — timeout отправки в CRM, по умолчанию `4`

Через admin proxy теперь также доступны:

- CRM workspace routes
- CRM tasks / follow-up routes
- manual dispatch лида в contact layer
- contact config status
- notification deliveries
- retry notification delivery
- webhook endpoints
- webhook deliveries
- retry webhook delivery

## Локальный запуск

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
set -a && source .env && set +a
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Проверка:

```bash
curl http://127.0.0.1:8010/v1/health
```
