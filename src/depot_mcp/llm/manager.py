"""LLM Manager — provider registration, auto-discovery (glom), and routing."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from depot_mcp.llm.providers import LLMProvider, LMStudioProvider, OllamaProvider, OpenAIProvider, ProviderType

logger = logging.getLogger(__name__)


class LLMManager:
    """Manages LLM providers and routes chat requests."""

    _instance: LLMManager | None = None

    def __init__(self) -> None:
        self.providers: dict[ProviderType, LLMProvider] = {}
        self._has_glommed = False

    def register_provider(self, provider_type: ProviderType, base_url: str, api_key: str | None = None) -> bool:
        if provider_type in self.providers:
            logger.info("Provider %s already registered, skipping", provider_type)
            return True
        provider: LLMProvider
        if provider_type == ProviderType.OLLAMA:
            provider = OllamaProvider(base_url)
        elif provider_type == ProviderType.LM_STUDIO:
            provider = LMStudioProvider(base_url)
        elif provider_type == ProviderType.OPENAI:
            provider = OpenAIProvider(base_url, api_key)
        else:
            return False
        self.providers[provider_type] = provider
        logger.info("Registered provider: %s (%s)", provider_type, base_url)
        return True

    async def glom_local_providers_if_up(self) -> None:
        """Auto-discover local Ollama and LM Studio instances on the LAN."""
        if os.getenv("DEPOT_MCP_LLM_GLOM", "1").strip().lower() in ("0", "false", "no", "off"):
            return
        if self._has_glommed:
            return
        self._has_glommed = True
        timeout = httpx.Timeout(2.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            if ProviderType.OLLAMA not in self.providers:
                try:
                    r = await client.get("http://127.0.0.1:11434/api/tags")
                    if r.status_code == 200:
                        self.register_provider(ProviderType.OLLAMA, "http://127.0.0.1:11434")
                except Exception:
                    logger.debug("Ollama not found on localhost:11434")
            if ProviderType.LM_STUDIO not in self.providers:
                try:
                    r = await client.get("http://127.0.0.1:1234/v1/models")
                    if r.status_code == 200:
                        self.register_provider(ProviderType.LM_STUDIO, "http://127.0.0.1:1234")
                except Exception:
                    logger.debug("LM Studio not found on localhost:1234")

    async def list_providers(self) -> list[dict[str, Any]]:
        await self.glom_local_providers_if_up()
        return [{"type": pt.value, "base_url": p.base_url} for pt, p in self.providers.items()]

    async def list_models(self, provider_type: str | None = None) -> list[dict[str, Any]]:
        await self.glom_local_providers_if_up()
        if provider_type:
            pt = ProviderType(provider_type)
            prov = self.providers.get(pt)
            if prov:
                return await prov.list_models()
            return []
        all_models = []
        for prov in self.providers.values():
            models = await prov.list_models()
            all_models.extend(models)
        return all_models

    async def chat(
        self, messages: list[dict], provider: str | None = None, stream: bool = False, model: str | None = None
    ) -> dict | str:
        await self.glom_local_providers_if_up()
        if provider:
            pt = ProviderType(provider)
            prov = self.providers.get(pt)
            if not prov:
                return {"error": f"Provider {provider} not registered"}
            return await prov.chat(messages, stream=stream, model_name=model)
        for pt in (ProviderType.OLLAMA, ProviderType.LM_STUDIO, ProviderType.OPENAI):
            prov = self.providers.get(pt)
            if prov:
                return await prov.chat(messages, stream=stream, model_name=model)
        return {"error": "No LLM providers available"}

    async def load_model(self, model_name: str, provider: str = "ollama") -> dict:
        pt = ProviderType(provider)
        prov = self.providers.get(pt)
        if not prov:
            return {"success": False, "error": f"Provider {provider} not registered"}
        if isinstance(prov, OllamaProvider):
            return await prov.load_model(model_name)
        return {"success": True, "model": model_name}


_manager: LLMManager | None = None


def get_llm_manager() -> LLMManager:
    global _manager
    if _manager is None:
        _manager = LLMManager()
    return _manager
