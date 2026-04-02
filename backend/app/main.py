from __future__ import annotations

import json
import os
import sqlite3
import hashlib
import secrets
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
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
    session_cookie_name: str
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
        session_cookie_name=os.environ.get("KP_SESSION_COOKIE_NAME", "kp_admin_session"),
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

DEFAULT_CATALOG_ITEMS: list[dict[str, Any]] = [
    {
        "slug": "shop-led",
        "title": "LED-освещение",
        "kind": "category",
        "category": "led",
        "path": "/shop/led/",
        "cta_mode": "choose",
        "status": "published",
        "summary": "Свет под ярус, стеллаж и controlled-environment логику.",
    },
    {
        "slug": "shop-poliv",
        "title": "Полив и дозирование",
        "kind": "category",
        "category": "poliv",
        "path": "/shop/poliv/",
        "cta_mode": "choose",
        "status": "published",
        "summary": "Схема полива, магистраль, капельницы и узлы под объект.",
    },
    {
        "slug": "shop-stellaj",
        "title": "Стеллажные решения",
        "kind": "category",
        "category": "stellaj",
        "path": "/shop/stellaj/",
        "cta_mode": "estimate",
        "status": "published",
        "summary": "Стеллаж как часть системы, а не отдельное железо.",
    },
    {
        "slug": "shop-substrate",
        "title": "Субстрат и корневая зона",
        "kind": "category",
        "category": "substrate",
        "path": "/shop/substrate/",
        "cta_mode": "choose",
        "status": "published",
        "summary": "Маты, пробки и совместимость с посадочным материалом и поливом.",
    },
    {
        "slug": "seed-soraya",
        "title": "Soraya F1",
        "kind": "product",
        "category": "seeds",
        "path": "/seeds/soraya-f1/",
        "cta_mode": "consult",
        "status": "published",
        "summary": "Сорт для controlled-environment, выбора канала сбыта и плотности ягоды.",
    },
    {
        "slug": "seed-frigo",
        "title": "FRIGO",
        "kind": "product",
        "category": "seeds",
        "path": "/seeds/frigo/",
        "cta_mode": "consult",
        "status": "published",
        "summary": "Посадочный материал для быстрого старта и управляемого цикла.",
    },
]

DEFAULT_USERS: list[dict[str, Any]] = [
    {
        "slug": "ilya",
        "display_name": "Илья",
        "email": "",
        "role": "owner",
        "is_active": True,
    }
]


class AuthRequest(BaseModel):
    token: str = Field(min_length=1)


class UserCreateRequest(BaseModel):
    slug: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    email: str = ""
    role: str = Field(default="manager", min_length=1)


class UserUpdateRequest(BaseModel):
    display_name: str | None = None
    email: str | None = None
    role: str | None = None
    is_active: bool | None = None


class CatalogItemRequest(BaseModel):
    slug: str = Field(min_length=1)
    title: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    category: str = ""
    path: str = Field(min_length=1)
    cta_mode: str = "choose"
    status: str = "draft"
    summary: str = ""


