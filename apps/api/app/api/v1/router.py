from fastapi import APIRouter

from app.api.v1 import chat, goals, health, items, me, reviews

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(me.router)
api_router.include_router(goals.router)
api_router.include_router(items.router)
api_router.include_router(chat.router)
api_router.include_router(reviews.router)
