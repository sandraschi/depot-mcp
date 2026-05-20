"""LLM API endpoints for model management and chat with Ollama."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from depot_mcp.llm.manager import get_llm_manager
from depot_mcp.llm.providers import ProviderType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user, assistant, system)")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., description="List of chat messages")
    provider: str | None = Field(None, description="Provider type (ollama, lm_studio, openai)")
    stream: bool = Field(False, description="Whether to stream the response")
    model: str | None = Field(None, description="Model name")


class ProviderConfig(BaseModel):
    type: str = Field(..., description="Provider type")
    base_url: str = Field(..., description="Base URL for the provider")
    api_key: str | None = Field(None, description="API key (for OpenAI)")


@router.get("/providers", summary="List all registered providers")
async def list_providers() -> dict[str, Any]:
    try:
        manager = get_llm_manager()
        providers = await manager.list_providers()
        return {"success": True, "providers": providers}
    except Exception as e:
        logger.exception("Failed to list providers")
        raise HTTPException(500, detail=str(e)) from e


@router.post("/providers/register", summary="Register a new provider")
async def register_provider(config: ProviderConfig) -> dict[str, Any]:
    try:
        manager = get_llm_manager()
        provider_type = ProviderType(config.type)
        success = manager.register_provider(provider_type, config.base_url, config.api_key)
        if success:
            return {"success": True, "message": f"Provider {config.type} registered"}
        raise HTTPException(400, detail=f"Failed to register provider {config.type}")
    except ValueError as e:
        raise HTTPException(400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Failed to register provider")
        raise HTTPException(500, detail=str(e)) from e


@router.get("/models", summary="List available models")
async def list_models(provider: str | None = None) -> dict[str, Any]:
    try:
        manager = get_llm_manager()
        models = await manager.list_models(provider)
        return {"success": True, "models": models}
    except Exception as e:
        logger.exception("Failed to list models")
        raise HTTPException(500, detail=str(e)) from e


@router.post("/models/load", summary="Load a model on a provider")
async def load_model(model_name: str, provider: str = "ollama") -> dict[str, Any]:
    try:
        manager = get_llm_manager()
        result = await manager.load_model(model_name, provider)
        return result
    except Exception as e:
        logger.exception("Failed to load model")
        raise HTTPException(500, detail=str(e)) from e


@router.post("/chat", summary="Send a chat message")
async def chat(request: ChatRequest) -> dict[str, Any]:
    try:
        manager = get_llm_manager()
        msgs = [{"role": m.role, "content": m.content} for m in request.messages]
        result = await manager.chat(msgs, provider=request.provider, stream=request.stream, model=request.model)
        if isinstance(result, dict) and "error" in result:
            return {"success": False, "error": result["error"]}
        if isinstance(result, dict) and "content" in result:
            return {"success": True, "message": result}
        return {"success": True, "message": {"role": "assistant", "content": str(result), "provider": "auto"}}
    except Exception as e:
        logger.exception("Chat failed")
        raise HTTPException(500, detail=str(e)) from e
