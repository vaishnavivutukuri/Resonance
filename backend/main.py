import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from config import settings
import auth
import routes_music
import routes_social
import routes_game

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Resonance backend...")
    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    os.makedirs(os.path.join(settings.AUDIO_STORAGE_PATH, "audio"), exist_ok=True)
    os.makedirs(os.path.join(settings.AUDIO_STORAGE_PATH, "covers"), exist_ok=True)
    os.makedirs(os.path.join(settings.AUDIO_STORAGE_PATH, "avatars"), exist_ok=True)
    await init_db()
    logger.info("MongoDB initialized with Beanie.")
    await ensure_admin_exists()
    yield
    logger.info("Shutting down Resonance backend.")


async def ensure_admin_exists() -> None:
    try:
        from models import User
        from auth import hash_password
        existing = await User.find_one(User.username == settings.ADMIN_USERNAME)
        if existing:
            if not existing.is_admin:
                existing.is_admin = True
                await existing.save()
                logger.info("Promoted existing user '%s' to admin.", settings.ADMIN_USERNAME)
            else:
                logger.info("Admin '%s' already exists.", settings.ADMIN_USERNAME)
            return
        any_admin = await User.find_one(User.is_admin == True)
        if any_admin:
            logger.info(
                "Admin '%s' not found, but another admin '%s' exists — skipping bootstrap.",
                settings.ADMIN_USERNAME,
                any_admin.username,
            )
            return
        admin = User(
            username=settings.ADMIN_USERNAME,
            email=settings.ADMIN_EMAIL,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            is_admin=True,
        )
        await admin.insert()
        logger.info("Bootstrap admin '%s' created from .env.", settings.ADMIN_USERNAME)
    except Exception as exc:
        logger.error("Failed to ensure admin exists: %s", exc)


app = FastAPI(
    title="Resonance API",
    description="Music streaming + rhythm game backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage_path = os.path.abspath(settings.AUDIO_STORAGE_PATH)
if os.path.exists(storage_path):
    app.mount("/storage", StaticFiles(directory=storage_path), name="storage")

app.include_router(auth.router)
app.include_router(routes_music.router)
app.include_router(routes_social.router)
app.include_router(routes_game.router)


@app.get("/")
def root():
    return {"app": "Resonance", "status": "ok", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
