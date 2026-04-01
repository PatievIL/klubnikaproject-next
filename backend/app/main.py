from __future__ import annotations

import json
import os
import sqlite3
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class AppConfig:
    app_env: str
    app_host: str
    app_port: int
    site_url: str
    public_site_origin: str
    api_public_base: str
    admin_token: str
    db_path: Path
    cors_origins: list[str]


def load_config() -> AppConfig:
    root = Path(__file__).resolve().parents[1]
    db_path = Path(os.environ.get("KP_DB_PATH", root / "data" / "klubnikaproject.db"))
    raw_origins = os.environ.get(
        "KP_CORS_ORIGINS",
        "https://patievil.github.io,http://127.0.0.1:8011,http://localhost:8011",
    )
    return AppConfig(
        app_env=os.environ.get("KP_APP_ENV", "development"),
        app_host=os.environ.get("KP_APP_HOST", "127.0.0.1"),
        app_port=int(os.environ.get("KP_APP_PORT", "8010")),
        site_url=os.environ.get("KP_SITE_URL", "https://patievil.github.io/klubnikaproject-next/"),
        public_site_origin=os.environ.get("KP_PUBLIC_SITE_ORIGIN", "https://klubnikaproject.ru"),
        api_public_base=os.environ.get("KP_API_PUBLIC_BASE", "https://api.klubnikaproject.ru/site/v1"),
        admin_token=os.environ.get("KP_ADMIN_TOKEN", "change-me"),
        db_path=db_path,
        cors_origins=[origin.strip() for origin in raw_origins.split(",") if origin.strip()],
    )


CONFIG = load_config()


DEFAULT_SITE_SETTINGS: dict[str, Any] = {
    "site": {
        "projectName": "Klubnika Project",
        "publicUrl": "https://patievil.github.io/klubnikaproject-next/",
        "primaryDomain": "https://klubnikaproject.ru/",
        "supportTelegram": "@patiev_admin",
        "supportTelegramUrl": "https://t.me/patiev_admin",
        "supportEmail": "hello@klubnikaproject.ru",
        "supportWhatsapp": "",
        "defaultLanguage": "ru",
        "defaultTheme": "light",
        "activeLogoSystem": "manual-primary",
    },
    "forms": {
        "mode": "backend_submit",
        "primaryChannel": "crm",
        "handoffPrefix": "Новая заявка с сайта Klubnika Project",
        "successHint": "Вводные сохранены в системе. Если нужен быстрый ручной контакт, их можно продублировать в Telegram.",
        "openTelegramAfterCopy": False,
        "collectEmail": True,
        "collectPhone": True,
        "collectTelegram": True,
        "collectStage": True,
    },
    "seo": {
        "titleSuffix": "— Klubnika Project",
        "defaultDescription": "Расчёт, магазин, подбор и сопровождение для клубничных ферм в контролируемой среде.",
        "canonicalOrigin": "https://klubnikaproject.ru",
        "indexPublicPages": True,
        "indexAdminPages": False,
        "includeSitemap": True,
    },
    "crm": {
        "enabled": False,
        "inboxMode": "manual",
        "owner": "Илья",
        "futureWebhook": "",
        "leadSources": [
            "Главная форма",
            "Калькулятор",
            "Магазин",
            "Консультации",
            "Курс",
            "Telegram",
        ],
        "pipeline": [
            "Новый лид",
            "Квалификация",
            "Нужен расчёт",
            "Нужна консультация",
            "Смета отправлена",
            "Сделка в работе",
            "Закрыто",
        ],
        "requiredFields": [
            "Имя",
            "Контакт",
            "Сценарий",
            "Стадия проекта",
            "Что нужно",
            "Источник",
        ],
        "note": "Следующий этап: lead inbox, история касаний, owner, дедлайны и webhook в CRM.",
    },
    "pages": [
        {
            "id": "home",
            "label": "Главная",
            "goal": "Маршрутизатор",
            "primaryCta": "Рассчитать ферму",
            "secondaryCta": "Перейти в магазин",
            "status": "published",
        },
        {
            "id": "shop",
            "label": "Магазин",
            "goal": "Выбор категории и товара",
            "primaryCta": "Подобрать комплект",
            "secondaryCta": "Смотреть категории",
            "status": "published",
        },
        {
            "id": "farm",
            "label": "Расчёт фермы",
            "goal": "Собрать вводные и рамку сметы",
            "primaryCta": "Передать вводные",
            "secondaryCta": "Открыть калькулятор",
            "status": "published",
        },
        {
            "id": "study",
            "label": "Сопровождение",
            "goal": "Длинная работа по действующей ферме",
            "primaryCta": "Оставить задачу",
            "secondaryCta": "Посмотреть форматы",
            "status": "published",
        },
        {
            "id": "consultations",
            "label": "Консультации",
            "goal": "Точечный разбор",
            "primaryCta": "Разобрать задачу",
            "secondaryCta": "Сравнить с сопровождением",
            "status": "published",
        },
        {
            "id": "calc",
            "label": "Калькулятор",
            "goal": "Быстрый ориентир",
            "primaryCta": "Начать расчёт",
            "secondaryCta": "Понять, что получу",
            "status": "published",
        },
    ],
    "integrations": {
        "calculatorPricingAdmin": "/calc/admin/",
        "siteAdmin": "/admin/",
        "catalogSource": "static-html",
        "futureCms": "JSON/CMS-lite",
        "futureCrm": "Lead inbox + pipeline",
        "apiBase": "https://api.klubnikaproject.ru/site/v1",
        "note": "Под этот JSON дальше можно подвязать backend, не меняя логику секций.",
    },
}


