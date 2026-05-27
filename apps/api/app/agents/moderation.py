from app.core.config import get_settings
from app.core.exceptions import AppError


async def check_moderation(text: str) -> None:
    settings = get_settings()
    if not settings.openai_api_key:
        return
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    result = await client.moderations.create(input=text)
    flagged = result.results[0].flagged if result.results else False
    if flagged:
        raise AppError(
            "VALIDATION_ERROR",
            "入力内容を送信できません。表現を見直してください。",
            400,
        )


async def check_moderation_optional(text: str) -> None:
    try:
        await check_moderation(text)
    except AppError:
        raise
