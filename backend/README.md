# KlubnikaProject Backend

Минимальный backend-слой под сайт и будущую CRM.

Что закрывает сейчас:

- `site settings` как единый JSON-конфиг
- `admin auth` через bearer token и secure session cookie
- приём `leads` от публичных форм
- `lead inbox` и обновление лидов из внутреннего кабинета
- `catalog data-layer` как отдельный manifest под категории и ключевые позиции

Базовые маршруты:

- `GET /v1/health`
- `GET /v1/public/settings`
- `GET /v1/public/catalog/items`
- `POST /v1/public/leads`
- `POST /v1/admin/auth/verify`
- `POST /v1/admin/auth/login`
- `GET /v1/admin/auth/session`
- `POST /v1/admin/auth/logout`
- `GET /v1/admin/settings`
- `PUT /v1/admin/settings`
- `GET /v1/admin/catalog/items`
- `PUT /v1/admin/catalog/items`
- `GET /v1/admin/leads`
- `GET /v1/admin/leads/{id}`
- `PATCH /v1/admin/leads/{id}`

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
