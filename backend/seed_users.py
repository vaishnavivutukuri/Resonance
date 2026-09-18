import asyncio
from config import settings
from database import init_db
from models import User
from auth import hash_password

async def ensure_admin():
    admin = await User.find_one(User.username == settings.ADMIN_USERNAME)
    if admin:
        if not admin.is_admin:
            admin.is_admin = True
            await admin.save()
            print(f"Promoted existing user '{settings.ADMIN_USERNAME}' to admin.")
        else:
            print(f"Admin user already exists ({settings.ADMIN_USERNAME})")
        return admin
    any_admin = await User.find_one(User.is_admin == True)
    if any_admin:
        print(f"Admin '{settings.ADMIN_USERNAME}' not found, but admin '{any_admin.username}' exists — skipping.")
        return any_admin
    admin = User(
        username=settings.ADMIN_USERNAME,
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        is_admin=True,
    )
    await admin.insert()
    print(f"Admin user created ({settings.ADMIN_USERNAME} / <password from .env>)")
    return admin

async def seed():
    await init_db()
    await ensure_admin()
    player = await User.find_one(User.username == "player1")
    if not player:
        player = User(
            username="player1",
            email="player1@resonance.com",
            password_hash=hash_password("player123"),
            is_admin=False
        )
        await player.insert()
        print("Normal user created (player1 / player123)")
    else:
        print("Normal user already exists")

if __name__ == "__main__":
    asyncio.run(seed())