class AuthRequest(BaseModel):
    token: str = Field(min_length=1)


class SettingsEnvelope(BaseModel):
    settings: dict[str, Any]


class LeadCreateRequest(BaseModel):
    source: str = ""
    route: str = ""
    page_path: str = ""
    page_title: str = ""
    form_name: str = ""
    name: str = ""
    contact: str = ""
    email: str = ""
    phone: str = ""
    telegram: str = ""
    stage: str = ""
    what_needed: str = ""
    message: str = ""
    brief_text: str = ""
    lines: list[str] = Field(default_factory=list)
    payload: dict[str, Any] = Field(default_factory=dict)


class LeadUpdateRequest(BaseModel):
    status: str | None = None
    owner: str | None = None
    note: str | None = None


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def db_connect() -> sqlite3.Connection:
    ensure_parent(CONFIG.db_path)
    connection = sqlite3.connect(CONFIG.db_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with closing(db_connect()) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS site_settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              payload_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS leads (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              source TEXT NOT NULL,
              route TEXT NOT NULL,
              page_path TEXT NOT NULL,
              page_title TEXT NOT NULL,
              form_name TEXT NOT NULL,
              name TEXT NOT NULL,
              contact TEXT NOT NULL,
              email TEXT NOT NULL,
              phone TEXT NOT NULL,
              telegram TEXT NOT NULL,
              stage TEXT NOT NULL,
              what_needed TEXT NOT NULL,
              message TEXT NOT NULL,
              brief_text TEXT NOT NULL,
              lines_json TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              status TEXT NOT NULL,
              owner TEXT NOT NULL,
              note TEXT NOT NULL
            );
            """
        )
        row = connection.execute("SELECT payload_json FROM site_settings WHERE id = 1").fetchone()
        if row is None:
            connection.execute(
                "INSERT INTO site_settings (id, payload_json, updated_at) VALUES (1, ?, ?)",
                (json.dumps(DEFAULT_SITE_SETTINGS, ensure_ascii=False), utc_now()),
            )
        connection.commit()


def read_settings() -> dict[str, Any]:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT payload_json FROM site_settings WHERE id = 1").fetchone()
        if row is None:
            return json.loads(json.dumps(DEFAULT_SITE_SETTINGS))
        return json.loads(row["payload_json"])


def write_settings(payload: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    with closing(db_connect()) as connection:
        connection.execute(
            """
            INSERT INTO site_settings (id, payload_json, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
            """,
            (json.dumps(payload, ensure_ascii=False), now),
        )
        connection.commit()
    return payload


def sanitize_public_settings(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "site": {
            "projectName": payload.get("site", {}).get("projectName", DEFAULT_SITE_SETTINGS["site"]["projectName"]),
            "publicUrl": payload.get("site", {}).get("publicUrl", DEFAULT_SITE_SETTINGS["site"]["publicUrl"]),
            "primaryDomain": payload.get("site", {}).get("primaryDomain", DEFAULT_SITE_SETTINGS["site"]["primaryDomain"]),
            "supportTelegram": payload.get("site", {}).get("supportTelegram", DEFAULT_SITE_SETTINGS["site"]["supportTelegram"]),
            "supportTelegramUrl": payload.get("site", {}).get("supportTelegramUrl", DEFAULT_SITE_SETTINGS["site"]["supportTelegramUrl"]),
            "supportEmail": payload.get("site", {}).get("supportEmail", DEFAULT_SITE_SETTINGS["site"]["supportEmail"]),
            "supportWhatsapp": payload.get("site", {}).get("supportWhatsapp", DEFAULT_SITE_SETTINGS["site"]["supportWhatsapp"]),
            "defaultLanguage": payload.get("site", {}).get("defaultLanguage", DEFAULT_SITE_SETTINGS["site"]["defaultLanguage"]),
            "defaultTheme": payload.get("site", {}).get("defaultTheme", DEFAULT_SITE_SETTINGS["site"]["defaultTheme"]),
            "activeLogoSystem": payload.get("site", {}).get("activeLogoSystem", DEFAULT_SITE_SETTINGS["site"]["activeLogoSystem"]),
        },
        "forms": {
            "mode": payload.get("forms", {}).get("mode", DEFAULT_SITE_SETTINGS["forms"]["mode"]),
            "primaryChannel": payload.get("forms", {}).get("primaryChannel", DEFAULT_SITE_SETTINGS["forms"]["primaryChannel"]),
            "handoffPrefix": payload.get("forms", {}).get("handoffPrefix", DEFAULT_SITE_SETTINGS["forms"]["handoffPrefix"]),
            "successHint": payload.get("forms", {}).get("successHint", DEFAULT_SITE_SETTINGS["forms"]["successHint"]),
            "openTelegramAfterCopy": payload.get("forms", {}).get("openTelegramAfterCopy", DEFAULT_SITE_SETTINGS["forms"]["openTelegramAfterCopy"]),
            "collectEmail": payload.get("forms", {}).get("collectEmail", DEFAULT_SITE_SETTINGS["forms"]["collectEmail"]),
            "collectPhone": payload.get("forms", {}).get("collectPhone", DEFAULT_SITE_SETTINGS["forms"]["collectPhone"]),
            "collectTelegram": payload.get("forms", {}).get("collectTelegram", DEFAULT_SITE_SETTINGS["forms"]["collectTelegram"]),
            "collectStage": payload.get("forms", {}).get("collectStage", DEFAULT_SITE_SETTINGS["forms"]["collectStage"]),
        },
        "crm": {
            "requiredFields": payload.get("crm", {}).get("requiredFields", DEFAULT_SITE_SETTINGS["crm"]["requiredFields"]),
            "pipeline": payload.get("crm", {}).get("pipeline", DEFAULT_SITE_SETTINGS["crm"]["pipeline"]),
        },
        "integrations": {
            "apiBase": payload.get("integrations", {}).get("apiBase", CONFIG.api_public_base),
        },
    }


def insert_lead(lead: LeadCreateRequest, resolved_settings: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    status_value = resolved_settings.get("crm", {}).get("pipeline", ["Новый лид"])[0]
    owner_value = resolved_settings.get("crm", {}).get("owner", "")
    with closing(db_connect()) as connection:
        cursor = connection.execute(
            """
            INSERT INTO leads (
              created_at, updated_at, source, route, page_path, page_title, form_name,
              name, contact, email, phone, telegram, stage, what_needed, message,
              brief_text, lines_json, payload_json, status, owner, note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now,
                now,
                lead.source,
                lead.route,
                lead.page_path,
                lead.page_title,
                lead.form_name,
                lead.name,
                lead.contact,
                lead.email,
                lead.phone,
                lead.telegram,
                lead.stage,
                lead.what_needed,
                lead.message,
                lead.brief_text,
                json.dumps(lead.lines, ensure_ascii=False),
                json.dumps(lead.payload, ensure_ascii=False),
                status_value,
                owner_value,
                "",
            ),
        )
        connection.commit()
        lead_id = cursor.lastrowid
    return {"id": lead_id, "status": status_value, "owner": owner_value}


def serialize_lead(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "source": row["source"],
        "route": row["route"],
        "page_path": row["page_path"],
        "page_title": row["page_title"],
        "form_name": row["form_name"],
        "name": row["name"],
        "contact": row["contact"],
        "email": row["email"],
        "phone": row["phone"],
        "telegram": row["telegram"],
        "stage": row["stage"],
        "what_needed": row["what_needed"],
        "message": row["message"],
        "brief_text": row["brief_text"],
        "lines": json.loads(row["lines_json"] or "[]"),
        "payload": json.loads(row["payload_json"] or "{}"),
        "status": row["status"],
        "owner": row["owner"],
        "note": row["note"],
    }


def require_admin(authorization: str | None = Header(default=None)) -> None:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if not token or token != CONFIG.admin_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


app = FastAPI(title="KlubnikaProject Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CONFIG.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "klubnikaproject-backend",
        "env": CONFIG.app_env,
        "time": utc_now(),
    }


@app.get("/v1/public/settings")
def public_settings() -> dict[str, Any]:
    settings = read_settings()
    sanitized = sanitize_public_settings(settings)
    return {"settings": sanitized}


@app.post("/v1/public/leads", status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreateRequest) -> dict[str, Any]:
    settings = read_settings()
    created = insert_lead(payload, settings)
    return {
        "ok": True,
        "lead": created,
        "message": "Lead stored",
    }


@app.post("/v1/admin/auth/verify")
def admin_auth_verify(payload: AuthRequest) -> dict[str, Any]:
    if payload.token != CONFIG.admin_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"ok": True}


