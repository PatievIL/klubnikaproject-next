from __future__ import annotations

import json
import os
import sqlite3
import hashlib
import secrets
import base64
import threading
import time
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


RATE_LIMIT_LOCK = threading.Lock()
RATE_LIMIT_BUCKETS: dict[str, list[float]] = {}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_origin(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        return ""
    parsed = urllib_parse.urlsplit(value)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return value.rstrip("/")


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
    member_session_cookie_name: str
    db_path: Path
    cors_origins: list[str]
    crm_base_url: str
    crm_public_token: str
    crm_forward_timeout_seconds: float
    crm_internal_token: str


def load_config() -> AppConfig:
    root = Path(__file__).resolve().parents[1]
    db_path = Path(os.environ.get("KP_DB_PATH", root / "data" / "klubnikaproject.db"))
    raw_origins = os.environ.get(
        "KP_CORS_ORIGINS",
        "https://patievil.github.io,http://127.0.0.1:8011,http://localhost:8011",
    )
    origins = {
        normalize_origin(origin)
        for origin in raw_origins.split(",")
        if normalize_origin(origin)
    }
    origins.add(normalize_origin(os.environ.get("KP_SITE_URL", "https://patievil.github.io/klubnikaproject-next/")))
    origins.add(normalize_origin(os.environ.get("KP_PUBLIC_SITE_ORIGIN", "https://klubnikaproject.ru")))
    return AppConfig(
        app_env=os.environ.get("KP_APP_ENV", "development"),
        app_host=os.environ.get("KP_APP_HOST", "127.0.0.1"),
        app_port=int(os.environ.get("KP_APP_PORT", "8010")),
        site_url=os.environ.get("KP_SITE_URL", "https://patievil.github.io/klubnikaproject-next/"),
        public_site_origin=os.environ.get("KP_PUBLIC_SITE_ORIGIN", "https://klubnikaproject.ru"),
        api_public_base=os.environ.get("KP_API_PUBLIC_BASE", "https://api.klubnikaproject.ru/site/v1"),
        admin_token=os.environ.get("KP_ADMIN_TOKEN", "change-me"),
        session_cookie_name=os.environ.get("KP_SESSION_COOKIE_NAME", "kp_admin_session"),
        member_session_cookie_name=os.environ.get("KP_MEMBER_SESSION_COOKIE_NAME", "kp_member_session"),
        db_path=db_path,
        cors_origins=sorted(origins),
        crm_base_url=os.environ.get("KP_CRM_BASE_URL", "").rstrip("/"),
        crm_public_token=os.environ.get("KP_CRM_PUBLIC_TOKEN", ""),
        crm_forward_timeout_seconds=float(os.environ.get("KP_CRM_FORWARD_TIMEOUT_SECONDS", "4")),
        crm_internal_token=os.environ.get("KP_CRM_INTERNAL_TOKEN", ""),
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
    "members": {
        "enabled": True,
        "loginPath": "/account/login/",
        "hubPath": "/account/",
        "catalogPath": "/account/catalog/",
        "specialPath": "/account/special/",
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

ADMIN_DEFAULT_SCOPES = ["admin", "crm", "catalog", "special_pages"]
MEMBER_DEFAULT_SCOPES = ["catalog", "special_pages"]
PASSWORD_MIN_LENGTH = 10
ADMIN_SECTION_MATRIX = {
    "dashboard": {"roles": {"owner", "admin", "editor", "manager"}, "scopes": set()},
    "site": {"roles": {"owner", "admin", "editor"}, "scopes": set()},
    "pages": {"roles": {"owner", "admin", "editor"}, "scopes": set()},
    "forms": {"roles": {"owner", "admin", "editor"}, "scopes": set()},
    "crm": {"roles": {"owner", "admin", "manager"}, "scopes": {"crm"}},
    "users": {"roles": {"owner", "admin"}, "scopes": set()},
    "audit": {"roles": {"owner", "admin"}, "scopes": set()},
    "catalog": {"roles": {"owner", "admin", "editor", "manager"}, "scopes": {"catalog"}},
    "seo": {"roles": {"owner", "admin", "editor"}, "scopes": set()},
    "integrations": {"roles": {"owner", "admin", "editor"}, "scopes": set()},
}

DEFAULT_MEMBER_SPECIAL_PAGES: list[dict[str, Any]] = [
    {
        "slug": "solutions-access",
        "title": "Линия готовых решений",
        "summary": "Быстрый вход в решения, где важнее состав и сценарий, чем обычная розница.",
        "path": "/shop/solutions/",
        "kind": "public-route",
    },
    {
        "slug": "calc-access",
        "title": "Калькулятор проекта",
        "summary": "Быстрый расчёт состава фермы и ориентир по рамке бюджета.",
        "path": "/calc/",
        "kind": "public-route",
    },
    {
        "slug": "consultation-access",
        "title": "Разбор по задаче",
        "summary": "Точечный маршрут, если нужно понять следующий шаг, а не просто открыть каталог.",
        "path": "/consultations/",
        "kind": "public-route",
    },
]

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
        "account_type": "admin",
        "role": "owner",
        "scopes": ADMIN_DEFAULT_SCOPES,
        "is_active": True,
    }
]


class AuthRequest(BaseModel):
    token: str = Field(min_length=1)


class CredentialLoginRequest(BaseModel):
    login: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserCreateRequest(BaseModel):
    slug: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    email: str = ""
    account_type: str = Field(default="admin", min_length=1)
    role: str = Field(default="manager", min_length=1)
    scopes: list[str] = Field(default_factory=list)
    password: str = ""


class UserUpdateRequest(BaseModel):
    display_name: str | None = None
    email: str | None = None
    account_type: str | None = None
    role: str | None = None
    scopes: list[str] | None = None
    is_active: bool | None = None


class PasswordSetRequest(BaseModel):
    password: str = Field(min_length=8)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


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


class CrmWorkspaceLeadUpdateRequest(BaseModel):
    status_code: str | None = None
    owner_id: int | None = None
    note: str | None = None
    source: str | None = None
    tags: list[str] | None = None
    next_action_at: str | None = None
    is_archived: bool | None = None


class CrmLeadCommentCreateRequest(BaseModel):
    body: str = Field(min_length=1)


class CrmLeadDispatchRequest(BaseModel):
    trigger_event: str = "lead.manual_dispatch"


class CrmLeadTaskCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    status: str = "open"
    due_at: str = ""
    owner_id: int | None = None


class CrmLeadTaskUpdateRequest(BaseModel):
    title: str | None = None
    status: str | None = None
    due_at: str | None = None
    owner_id: int | None = None


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def request_client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(request: Request, bucket: str, *, limit: int, window_seconds: int, extra_key: str = "") -> None:
    client_key = request_client_key(request)
    storage_key = f"{bucket}:{client_key}:{extra_key}".rstrip(":")
    now = time.time()
    with RATE_LIMIT_LOCK:
        timestamps = RATE_LIMIT_BUCKETS.get(storage_key, [])
        fresh = [ts for ts in timestamps if now - ts < window_seconds]
        if len(fresh) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {bucket}",
            )
        fresh.append(now)
        RATE_LIMIT_BUCKETS[storage_key] = fresh


