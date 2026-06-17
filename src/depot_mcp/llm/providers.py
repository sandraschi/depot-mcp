"""LLM provider implementations for Ollama, LM Studio, and OpenAI-compatible APIs."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from enum import StrEnum
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ProviderType(StrEnum):
    OLLAMA = "ollama"
    LM_STUDIO = "lm_studio"
    OPENAI = "openai"


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))

    @abstractmethod
    async def list_models(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def chat(self, messages: list[dict], stream: bool = False, model_name: str | None = None) -> dict | str: ...

    async def close(self) -> None:
        await self._client.aclose()


class OllamaProvider(LLMProvider):
    """Provider for local Ollama instance."""

    def __init__(self, base_url: str = "http://localhost:11434") -> None:
        super().__init__(base_url)
        self._current_model: str | None = None

    async def list_models(self) -> list[dict[str, Any]]:
        try:
            resp = await self._client.get(f"{self.base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = []
            for model in data.get("models", []):
                models.append(
                    {
                        "name": model.get("name", ""),
                        "provider": "ollama",
                        "size": model.get("size", 0),
                        "modified": model.get("modified_at", ""),
                    }
                )
            return models
        except Exception as e:
            logger.warning("Ollama list_models failed: %s", e)
            return []

    async def chat(self, messages: list[dict], stream: bool = False, model_name: str | None = None) -> dict | str:
        use_model = model_name or self._current_model or "llama3.2"
        system = ""
        converted = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                converted.append(msg)

        prompt_parts = []
        if system:
            prompt_parts.append(f"System: {system}")
        for msg in converted:
            role = msg["role"].capitalize()
            prompt_parts.append(f"{role}: {msg['content']}")
        prompt_parts.append("Assistant:")
        prompt = "\n".join(prompt_parts)

        payload: dict[str, Any] = {"model": use_model, "prompt": prompt, "stream": stream}
        resp = await self._client.post(f"{self.base_url}/api/generate", json=payload)
        resp.raise_for_status()
        data = resp.json()
        if stream:
            return data.get("response", "")
        return {
            "role": "assistant",
            "content": data.get("response", ""),
            "model": use_model,
            "provider": "ollama",
        }

    async def load_model(self, model_name: str) -> dict:
        payload = {"model": model_name, "stream": False}
        resp = await self._client.post(f"{self.base_url}/api/generate", json=payload)
        resp.raise_for_status()
        self._current_model = model_name
        return {"success": True, "model": model_name}


class LMStudioProvider(LLMProvider):
    """Provider for local LM Studio instance (OpenAI-compatible API)."""

    async def list_models(self) -> list[dict[str, Any]]:
        try:
            resp = await self._client.get(f"{self.base_url}/v1/models")
            resp.raise_for_status()
            data = resp.json()
            return [{"name": m["id"], "provider": "lm_studio"} for m in data.get("data", [])]
        except Exception as e:
            logger.warning("LM Studio list_models failed: %s", e)
            return []

    async def chat(self, messages: list[dict], stream: bool = False, model_name: str | None = None) -> dict | str:
        payload = {
            "model": model_name or "local-model",
            "messages": messages,
            "stream": stream,
        }
        resp = await self._client.post(f"{self.base_url}/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        if stream:
            return data
        choice = data["choices"][0]
        return {
            "role": "assistant",
            "content": choice["message"]["content"],
            "model": data.get("model", ""),
            "provider": "lm_studio",
        }


class OpenAIProvider(LLMProvider):
    """Provider for OpenAI-compatible API (remote)."""

    def __init__(self, base_url: str = "https://api.openai.com/v1", api_key: str | None = None) -> None:
        super().__init__(base_url)
        self._api_key = api_key

    async def list_models(self) -> list[dict[str, Any]]:
        headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
        try:
            resp = await self._client.get(f"{self.base_url}/models", headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return [{"name": m["id"], "provider": "openai"} for m in data.get("data", [])]
        except Exception as e:
            logger.warning("OpenAI list_models failed: %s", e)
            return []

    async def chat(self, messages: list[dict], stream: bool = False, model_name: str | None = None) -> dict | str:
        headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
        payload: dict[str, Any] = {
            "model": model_name or "gpt-4o-mini",
            "messages": messages,
            "stream": stream,
        }
        resp = await self._client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        if stream:
            return data
        choice = data["choices"][0]
        return {
            "role": "assistant",
            "content": choice["message"]["content"],
            "model": data.get("model", ""),
            "provider": "openai",
        }