@app.get("/v1/admin/settings")
def admin_get_settings(_: None = Depends(require_admin)) -> dict[str, Any]:
    return {"settings": read_settings()}


@app.put("/v1/admin/settings")
def admin_put_settings(payload: SettingsEnvelope, _: None = Depends(require_admin)) -> dict[str, Any]:
    written = write_settings(payload.settings)
    return {"ok": True, "settings": written}


@app.get("/v1/admin/leads")
def admin_list_leads(
    limit: int = 50,
    status_filter: str = "",
    _: None = Depends(require_admin),
) -> dict[str, Any]:
    limit = max(1, min(limit, 200))
    query = "SELECT * FROM leads"
    params: list[Any] = []
    if status_filter:
        query += " WHERE status = ?"
        params.append(status_filter)
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    with closing(db_connect()) as connection:
        rows = connection.execute(query, params).fetchall()
        total = connection.execute("SELECT COUNT(*) AS count FROM leads").fetchone()["count"]
    return {
        "items": [serialize_lead(row) for row in rows],
        "total": total,
    }


@app.get("/v1/admin/leads/{lead_id}")
def admin_get_lead(lead_id: int, _: None = Depends(require_admin)) -> dict[str, Any]:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return {"item": serialize_lead(row)}


@app.patch("/v1/admin/leads/{lead_id}")
def admin_patch_lead(lead_id: int, payload: LeadUpdateRequest, _: None = Depends(require_admin)) -> dict[str, Any]:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
        current = dict(row)
        updated_status = payload.status if payload.status is not None else current["status"]
        updated_owner = payload.owner if payload.owner is not None else current["owner"]
        updated_note = payload.note if payload.note is not None else current["note"]
        connection.execute(
            """
            UPDATE leads
            SET status = ?, owner = ?, note = ?, updated_at = ?
            WHERE id = ?
            """,
            (updated_status, updated_owner, updated_note, utc_now(), lead_id),
        )
        connection.commit()
        fresh = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    return {"ok": True, "item": serialize_lead(fresh)}


@app.options("/{rest_of_path:path}")
def preflight(rest_of_path: str) -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)
