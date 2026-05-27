import json
from collections.abc import AsyncIterator
from pathlib import Path

from app.core.config import get_settings
from app.db.models import ChatMessage, ChatRole, ChatSessionKind

PROMPTS_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.txt").read_text(encoding="utf-8")


class AgentRunner:
    """Runs coach / decompose / review flows. Uses OpenAI when configured, else mock."""

    async def stream_chat(
        self,
        session_kind: ChatSessionKind,
        user_message: str,
        history: list[ChatMessage],
    ) -> AsyncIterator[dict]:
        settings = get_settings()
        if not settings.openai_api_key:
            async for chunk in self._mock_stream(session_kind, user_message):
                yield chunk
            return

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        if session_kind == ChatSessionKind.coaching:
            model = settings.openai_model_coach
            system = _load_prompt("coach")
            async for token in self._stream_openai(client, model, system, history, user_message):
                yield {"type": "token", "content": token}
        elif session_kind == ChatSessionKind.decompose:
            model = settings.openai_model_decompose
            system = _load_prompt("decompose")
            text = await self._complete_openai(client, model, system, history, user_message)
            metadata = self._parse_decompose_metadata(text, user_message)
            yield {"type": "token", "content": "分解案を作成しました。内容を確認して確定してください。"}
            yield {"type": "metadata", "content": metadata}
        else:
            yield {"type": "token", "content": "未対応のセッションです。"}

    async def generate_review(self, context: dict) -> str:
        settings = get_settings()
        if not settings.openai_api_key:
            rate = context.get("completion_rate", 0)
            return (
                f"現在の完了率は{rate}%です。小さな一歩を積み重ねることが大切です。"
                "次に取り組むタスクを1つ選び、今日中に着手してみましょう。"
            )

        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        system = _load_prompt("review")
        user_content = json.dumps(context, ensure_ascii=False)
        response = await client.chat.completions.create(
            model=settings.openai_model_review,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
        )
        return response.choices[0].message.content or ""

    async def _mock_stream(
        self, session_kind: ChatSessionKind, user_message: str
    ) -> AsyncIterator[dict]:
        if session_kind == ChatSessionKind.decompose:
            metadata = {
                "proposal_version": 1,
                "milestones": [
                    {
                        "title": f"{user_message[:30]}に向けた準備",
                        "sort_order": 0,
                        "tasks": [
                            {"title": "現状を整理する", "sort_order": 0},
                            {"title": "最初の一歩を決める", "sort_order": 1},
                        ],
                    }
                ],
            }
            yield {"type": "token", "content": "分解案を作成しました（モック）。"}
            yield {"type": "metadata", "content": metadata}
        else:
            yield {
                "type": "token",
                "content": f"了解しました。「{user_message[:50]}」について、もう少し具体的に教えてください。",
            }

    async def _stream_openai(
        self,
        client,
        model: str,
        system: str,
        history: list[ChatMessage],
        user_message: str,
    ) -> AsyncIterator[str]:
        messages = [{"role": "system", "content": system}]
        for msg in history[-10:]:
            messages.append({"role": msg.role.value, "content": msg.content})
        messages.append({"role": "user", "content": user_message})
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def _complete_openai(
        self,
        client,
        model: str,
        system: str,
        history: list[ChatMessage],
        user_message: str,
    ) -> str:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ]
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or "{}"

    def _parse_decompose_metadata(self, text: str, user_message: str) -> dict:
        try:
            data = json.loads(text)
            if "milestones" in data:
                data.setdefault("proposal_version", 1)
                return data
        except json.JSONDecodeError:
            pass
        return {
            "proposal_version": 1,
            "milestones": [
                {
                    "title": "フェーズ1",
                    "sort_order": 0,
                    "tasks": [{"title": user_message[:100] or "最初のタスク", "sort_order": 0}],
                }
            ],
        }