def default_scopes_for_account_type(account_type: str) -> list[str]:
    return list(ADMIN_DEFAULT_SCOPES if account_type == "admin" else MEMBER_DEFAULT_SCOPES)


def normalize_scopes(scopes: list[str], account_type: str) -> list[str]:
    base = scopes or default_scopes_for_account_type(account_type)
    cleaned = []
    for scope in base:
        value = (scope or "").strip()
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned


def validate_password_policy(password: str, *, allow_empty: bool = False) -> None:
    if allow_empty and not password:
        return
    if len(password or "") < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at least {PASSWORD_MIN_LENGTH} characters",
        )
    if not any(char.isalpha() for char in password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must include at least one letter",
        )
    if not any(char.isdigit() for char in password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must include at least one digit",
        )


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 390000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    encoded = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${iterations}${salt}${encoded}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    try:
        scheme, iterations_raw, salt, encoded = stored_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    expected = base64.urlsafe_b64encode(digest).decode("ascii")
    return secrets.compare_digest(expected, encoded)


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
              note TEXT NOT NULL,
              crm_delivery_status TEXT NOT NULL DEFAULT '',
              crm_delivery_error TEXT NOT NULL DEFAULT '',
              crm_lead_id INTEGER,
              crm_delivered_at TEXT NOT NULL DEFAULT ''
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

            CREATE TABLE IF NOT EXISTS member_sessions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              token_hash TEXT NOT NULL UNIQUE,
              user_id INTEGER NOT NULL,
              user_role TEXT NOT NULL DEFAULT '',
              user_name TEXT NOT NULL DEFAULT '',
              scope_json TEXT NOT NULL DEFAULT '[]',
              created_at TEXT NOT NULL,
              expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              slug TEXT NOT NULL UNIQUE,
              display_name TEXT NOT NULL,
              email TEXT NOT NULL,
              account_type TEXT NOT NULL DEFAULT 'admin',
              role TEXT NOT NULL,
              scope_json TEXT NOT NULL DEFAULT '[]',
              password_hash TEXT NOT NULL DEFAULT '',
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

            CREATE TABLE IF NOT EXISTS audit_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              created_at TEXT NOT NULL,
              actor_user_id INTEGER,
              actor_name TEXT NOT NULL,
              actor_role TEXT NOT NULL,
              area TEXT NOT NULL,
              action TEXT NOT NULL,
              target_type TEXT NOT NULL,
              target_id TEXT NOT NULL,
              payload_json TEXT NOT NULL
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
        existing_member_session_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(member_sessions)").fetchall()
        }
        if "scope_json" not in existing_member_session_columns:
            connection.execute("ALTER TABLE member_sessions ADD COLUMN scope_json TEXT NOT NULL DEFAULT '[]'")
        existing_user_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        if "account_type" not in existing_user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'admin'")
        if "scope_json" not in existing_user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN scope_json TEXT NOT NULL DEFAULT '[]'")
        if "password_hash" not in existing_user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")
        existing_lead_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(leads)").fetchall()
        }
        if "crm_delivery_status" not in existing_lead_columns:
            connection.execute("ALTER TABLE leads ADD COLUMN crm_delivery_status TEXT NOT NULL DEFAULT ''")
        if "crm_delivery_error" not in existing_lead_columns:
            connection.execute("ALTER TABLE leads ADD COLUMN crm_delivery_error TEXT NOT NULL DEFAULT ''")
        if "crm_lead_id" not in existing_lead_columns:
            connection.execute("ALTER TABLE leads ADD COLUMN crm_lead_id INTEGER")
        if "crm_delivered_at" not in existing_lead_columns:
            connection.execute("ALTER TABLE leads ADD COLUMN crm_delivered_at TEXT NOT NULL DEFAULT ''")
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
                      slug, display_name, email, account_type, role, scope_json, password_hash, access_key_hash, access_key_hint, is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user["slug"],
                        user["display_name"],
                        user["email"],
                        user["account_type"],
                        user["role"],
                        json.dumps(user["scopes"], ensure_ascii=False),
                        "",
                        hash_token(CONFIG.admin_token),
                        "bootstrap token",
                        1,
                        now,
                        now,
                    ),
                )
        connection.execute(
            """
            UPDATE users
            SET account_type = COALESCE(NULLIF(account_type, ''), 'admin'),
                scope_json = CASE
                  WHEN scope_json IS NULL OR scope_json = '' OR scope_json = '[]'
                  THEN CASE
                    WHEN account_type = 'member' THEN ?
                    ELSE ?
                  END
                  ELSE scope_json
                END
            """,
            (
                json.dumps(MEMBER_DEFAULT_SCOPES, ensure_ascii=False),
                json.dumps(ADMIN_DEFAULT_SCOPES, ensure_ascii=False),
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
        "members": {
            "enabled": payload.get("members", {}).get("enabled", DEFAULT_SITE_SETTINGS["members"]["enabled"]),
            "loginPath": payload.get("members", {}).get("loginPath", DEFAULT_SITE_SETTINGS["members"]["loginPath"]),
            "hubPath": payload.get("members", {}).get("hubPath", DEFAULT_SITE_SETTINGS["members"]["hubPath"]),
            "catalogPath": payload.get("members", {}).get("catalogPath", DEFAULT_SITE_SETTINGS["members"]["catalogPath"]),
            "specialPath": payload.get("members", {}).get("specialPath", DEFAULT_SITE_SETTINGS["members"]["specialPath"]),
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
        "account_type": row["account_type"],
        "role": row["role"],
        "scopes": json.loads(row["scope_json"] or "[]"),
        "has_password": bool(row["password_hash"]),
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


def find_user_by_id(user_id: int) -> sqlite3.Row | None:
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ? LIMIT 1", (user_id,)).fetchone()
    return row


def find_user_by_login(login: str, account_type: str | None = None) -> sqlite3.Row | None:
    normalized = login.strip().lower()
    if not normalized:
        return None
    query = """
        SELECT * FROM users
        WHERE is_active = 1
          AND (lower(slug) = ? OR lower(email) = ?)
    """
    params: list[Any] = [normalized, normalized]
    if account_type:
        query += " AND account_type = ?"
        params.append(account_type)
    query += " LIMIT 1"
    with closing(db_connect()) as connection:
        row = connection.execute(query, params).fetchone()
    return row


def authenticate_user_password(login: str, password: str, account_type: str | None = None) -> sqlite3.Row | None:
    user_row = find_user_by_login(login, account_type=account_type)
    if user_row is None:
        return None
    if not user_row["is_active"]:
        return None
    if not verify_password(password, user_row["password_hash"] or ""):
        return None
    return user_row


def count_active_owners(connection: sqlite3.Connection) -> int:
    row = connection.execute(
        """
        SELECT COUNT(*) AS count
        FROM users
        WHERE account_type = 'admin' AND role = 'owner' AND is_active = 1
        """
    ).fetchone()
    return int(row["count"] if row else 0)


def delete_admin_sessions_for_user(user_id: int) -> None:
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM admin_sessions WHERE user_id = ?", (user_id,))
        connection.commit()


def delete_member_sessions_for_user(user_id: int) -> None:
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM member_sessions WHERE user_id = ?", (user_id,))
        connection.commit()


def delete_user_sessions(user_id: int, account_type: str | None = None) -> None:
    if account_type in (None, "admin"):
        delete_admin_sessions_for_user(user_id)
    if account_type in (None, "member"):
        delete_member_sessions_for_user(user_id)


def create_user(payload: UserCreateRequest) -> tuple[dict[str, Any], str]:
    validate_password_policy(payload.password, allow_empty=True)
    access_key = secrets.token_urlsafe(18)
    now = utc_now()
    scopes = normalize_scopes(payload.scopes, payload.account_type)
    password_hash = hash_password(payload.password) if payload.password else ""
    with closing(db_connect()) as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (
              slug, display_name, email, account_type, role, scope_json, password_hash, access_key_hash, access_key_hint, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.slug,
                payload.display_name,
                payload.email,
                payload.account_type,
                payload.role,
                json.dumps(scopes, ensure_ascii=False),
                password_hash,
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
        next_account_type = payload.account_type if payload.account_type is not None else row["account_type"]
        next_role = payload.role if payload.role is not None else row["role"]
        next_is_active = int(payload.is_active) if payload.is_active is not None else row["is_active"]
        next_scopes = (
            normalize_scopes(payload.scopes, next_account_type)
            if payload.scopes is not None
            else json.loads(row["scope_json"] or "[]")
        )
        if row["account_type"] == "admin" and row["role"] == "owner":
            if next_account_type != "admin" or next_role != "owner" or not next_is_active:
                if count_active_owners(connection) <= 1:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Cannot remove or deactivate the last active owner",
                    )
        connection.execute(
            """
            UPDATE users
            SET display_name = ?, email = ?, account_type = ?, role = ?, scope_json = ?, is_active = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.display_name if payload.display_name is not None else row["display_name"],
                payload.email if payload.email is not None else row["email"],
                next_account_type,
                next_role,
                json.dumps(next_scopes, ensure_ascii=False),
                next_is_active,
                utc_now(),
                user_id,
            ),
        )
        connection.commit()
        fresh = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if (
        next_account_type != row["account_type"]
        or next_role != row["role"]
        or next_scopes != json.loads(row["scope_json"] or "[]")
        or next_is_active != row["is_active"]
    ):
        delete_user_sessions(user_id)
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


def set_user_password(user_id: int, password: str, *, revoke_sessions: bool = True) -> dict[str, Any]:
    validate_password_policy(password)
    with closing(db_connect()) as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        connection.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (hash_password(password), utc_now(), user_id),
        )
        connection.commit()
        fresh = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if revoke_sessions:
        delete_user_sessions(user_id, account_type=row["account_type"])
    return serialize_user(fresh)


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


def create_member_session(user_row: sqlite3.Row) -> str:
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now.replace(microsecond=0).timestamp() + 60 * 60 * 24 * 14
    with closing(db_connect()) as connection:
        connection.execute(
            """
            INSERT INTO member_sessions (token_hash, user_id, user_role, user_name, scope_json, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                hash_token(raw_token),
                user_row["id"],
                user_row["role"],
                user_row["display_name"],
                user_row["scope_json"],
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


def delete_member_session(raw_token: str) -> None:
    if not raw_token:
        return
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM member_sessions WHERE token_hash = ?", (hash_token(raw_token),))
        connection.commit()


def resolve_admin_session(raw_token: str) -> dict[str, Any] | None:
    if not raw_token:
        return None
    now = utc_now()
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM admin_sessions WHERE expires_at <= ?", (now,))
        row = connection.execute(
            "SELECT id, user_id, user_role, user_name, created_at, expires_at FROM admin_sessions WHERE token_hash = ? AND expires_at > ?",
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
        "created_at": row["created_at"],
        "expires_at": row["expires_at"],
    }


def resolve_member_session(raw_token: str) -> dict[str, Any] | None:
    if not raw_token:
        return None
    now = utc_now()
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM member_sessions WHERE expires_at <= ?", (now,))
        row = connection.execute(
            "SELECT id, user_id, user_role, user_name, scope_json, created_at, expires_at FROM member_sessions WHERE token_hash = ? AND expires_at > ?",
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
        "scopes": json.loads(row["scope_json"] or "[]"),
        "created_at": row["created_at"],
        "expires_at": row["expires_at"],
    }


def list_admin_sessions_for_user(user_id: int, current_raw_token: str = "") -> list[dict[str, Any]]:
    now = utc_now()
    current_hash = hash_token(current_raw_token) if current_raw_token else ""
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM admin_sessions WHERE expires_at <= ?", (now,))
        rows = connection.execute(
            """
            SELECT id, user_role, user_name, created_at, expires_at, token_hash
            FROM admin_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
        connection.commit()
    return [
        {
            "id": row["id"],
            "user_role": row["user_role"],
            "user_name": row["user_name"],
            "created_at": row["created_at"],
            "expires_at": row["expires_at"],
            "current": bool(current_hash and row["token_hash"] == current_hash),
        }
        for row in rows
    ]


def list_member_sessions_for_user(user_id: int, current_raw_token: str = "") -> list[dict[str, Any]]:
    now = utc_now()
    current_hash = hash_token(current_raw_token) if current_raw_token else ""
    with closing(db_connect()) as connection:
        connection.execute("DELETE FROM member_sessions WHERE expires_at <= ?", (now,))
        rows = connection.execute(
            """
            SELECT id, user_role, user_name, scope_json, created_at, expires_at, token_hash
            FROM member_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
        connection.commit()
    return [
        {
            "id": row["id"],
            "user_role": row["user_role"],
            "user_name": row["user_name"],
            "scopes": json.loads(row["scope_json"] or "[]"),
            "created_at": row["created_at"],
            "expires_at": row["expires_at"],
            "current": bool(current_hash and row["token_hash"] == current_hash),
        }
        for row in rows
    ]


def delete_other_admin_sessions(user_id: int, keep_raw_token: str = "") -> None:
    keep_hash = hash_token(keep_raw_token) if keep_raw_token else ""
    with closing(db_connect()) as connection:
        if keep_hash:
            connection.execute(
                "DELETE FROM admin_sessions WHERE user_id = ? AND token_hash != ?",
                (user_id, keep_hash),
            )
        else:
            connection.execute("DELETE FROM admin_sessions WHERE user_id = ?", (user_id,))
        connection.commit()


def delete_other_member_sessions(user_id: int, keep_raw_token: str = "") -> None:
    keep_hash = hash_token(keep_raw_token) if keep_raw_token else ""
    with closing(db_connect()) as connection:
        if keep_hash:
            connection.execute(
                "DELETE FROM member_sessions WHERE user_id = ? AND token_hash != ?",
                (user_id, keep_hash),
            )
        else:
            connection.execute("DELETE FROM member_sessions WHERE user_id = ?", (user_id,))
        connection.commit()


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


def insert_audit_event(
    *,
    actor_user_id: int | None,
    actor_name: str,
    actor_role: str,
    area: str,
    action: str,
    target_type: str,
    target_id: str,
    payload: dict[str, Any],
) -> None:
    with closing(db_connect()) as connection:
        connection.execute(
            """
            INSERT INTO audit_events (
              created_at, actor_user_id, actor_name, actor_role, area, action, target_type, target_id, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                utc_now(),
                actor_user_id,
                actor_name,
                actor_role,
                area,
                action,
                target_type,
                target_id,
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        connection.commit()


def list_audit_events(limit: int = 100) -> list[dict[str, Any]]:
    with closing(db_connect()) as connection:
        rows = connection.execute(
            "SELECT * FROM audit_events ORDER BY id DESC LIMIT ?",
            (max(1, min(limit, 500)),),
        ).fetchall()
    return [
        {
            "id": row["id"],
            "created_at": row["created_at"],
            "actor_user_id": row["actor_user_id"],
            "actor_name": row["actor_name"],
            "actor_role": row["actor_role"],
            "area": row["area"],
            "action": row["action"],
            "target_type": row["target_type"],
            "target_id": row["target_id"],
            "payload": json.loads(row["payload_json"] or "{}"),
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


def build_crm_forward_payload(lead: LeadCreateRequest) -> dict[str, Any]:
    return {
        "source": "site",
        "channel": "web_form",
        "route": lead.route,
        "page_path": lead.page_path,
        "page_title": lead.page_title,
        "form_name": lead.form_name,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "telegram": lead.telegram,
        "project_stage": lead.stage,
        "request_type": lead.what_needed,
        "message": lead.message,
        "brief_text": lead.brief_text,
        "payload": lead.payload,
    }


def update_lead_crm_delivery(
    lead_id: int,
    *,
    delivery_status: str,
    delivery_error: str = "",
    crm_lead_id: int | None = None,
    delivered_at: str = "",
) -> None:
    with closing(db_connect()) as connection:
        connection.execute(
            """
            UPDATE leads
            SET crm_delivery_status = ?, crm_delivery_error = ?, crm_lead_id = ?, crm_delivered_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (delivery_status, delivery_error, crm_lead_id, delivered_at, utc_now(), lead_id),
        )
        connection.commit()


def forward_lead_to_crm(lead_id: int, lead: LeadCreateRequest) -> dict[str, Any]:
    if not CONFIG.crm_base_url:
        update_lead_crm_delivery(lead_id, delivery_status="disabled")
        insert_lead_event(
            lead_id=lead_id,
            event_type="crm.forward.disabled",
            actor_user_id=None,
            actor_name="CRM bridge",
            actor_role="system",
            payload={"reason": "KP_CRM_BASE_URL is empty"},
        )
        return {"delivery_status": "disabled", "crm_lead_id": None, "error": ""}

    payload = build_crm_forward_payload(lead)
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if CONFIG.crm_public_token:
        headers["X-CRM-Token"] = CONFIG.crm_public_token

    request = urllib_request.Request(
        f"{CONFIG.crm_base_url}/v1/public/leads",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib_request.urlopen(request, timeout=CONFIG.crm_forward_timeout_seconds) as response:
            raw_body = response.read().decode("utf-8")
    except urllib_error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        update_lead_crm_delivery(
            lead_id,
            delivery_status="failed",
            delivery_error=f"HTTP {error.code}: {error_body[:500]}",
        )
        insert_lead_event(
            lead_id=lead_id,
            event_type="crm.forward.failed",
            actor_user_id=None,
            actor_name="CRM bridge",
            actor_role="system",
            payload={"status_code": error.code, "body": error_body[:500]},
        )
        return {"delivery_status": "failed", "crm_lead_id": None, "error": f"HTTP {error.code}"}
    except Exception as error:
        update_lead_crm_delivery(
            lead_id,
            delivery_status="failed",
            delivery_error=str(error)[:500],
        )
        insert_lead_event(
            lead_id=lead_id,
            event_type="crm.forward.failed",
            actor_user_id=None,
            actor_name="CRM bridge",
            actor_role="system",
            payload={"error": str(error)[:500]},
        )
        return {"delivery_status": "failed", "crm_lead_id": None, "error": str(error)}

    try:
        parsed = json.loads(raw_body or "{}")
    except json.JSONDecodeError:
        update_lead_crm_delivery(
            lead_id,
            delivery_status="failed",
            delivery_error="CRM bridge returned invalid JSON",
        )
        insert_lead_event(
            lead_id=lead_id,
            event_type="crm.forward.failed",
            actor_user_id=None,
            actor_name="CRM bridge",
            actor_role="system",
            payload={"error": "invalid_json", "body": raw_body[:500]},
        )
        return {"delivery_status": "failed", "crm_lead_id": None, "error": "invalid_json"}

    crm_lead_id = parsed.get("item", {}).get("id")
    delivered_at = utc_now()
    update_lead_crm_delivery(
        lead_id,
        delivery_status="succeeded",
        crm_lead_id=crm_lead_id,
        delivered_at=delivered_at,
    )
    insert_lead_event(
        lead_id=lead_id,
        event_type="crm.forward.succeeded",
        actor_user_id=None,
        actor_name="CRM bridge",
        actor_role="system",
        payload={"crm_lead_id": crm_lead_id},
    )
    return {
        "delivery_status": "succeeded",
        "crm_lead_id": crm_lead_id,
        "error": "",
        "delivered_at": delivered_at,
    }


def crm_proxy_request(
    path: str,
    *,
    method: str = "GET",
    query: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    actor: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not CONFIG.crm_base_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="CRM service is not configured")
    if not CONFIG.crm_internal_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="CRM internal token is not configured")

    url = f"{CONFIG.crm_base_url}{path}"
    if query:
        encoded = urllib_parse.urlencode(
            {key: value for key, value in query.items() if value not in (None, "", [], False)},
            doseq=True,
        )
        if encoded:
            url = f"{url}?{encoded}"

    headers = {
        "Authorization": f"Bearer {CONFIG.crm_internal_token}",
        "Accept": "application/json",
    }
    if actor:
        headers["X-Actor-Id"] = str(actor.get("user_id") or "")
        headers["X-Actor-Name"] = str(actor.get("user_name") or "")
        headers["X-Actor-Role"] = str(actor.get("user_role") or "")

    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")

    request = urllib_request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib_request.urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
    except urllib_error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=error.code,
            detail=error_body[:1000] or f"CRM service returned {error.code}",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"CRM proxy failed: {str(error)[:500]}",
        ) from error

    if not raw:
        return {"ok": True}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"CRM service returned invalid JSON: {error}",
        ) from error


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
        "crm_delivery_status": row["crm_delivery_status"],
        "crm_delivery_error": row["crm_delivery_error"],
        "crm_lead_id": row["crm_lead_id"],
        "crm_delivered_at": row["crm_delivered_at"],
    }


def build_user_context(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "user_id": row["id"],
        "user_role": row["role"],
        "user_name": row["display_name"],
        "account_type": row["account_type"],
        "scopes": json.loads(row["scope_json"] or "[]"),
        "email": row["email"],
        "slug": row["slug"],
    }


def allowed_admin_sections(context: dict[str, Any]) -> list[str]:
    role = context.get("user_role") or ""
    scopes = set(context.get("scopes") or [])
    allowed = []
    for section, rule in ADMIN_SECTION_MATRIX.items():
        if role in rule["roles"]:
            if not rule["scopes"] or rule["scopes"].intersection(scopes):
                allowed.append(section)
    return allowed


def build_admin_access_policy(context: dict[str, Any]) -> dict[str, Any]:
    sections = allowed_admin_sections(context)
    return {
        "account_type": "admin",
        "role": context.get("user_role", ""),
        "scopes": list(context.get("scopes") or []),
        "sections": sections,
        "capabilities": {
            "manage_users": "users" in sections,
            "view_audit": "audit" in sections,
            "manage_catalog": "catalog" in sections,
            "access_crm": "crm" in sections,
            "manage_site": any(section in sections for section in ("site", "pages", "forms", "seo", "integrations")),
        },
    }


def build_member_access_policy(context: dict[str, Any]) -> dict[str, Any]:
    scopes = set(context.get("scopes") or [])
    route_access = {
        "hub": True,
        "catalog": "catalog" in scopes,
        "special": "special_pages" in scopes,
    }
    preferred_path = (
        DEFAULT_SITE_SETTINGS["members"]["catalogPath"]
        if route_access["catalog"]
        else DEFAULT_SITE_SETTINGS["members"]["specialPath"]
        if route_access["special"]
        else DEFAULT_SITE_SETTINGS["members"]["hubPath"]
    )
    return {
        "account_type": "member",
        "role": context.get("user_role", ""),
        "scopes": list(context.get("scopes") or []),
        "route_access": route_access,
        "preferred_path": preferred_path,
    }


def set_session_cookie(response: Response, key: str, value: str) -> None:
    response.set_cookie(
        key=key,
        value=value,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 14,
        path="/",
    )


def clear_session_cookie(response: Response, key: str) -> None:
    response.delete_cookie(key, path="/", samesite="none", secure=True)


def get_admin_context(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token and token == CONFIG.admin_token:
        return {
            "user_id": None,
            "user_role": "owner",
            "user_name": "Bootstrap admin",
            "account_type": "admin",
            "scopes": list(ADMIN_DEFAULT_SCOPES),
            "email": "",
            "slug": "bootstrap-admin",
        }
    if token:
        user_row = find_user_by_access_key(token)
        if user_row is not None and user_row["account_type"] == "admin":
            return build_user_context(user_row)
    session_token = request.cookies.get(CONFIG.session_cookie_name, "")
    session_ctx = resolve_admin_session(session_token)
    if session_ctx:
        if session_ctx["user_id"]:
            user_row = find_user_by_id(session_ctx["user_id"])
            if user_row is not None and user_row["is_active"] and user_row["account_type"] == "admin":
                return build_user_context(user_row)
            delete_admin_session(session_token)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session expired")
        return {
            "user_id": session_ctx["user_id"],
            "user_role": session_ctx["user_role"],
            "user_name": session_ctx["user_name"],
            "account_type": "admin",
            "scopes": list(ADMIN_DEFAULT_SCOPES),
            "email": "",
            "slug": "",
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


def get_member_context(request: Request) -> dict[str, Any]:
    session_token = request.cookies.get(CONFIG.member_session_cookie_name, "")
    session_ctx = resolve_member_session(session_token)
    if session_ctx:
        user_row = find_user_by_id(session_ctx["user_id"])
        if user_row is not None and user_row["is_active"] and user_row["account_type"] == "member":
            return build_user_context(user_row)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Member session not found")


def require_member_scopes(*scopes: str):
    def checker(context: dict[str, Any] = Depends(get_member_context)) -> dict[str, Any]:
        available = set(context.get("scopes") or [])
        if not set(scopes).issubset(available):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient member scope")
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
def create_lead(payload: LeadCreateRequest, request: Request) -> dict[str, Any]:
    enforce_rate_limit(request, "public_leads", limit=12, window_seconds=600)
    settings = read_settings()
    created = insert_lead(payload, settings)
    crm_forward = forward_lead_to_crm(created["id"], payload)
    created["crm"] = crm_forward
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
def admin_auth_login(payload: AuthRequest, response: Response, request: Request) -> dict[str, Any]:
    enforce_rate_limit(request, "admin_token_login", limit=20, window_seconds=600)
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
    set_session_cookie(response, CONFIG.session_cookie_name, session_token)
    insert_audit_event(
        actor_user_id=user_id,
        actor_name=user_name,
        actor_role=user_role,
        area="auth",
        action="admin_token_login",
        target_type="session",
        target_id="admin",
        payload={"client": request_client_key(request)},
    )
    return {"ok": True, "user": user_payload}


@app.post("/v1/admin/auth/password-login")
def admin_auth_password_login(payload: CredentialLoginRequest, response: Response, request: Request) -> dict[str, Any]:
    enforce_rate_limit(request, "admin_password_login", limit=10, window_seconds=600, extra_key=payload.login.lower())
    user_row = authenticate_user_password(payload.login, payload.password, account_type="admin")
    if user_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login or password")
    session_token = create_admin_session(
        user_id=user_row["id"],
        user_role=user_row["role"],
        user_name=user_row["display_name"],
    )
    set_session_cookie(response, CONFIG.session_cookie_name, session_token)
    insert_audit_event(
        actor_user_id=user_row["id"],
        actor_name=user_row["display_name"],
        actor_role=user_row["role"],
        area="auth",
        action="admin_password_login",
        target_type="session",
        target_id="admin",
        payload={"client": request_client_key(request)},
    )
    return {"ok": True, "user": serialize_user(user_row)}


@app.get("/v1/admin/auth/session")
def admin_auth_session(context: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"ok": True, "session": True, "user": context}


@app.get("/v1/admin/auth/access-policy")
def admin_auth_access_policy(context: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"ok": True, "policy": build_admin_access_policy(context)}


@app.get("/v1/admin/auth/sessions")
def admin_auth_sessions(request: Request, context: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    user_id = context.get("user_id")
    if not user_id:
        return {"ok": True, "items": []}
    current_token = request.cookies.get(CONFIG.session_cookie_name, "")
    return {"ok": True, "items": list_admin_sessions_for_user(int(user_id), current_token)}


@app.post("/v1/admin/auth/change-password")
def admin_auth_change_password(
    payload: PasswordChangeRequest,
    request: Request,
    response: Response,
    context: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    user_id = context.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bootstrap token cannot change password here")
    user_row = find_user_by_id(int(user_id))
    if user_row is None or user_row["account_type"] != "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found")
    if not verify_password(payload.current_password, user_row["password_hash"] or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is invalid")
    set_user_password(int(user_id), payload.new_password, revoke_sessions=False)
    current_token = request.cookies.get(CONFIG.session_cookie_name, "")
    delete_other_admin_sessions(int(user_id), current_token)
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="auth",
        action="admin_change_password",
        target_type="user",
        target_id=str(user_id),
        payload={"other_sessions_revoked": True},
    )
    return {"ok": True}


@app.post("/v1/admin/auth/logout-others")
def admin_auth_logout_others(request: Request, context: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    user_id = context.get("user_id")
    if not user_id:
        return {"ok": True, "revoked": 0}
    current_token = request.cookies.get(CONFIG.session_cookie_name, "")
    before = list_admin_sessions_for_user(int(user_id), current_token)
    delete_other_admin_sessions(int(user_id), current_token)
    after = list_admin_sessions_for_user(int(user_id), current_token)
    revoked = max(0, len(before) - len(after))
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="auth",
        action="admin_logout_others",
        target_type="session",
        target_id="admin",
        payload={"revoked": revoked},
    )
    return {"ok": True, "revoked": revoked}


@app.post("/v1/admin/auth/logout")
def admin_auth_logout(request: Request, response: Response) -> dict[str, Any]:
    context = get_admin_context(request)
    delete_admin_session(request.cookies.get(CONFIG.session_cookie_name, ""))
    clear_session_cookie(response, CONFIG.session_cookie_name)
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="auth",
        action="admin_logout",
        target_type="session",
        target_id="admin",
        payload={},
    )
    return {"ok": True}


@app.get("/v1/admin/settings")
def admin_get_settings(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"settings": read_settings()}


@app.put("/v1/admin/settings")
def admin_put_settings(payload: SettingsEnvelope, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    written = write_settings(payload.settings)
    context = _
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="settings",
        action="settings_update",
        target_type="site_settings",
        target_id="1",
        payload={"keys": sorted((payload.settings or {}).keys())},
    )
    return {"ok": True, "settings": written}


@app.get("/v1/admin/catalog/items")
def admin_list_catalog_items(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"items": list_catalog_items()}


@app.put("/v1/admin/catalog/items")
def admin_put_catalog_items(payload: CatalogEnvelope, _: dict[str, Any] = Depends(require_roles("owner", "admin", "editor"))) -> dict[str, Any]:
    written = replace_catalog_items(payload.items)
    context = _
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="catalog",
        action="catalog_replace",
        target_type="catalog_manifest",
        target_id="catalog_items",
        payload={"count": len(payload.items)},
    )
    return {"ok": True, "items": written}


@app.get("/v1/admin/users")
def admin_list_users(_: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    return {"items": list_users()}


@app.post("/v1/admin/users")
def admin_create_user(payload: UserCreateRequest, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    user, access_key = create_user(payload)
    context = _
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="users",
        action="user_create",
        target_type="user",
        target_id=str(user["id"]),
        payload={"slug": user["slug"], "account_type": user["account_type"], "role": user["role"]},
    )
    return {"ok": True, "item": user, "access_key": access_key}


@app.patch("/v1/admin/users/{user_id}")
def admin_patch_user(user_id: int, payload: UserUpdateRequest, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    context = _
    if context.get("user_id") == user_id:
        next_account_type = payload.account_type if payload.account_type is not None else context.get("account_type", "admin")
        next_role = payload.role if payload.role is not None else context.get("user_role", "admin")
        next_is_active = payload.is_active if payload.is_active is not None else True
        if next_account_type != "admin" or next_role not in {"owner", "admin"} or not next_is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot remove your own admin access in the current session",
            )
    user = update_user(user_id, payload)
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="users",
        action="user_update",
        target_type="user",
        target_id=str(user_id),
        payload=payload.model_dump(exclude_none=True),
    )
    return {"ok": True, "item": user}


@app.post("/v1/admin/users/{user_id}/set-password")
def admin_set_user_password(
    user_id: int,
    payload: PasswordSetRequest,
    _: dict[str, Any] = Depends(require_roles("owner", "admin")),
) -> dict[str, Any]:
    user = set_user_password(user_id, payload.password)
    context = _
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="users",
        action="user_set_password",
        target_type="user",
        target_id=str(user_id),
        payload={},
    )
    return {"ok": True, "item": user}


@app.post("/v1/admin/users/{user_id}/rotate-key")
def admin_rotate_user_key(user_id: int, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    user, access_key = rotate_user_key(user_id)
    context = _
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Admin"),
        actor_role=context.get("user_role", "admin"),
        area="users",
        action="user_rotate_key",
        target_type="user",
        target_id=str(user_id),
        payload={},
    )
    return {"ok": True, "item": user, "access_key": access_key}


@app.post("/v1/auth/login")
def member_auth_login(payload: CredentialLoginRequest, response: Response, request: Request) -> dict[str, Any]:
    enforce_rate_limit(request, "member_password_login", limit=10, window_seconds=600, extra_key=payload.login.lower())
    user_row = authenticate_user_password(payload.login, payload.password, account_type="member")
    if user_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login or password")
    session_token = create_member_session(user_row)
    set_session_cookie(response, CONFIG.member_session_cookie_name, session_token)
    insert_audit_event(
        actor_user_id=user_row["id"],
        actor_name=user_row["display_name"],
        actor_role=user_row["role"],
        area="auth",
        action="member_password_login",
        target_type="session",
        target_id="member",
        payload={"client": request_client_key(request)},
    )
    return {"ok": True, "user": serialize_user(user_row)}


@app.get("/v1/auth/session")
def member_auth_session(context: dict[str, Any] = Depends(get_member_context)) -> dict[str, Any]:
    return {"ok": True, "session": True, "user": context}


@app.get("/v1/auth/access-policy")
def member_auth_access_policy(context: dict[str, Any] = Depends(get_member_context)) -> dict[str, Any]:
    return {"ok": True, "policy": build_member_access_policy(context)}


@app.get("/v1/auth/sessions")
def member_auth_sessions(request: Request, context: dict[str, Any] = Depends(get_member_context)) -> dict[str, Any]:
    user_id = context.get("user_id")
    current_token = request.cookies.get(CONFIG.member_session_cookie_name, "")
    return {"ok": True, "items": list_member_sessions_for_user(int(user_id), current_token)}


@app.post("/v1/auth/change-password")
def member_auth_change_password(
    payload: PasswordChangeRequest,
    request: Request,
    context: dict[str, Any] = Depends(get_member_context),
) -> dict[str, Any]:
    user_id = context.get("user_id")
    user_row = find_user_by_id(int(user_id))
    if user_row is None or user_row["account_type"] != "member":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member user not found")
    if not verify_password(payload.current_password, user_row["password_hash"] or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is invalid")
    set_user_password(int(user_id), payload.new_password, revoke_sessions=False)
    current_token = request.cookies.get(CONFIG.member_session_cookie_name, "")
    delete_other_member_sessions(int(user_id), current_token)
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Member"),
        actor_role=context.get("user_role", "member"),
        area="auth",
        action="member_change_password",
        target_type="user",
        target_id=str(user_id),
        payload={"other_sessions_revoked": True},
    )
    return {"ok": True}


@app.post("/v1/auth/logout-others")
def member_auth_logout_others(request: Request, context: dict[str, Any] = Depends(get_member_context)) -> dict[str, Any]:
    user_id = context.get("user_id")
    current_token = request.cookies.get(CONFIG.member_session_cookie_name, "")
    before = list_member_sessions_for_user(int(user_id), current_token)
    delete_other_member_sessions(int(user_id), current_token)
    after = list_member_sessions_for_user(int(user_id), current_token)
    revoked = max(0, len(before) - len(after))
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Member"),
        actor_role=context.get("user_role", "member"),
        area="auth",
        action="member_logout_others",
        target_type="session",
        target_id="member",
        payload={"revoked": revoked},
    )
    return {"ok": True, "revoked": revoked}


@app.post("/v1/auth/logout")
def member_auth_logout(request: Request, response: Response) -> dict[str, Any]:
    context = get_member_context(request)
    delete_member_session(request.cookies.get(CONFIG.member_session_cookie_name, ""))
    clear_session_cookie(response, CONFIG.member_session_cookie_name)
    insert_audit_event(
        actor_user_id=context.get("user_id"),
        actor_name=context.get("user_name", "Member"),
        actor_role=context.get("user_role", "member"),
        area="auth",
        action="member_logout",
        target_type="session",
        target_id="member",
        payload={},
    )
    return {"ok": True}


@app.get("/v1/admin/audit-events")
def admin_audit_events(limit: int = 100, _: dict[str, Any] = Depends(require_roles("owner", "admin"))) -> dict[str, Any]:
    return {"items": list_audit_events(limit=limit)}


@app.get("/v1/member/catalog/items")
def member_catalog_items(
    status_filter: str = "published",
    _: dict[str, Any] = Depends(require_member_scopes("catalog")),
) -> dict[str, Any]:
    return {"items": list_catalog_items(status_filter=status_filter)}


@app.get("/v1/member/special-pages")
def member_special_pages(_: dict[str, Any] = Depends(require_member_scopes("special_pages"))) -> dict[str, Any]:
    return {"items": DEFAULT_MEMBER_SPECIAL_PAGES}


@app.get("/v1/admin/crm/status")
def admin_crm_status(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/integrations/amocrm/status")


@app.get("/v1/admin/crm/pipelines")
def admin_crm_pipelines(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/pipelines")


@app.get("/v1/admin/crm/users")
def admin_crm_users(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/users")


@app.get("/v1/admin/crm/leads")
def admin_crm_leads(
    limit: int = 100,
    status_filter: str = "",
    owner_id: int = 0,
    source_filter: str = "",
    tag: str = "",
    follow_up_state: str = "",
    search: str = "",
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    return crm_proxy_request(
        "/v1/internal/leads",
        query={
            "limit": max(1, min(limit, 200)),
            "status_filter": status_filter,
            "owner_id": owner_id,
            "source_filter": source_filter,
            "tag": tag,
            "follow_up_state": follow_up_state,
            "search": search,
        },
    )


@app.get("/v1/admin/crm/leads/{lead_id}")
def admin_crm_lead(lead_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request(f"/v1/internal/leads/{lead_id}")


@app.patch("/v1/admin/crm/leads/{lead_id}")
def admin_crm_patch_lead(
    lead_id: int,
    payload: CrmWorkspaceLeadUpdateRequest,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager", "editor")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/leads/{lead_id}",
        method="PATCH",
        body=payload.model_dump(exclude_none=True),
        actor=context,
    )


@app.get("/v1/admin/crm/leads/{lead_id}/events")
def admin_crm_lead_events(lead_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request(f"/v1/internal/leads/{lead_id}/events")


@app.get("/v1/admin/crm/leads/{lead_id}/comments")
def admin_crm_lead_comments(lead_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request(f"/v1/internal/leads/{lead_id}/comments")


@app.get("/v1/admin/crm/tasks")
def admin_crm_tasks(
    limit: int = 100,
    lead_id: int = 0,
    owner_id: int = 0,
    status_filter: str = "",
    due_state: str = "",
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    return crm_proxy_request(
        "/v1/internal/tasks",
        query={
            "limit": max(1, min(limit, 200)),
            "lead_id": lead_id,
            "owner_id": owner_id,
            "status_filter": status_filter,
            "due_state": due_state,
        },
    )


@app.get("/v1/admin/crm/leads/{lead_id}/tasks")
def admin_crm_lead_tasks(lead_id: int, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request(f"/v1/internal/leads/{lead_id}/tasks")


@app.post("/v1/admin/crm/leads/{lead_id}/tasks")
def admin_crm_create_lead_task(
    lead_id: int,
    payload: CrmLeadTaskCreateRequest,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager", "editor")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/leads/{lead_id}/tasks",
        method="POST",
        body=payload.model_dump(),
        actor=context,
    )


@app.patch("/v1/admin/crm/tasks/{task_id}")
def admin_crm_patch_task(
    task_id: int,
    payload: CrmLeadTaskUpdateRequest,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager", "editor")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/tasks/{task_id}",
        method="PATCH",
        body=payload.model_dump(exclude_none=True),
        actor=context,
    )


@app.post("/v1/admin/crm/leads/{lead_id}/comments")
def admin_crm_create_lead_comment(
    lead_id: int,
    payload: CrmLeadCommentCreateRequest,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager", "editor")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/leads/{lead_id}/comments",
        method="POST",
        body=payload.model_dump(),
        actor=context,
    )


@app.post("/v1/admin/crm/leads/{lead_id}/retry-sync")
def admin_crm_retry_sync(lead_id: int, context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager"))) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/leads/{lead_id}/retry-sync",
        method="POST",
        body={"provider": "amocrm"},
        actor=context,
    )


@app.post("/v1/admin/crm/leads/{lead_id}/dispatch")
def admin_crm_dispatch_lead(
    lead_id: int,
    payload: CrmLeadDispatchRequest,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/leads/{lead_id}/dispatch",
        method="POST",
        body=payload.model_dump(),
        actor=context,
    )


@app.get("/v1/admin/crm/notification-deliveries")
def admin_crm_notification_deliveries(lead_id: int = 0, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/notification-deliveries", query={"lead_id": lead_id})


@app.get("/v1/admin/crm/incoming-webhooks")
def admin_crm_incoming_webhooks(
    limit: int = 100,
    source: str = "",
    status_filter: str = "",
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    return crm_proxy_request(
        "/v1/internal/incoming-webhooks",
        query={
            "limit": max(1, min(limit, 200)),
            "source": source,
            "status_filter": status_filter,
        },
    )


@app.post("/v1/admin/crm/notification-deliveries/{delivery_id}/retry")
def admin_crm_retry_notification_delivery(
    delivery_id: int,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/notification-deliveries/{delivery_id}/retry",
        method="POST",
        actor=context,
    )


@app.post("/v1/admin/crm/delivery-retries/run")
def admin_crm_run_delivery_retries(
    limit: int = 0,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager")),
) -> dict[str, Any]:
    return crm_proxy_request(
        "/v1/internal/delivery-retries/run",
        method="POST",
        query={"limit": max(0, min(limit, 200))},
        actor=context,
    )


@app.get("/v1/admin/crm/webhook-endpoints")
def admin_crm_webhook_endpoints(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/webhook-endpoints")


@app.get("/v1/admin/crm/contact-config")
def admin_crm_contact_config(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/contact-config")


@app.get("/v1/admin/crm/sync-jobs")
def admin_crm_sync_jobs(
    limit: int = 100,
    status_filter: str = "",
    provider: str = "",
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    return crm_proxy_request(
        "/v1/internal/sync-jobs",
        query={
            "limit": max(1, min(limit, 200)),
            "status_filter": status_filter,
            "provider": provider,
        },
    )


@app.post("/v1/admin/crm/sync-jobs/run")
def admin_crm_run_sync_jobs(
    limit: int = 0,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager")),
) -> dict[str, Any]:
    return crm_proxy_request(
        "/v1/internal/sync-jobs/run",
        method="POST",
        query={"limit": max(0, min(limit, 200))},
        actor=context,
    )


@app.get("/v1/admin/crm/webhook-deliveries")
def admin_crm_webhook_deliveries(lead_id: int = 0, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return crm_proxy_request("/v1/internal/webhook-deliveries", query={"lead_id": lead_id})


@app.post("/v1/admin/crm/webhook-deliveries/{delivery_id}/retry")
def admin_crm_retry_webhook_delivery(
    delivery_id: int,
    context: dict[str, Any] = Depends(require_roles("owner", "admin", "manager")),
) -> dict[str, Any]:
    return crm_proxy_request(
        f"/v1/internal/webhook-deliveries/{delivery_id}/retry",
        method="POST",
        actor=context,
    )


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