class CatalogEnvelope(BaseModel):
    items: list[CatalogItemRequest] = Field(default_factory=list)


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


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


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

            CREATE TABLE IF NOT EXISTS admin_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              token_hash TEXT NOT NULL UNIQUE,
              user_id INTEGER,
              user_role TEXT NOT NULL DEFAULT '',
              user_name TEXT NOT NULL DEFAULT '',
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slug TEXT NOT NULL UNIQUE,
              display_name TEXT NOT NULL,
              email TEXT NOT NULL,
              role TEXT NOT NULL,
              access_key_hash TEXT NOT NULL,
              access_key_hint TEXT NOT NULL,
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS catalog_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slug TEXT NOT NULL UNIQUE,
              title TEXT NOT NULL,
              kind TEXT NOT NULL,
              category TEXT NOT NULL,
              path TEXT NOT NULL,
              cta_mode TEXT NOT NULL,
              status TEXT NOT NULL,
              summary TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS lead_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              lead_id INTEGER NOT NULL,
              event_type TEXT NOT NULL,
              actor_user_id INTEGER,
              actor_name TEXT NOT NULL,
              actor_role TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )
        existing_session_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(admin_sessions)").fetchall()
        }
        if "user_id" not in existing_session_columns:
            connection.execute("ALTER TABLE admin_sessions ADD COLUMN user_id INTEGER")
        if "user_role" not in existing_session_columns:
            connection.execute("ALTER TABLE admin_sessions ADD COLUMN user_role TEXT NOT NULL DEFAULT ''")
        if "user_name" not in existing_session_columns:
            connection.execute("ALTER TABLE admin_sessions ADD COLUMN user_name TEXT NOT NULL DEFAULT ''")
        row = connection.execute("SELECT payload_json FROM site_settings WHERE id = 1").fetchone()
        if row is None:
            connection.execute(
                "INSERT INTO site_settings (id, payload_json, updated_at) VALUES (1, ?, ?)",
                (json.dumps(DEFAULT_SITE_SETTINGS, ensure_ascii=False), utc_now()),
            )
        users_row = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()
        if users_row["count"] == 0:
            now = utc_now()
            for user in DEFAULT_USERS:
                connection.execute(
                    """
                    INSERT INTO users (
                      slug, display_name, email, role, access_key_hash, access_key_hint, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user["slug"],
                        user["display_name"],
                        user["email"],
                        user["role"],
                        hash_token(CONFIG.admin_token),
                        "bootstrap token",
                        1,
                        now,
                        now,
                    ),
                )
        catalog_row = connection.execute("SELECT COUNT(*) AS count FROM catalog_items").fetchone()
        if catalog_row["count"] == 0:
            now = utc_now()
            for index, item in enumerate(DEFAULT_CATALOG_ITEMS):
                connection.execute(
                    """
                    INSERT INTO catalog_items (
                      slug, title, kind, category, path, cta_mode, status, summary, sort_order, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item["slug"],
                        item["title"],
                        item["kind"],
                        item["category"],
                        item["path"],
                        item["cta_mode"],
                        item["status"],
                        item["summary"],
                        index,
                        now,
                    ),
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


def list_catalog_items(status_filter: str = "") -> list[dict[str, Any]]:
    query = """
        SELECT slug, title, kind, category, path, cta_mode, status, summary, sort_order, updated_at
        FROM catalog_items
    """
    params: list[Any] = []
    if status_filter:
        query += " WHERE status = ?"
        params.append(status_filter)
    query += " ORDER BY sort_order ASC, id ASC"
    with closing(db_connect()) as connection:
        rows = connection.execute(query, params).fetchall()
    return [
        {
            "slug": row["slug"],
            "title": row["title"],
            "kind": row["kind"],
            "category": row["category"],
            "path": row["path"],
            "cta_mode": row["cta_mode"],
            "status": row["status"],
            "summary": row["summary"],
            "sort_order": row["sort_order"],
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]


def serialize_user(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "slug": row["slug"],
        "display_name": row["display_name"],
        "email": row["email"],
        "role": row["role"],
        "access_key_hint": row["access_key_hint"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_users() -> list[dict[str, Any]]:
    with closing(db_connect()) as connection:
        rows = connection.execute("SELECT * FROM users ORDER BY id ASC").fetchall()
    return [serialize_user(row) for row in rows]


def find_user_by_access_key(token: str) -> sqlite3.Row | None:
    with closing(db_connect()) as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE access_key_hash = ? AND is_active = 1 LIMIT 1",
            (hash_token(token),),
        ).fetchone()
    return row


def create_user(payload: UserCreateRequest) -> tuple[dict[str, Any], str]:
    access_key = secrets.token_urlsafe(18)
    now = utc_now()
    with closing(db_connect()) as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (
              slug, display_name, email, role, access_key_hash, access_key_hint, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.slug,
                payload.display_name,
                payload.email,
                payload.role,
                hash_token(access_key),
                f"{payload.slug}-key",
                1,
                now,
                now,
            ),
        )
        connection.commit()
        row = connection.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return serialize_user(row), access_key


def update_user(user_id: int, payload: UserUpdateRequest) -> dict[str, Any]:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        connection.execute(
            """
            UPDATE users
            SET display_name = ?, email = ?, role = ?, is_active = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.display_name if payload.display_name is not None else row["display_name"],
                payload.email if payload.email is not None else row["email"],
                payload.role if payload.role is not None else row["role"],
                int(payload.is_active) if payload.is_active is not None else row["is_active"],
                utc_now(),
                user_id,
            ),
        )
        connection.commit()
        fresh = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return serialize_user(fresh)


def rotate_user_key(user_id: int) -> tuple[dict[str, Any], str]:
    access_key = secrets.token_urlsafe(18)
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        connection.execute(
            "UPDATE users SET access_key_hash = ?, updated_at = ? WHERE id = ?",
            (hash_token(access_key), utc_now(), user_id),
        )
        connection.commit()
        fresh = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return serialize_user(fresh), access_key


def replace_catalog_items(items: list[CatalogItemRequest]) -> list[dict[str, Any]]:
    now = utc_now()
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM catalog_items")
        for index, item in enumerate(items):
            connection.execute(
                """
                INSERT INTO catalog_items (
                  slug, title, kind, category, path, cta_mode, status, summary, sort_order, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.slug,
                    item.title,
                    item.kind,
                    item.category,
                    item.path,
                    item.cta_mode,
                    item.status,
                    item.summary,
                    index,
                    now,
                ),
            )
        connection.commit()
    return list_catalog_items()


def create_admin_session(user_id: int | None, user_role: str, user_name: str) -> str:
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now.replace(microsecond=0).timestamp() + 60 * 60 * 24 * 14
    with closing(db_connect()) as connection:
        connection.execute(
            """
            INSERT INTO admin_sessions (token_hash, user_id, user_role, user_name, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                hash_token(raw_token),
                user_id,
                user_role,
                user_name,
                utc_now(),
                datetime.fromtimestamp(expires_at, timezone.utc).replace(microsecond=0).isoformat(),
            ),
        )
        connection.commit()
    return raw_token


def delete_admin_session(raw_token: str) -> None:
    if not raw_token:
        return
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM admin_sessions WHERE token_hash = ?", (hash_token(raw_token),))
        connection.commit()


def resolve_admin_session(raw_token: str) -> dict[str, Any] | None:
    if not raw_token:
        return None
    now = utc_now()
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM admin_sessions WHERE expires_at <= ?", (now,))
        row = connection.execute(
            "SELECT id, user_id, user_role, user_name FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
            (hash_token(raw_token), now),
        ).fetchone()
        connection.commit()
    if row is None:
        return None
    return {
        "session_id": row["id"],
        "user_id": row["user_id"],
        "user_role": row["user_role"],
        "user_name": row["user_name"],
    }


def insert_lead_event(
    lead_id: int,
    event_type: str,
    actor_user_id: int | None,
    actor_name: str,
    actor_role: str,
    payload: dict[str, Any],
) -> None:
    with closing(db_connect()) as connection:
        connection.execute(
            """
            INSERT INTO lead_events (
              lead_id, event_type, actor_user_id, actor_name, actor_role, payload_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lead_id,
                event_type,
                actor_user_id,
                actor_name,
                actor_role,
                json.dumps(payload, ensure_ascii=False),
                utc_now(),
            ),
        )
        connection.commit()


def list_lead_events(lead_id: int) -> list[dict[str, Any]]:
    with closing(db_connect()) as connection:
        rows = connection.execute(
            "SELECT * FROM lead_events WHERE lead_id = ? ORDER BY id DESC",
            (lead_id,),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "lead_id": row["lead_id"],
            "event_type": row["event_type"],
            "actor_user_id": row["actor_user_id"],
            "actor_name": row["actor_name"],
            "actor_role": row["actor_role"],
            "payload": json.loads(row["payload_json"] or "{}"),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


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
    insert_lead_event(
        lead_id=lead_id,
        event_type="created",
        actor_user_id=None,
        actor_name="Public form",
        actor_role="public",
        payload={
            "source": lead.source,
            "route": lead.route,
            "what_needed": lead.what_needed,
        },
    )
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


def get_admin_context(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token and token == CONFIG.admin_token:
        return {"user_id": None, "user_role": "owner", "user_name": "Bootstrap admin"}
    if token:
        user_row = find_user_by_access_key(token)
        if user_row is not None:
            return {
                "user_id": user_row["id"],
                "user_role": user_row["role"],
                "user_name": user_row["display_name"],
            }
    session_token = request.cookies.get(CONFIG.session_cookie_name, "")
    session_ctx = resolve_admin_session(session_token)
    if session_ctx:
        return {
            "user_id": session_ctx["user_id"],
            "user_role": session_ctx["user_role"],
            "user_name": session_ctx["user_name"],
        }
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


def require_admin(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return get_admin_context(request, authorization)


def require_roles(*roles: str):
    def checker(context: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
        if context.get("user_role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return context
    return checker


app = FastAPI(title="KlubnikaProject Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CONFIG.cors_origins,
    allow_credentials=True,
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


@app.get("/v1/public/catalog/items")
def public_catalog_items(status_filter: str = "published") -> dict[str, Any]:
    return {"items": list_catalog_items(status_filter=status_filter)}


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
    if payload.token == CONFIG.admin_token:
        return {"ok": True, "user": {"display_name": "Bootstrap admin", "role": "owner"}}
    user_row = find_user_by_access_key(payload.token)
    if user_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return {"ok": True, "user": serialize_user(user_row)}


@app.post("/v1/admin/auth/login")
def admin_auth_login(payload: AuthRequest, response: Response) -> dict[str, Any]:
    if payload.token == CONFIG.admin_token:
        user_id = None
        user_role = "owner"
        user_name = "Bootstrap admin"
        user_payload = {"display_name": user_name, "role": user_role}
    else:
        user_row = find_user_by_access_key(payload.token)
        if user_row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id = user_row["id"]
        user_role = user_row["role"]
        user_name = user_row["display_name"]
        user_payload = serialize_user(user_row)
    session_token = create_admin_session(user_id=user_id, user_role=user_role, user_name=user_name)
    response.set_cookie(
        key=CONFIG.session_cookie_name,
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 14,
        path="/",
    )
    return {"ok": True, "user": user_payload}


@app.get("/v1/admin/auth/session")
def admin_auth_session(context: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"ok": True, "session": True, "user": context}


@app.post("/v1/admin/auth/logout")
def admin_auth_logout(request: Request, response: Response) -> dict[str, Any]:
    delete_admin_session(request.cookies.get(CONFIG.session_cookie_name, ""))
    response.delete_cookie(CONFIG.session_cookie_name, path="/", samesite="none", secure=True)
    return {"ok": True}


@app.get("/v1/admin/settings")
def admin_get_settings(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"settings": read_settings()}


@app.put("/v1/admin/settings")
def admin_put_settings(payload: SettingsEnvelope, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    written = write_settings(payload.settings)
    return {"ok": True, "settings": written}


@app.get("/v1/admin/catalog/items")
def admin_list_catalog_items(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"items": list_catalog_items()}


@app.put("/v1/admin/catalog/items")
def admin_put_catalog_items(payload: CatalogEnvelope, _: dict[str, Any] = Depends(require_roles("owner", "admin", "editor"))) -> dict[str, Any]:
    written = replace_catalog_items(payload.items)
    return {"ok": True, "items": written}


@app.get("/v1/admin/users")
def admin_list_users(_: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    return {"items": list_users()}


@app.post("/v1/admin/users")
def admin_create_user(payload: UserCreateRequest, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    user, access_key = create_user(payload)
    return {"ok": True, "item": user, "access_key": access_key}


@app.patch("/v1/admin/users/{user_id}")
def admin_patch_user(user_id: int, payload: UserUpdateRequest, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    return {"ok": True, "item": update_user(user_id, payload)}


@app.post("/v1/admin/users/{user_id}/rotate-key")
def admin_rotate_user_key(user_id: int, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    user, access_key = rotate_user_key(user_id)
    return {"ok": True, "item": user, "access_key": access_key}


@app.get("/v1/admin/leads")
def admin_list_leads(
    limit: int = 50,
    status_filter: str = "",
    _: dict[str, Any] = Depends(require_admin),
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
def admin_get_lead(lead_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return {"item": serialize_lead(row)}


@app.get("/v1/admin/leads/{lead_id}/events")
def admin_get_lead_events(lead_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"items": list_lead_events(lead_id)}


@app.patch("/v1/admin/leads/{lead_id}")
def admin_patch_lead(
    lead_id: int,
    payload: LeadUpdateRequest,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager", "editor")),
) -> dict[str, Any]:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
        current = dict(row)
        updated_status = payload.status if payload.status is not None else current["status"]
        updated_owner = payload.owner if payload.owner is not None else current["owner"]
        updated_note = payload.note if payload.note is not None else current["note"]
        change_payload = {
            "from": {
                "status": current["status"],
                "owner": current["owner"],
                "note": current["note"],
            },
            "to": {
                "status": updated_status,
                "owner": updated_owner,
                "note": updated_note,
            },
        }
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
    insert_lead_event(
        lead_id=lead_id,
        event_type="updated",
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        payload=change_payload,
    )
    return {"ok": True, "item": serialize_lead(fresh)}


@app.options("/{rest_of_path:path}")
def preflight(rest_of_path: str) -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)
