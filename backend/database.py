from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from config import settings

client = None

async def init_db():
    global client
    client = AsyncIOMotorClient(settings.DATABASE_URL)
    if not hasattr(AsyncIOMotorClient, 'append_metadata'):
        AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None
    import models
    await init_beanie(
        database=client["resonance"],
        document_models=models.__models__
    )

def get_db():
    if client is None:
        raise Exception("Database not initialized")
    return client.get_default_database()
