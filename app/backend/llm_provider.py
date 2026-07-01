"""Small LLM/search provider layer for free-tier friendly calls."""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_mistralai.chat_models import ChatMistralAI

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
TAVILY_URL = "https://api.tavily.com/search"
SERPER_URL = "https://google.serper.dev/search"

DEFAULT_GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
DEFAULT_MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")


def _env(name: str) -> str:
    return os.environ.get(name, "").strip()


def _clip(text: str, limit: int = 6000) -> str:
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit] + "\n...[trimmed]"


async def chat_complete(
    system: str,
    user: str,
    session_id: str,
    max_tokens: int = 1400,
    temperature: float = 0.35,
) -> str:
    """Call the first available provider, using compact prompts and retries."""
    providers = []
    if _env("GROQ_API_KEY"):
        providers.append("groq")
    if _env("MISTRAL_API_KEY"):
        providers.append("mistral")

    if not providers:
        raise RuntimeError("No LLM key configured. Set GROQ_API_KEY or MISTRAL_API_KEY in backend .env")

    compact_user = _clip(user, int(os.environ.get("LLM_INPUT_CHAR_LIMIT", "7000")))
    last_error: Optional[Exception] = None
    for provider in providers:
        try:
            if provider == "groq":
                return await _langchain_groq_chat(system, compact_user, max_tokens, temperature)
            return await _langchain_mistral_chat(system, compact_user, max_tokens, temperature)
        except Exception as exc:
            last_error = exc
            logger.warning("%s LLM call failed for %s: %s", provider, session_id, exc)
    raise RuntimeError(f"All configured LLM providers failed: {last_error}")


async def _langchain_groq_chat(system: str, user: str, max_tokens: int, temperature: float) -> str:
    llm = ChatGroq(
        api_key=_env("GROQ_API_KEY"),
        model=DEFAULT_GROQ_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return await _invoke_langchain(llm, system, user, "groq")


async def _langchain_mistral_chat(system: str, user: str, max_tokens: int, temperature: float) -> str:
    llm = ChatMistralAI(
        api_key=_env("MISTRAL_API_KEY"),
        model=DEFAULT_MISTRAL_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return await _invoke_langchain(llm, system, user, "mistral")


async def _invoke_langchain(llm, system: str, user: str, provider: str) -> str:
    messages = [SystemMessage(content=system), HumanMessage(content=user)]
    for attempt in range(3):
        try:
            response = await llm.ainvoke(messages)
            content = response.content
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                return "\n".join(
                    part.get("text", "") if isinstance(part, dict) else str(part)
                    for part in content
                )
            return str(content)
        except Exception as exc:
            text = str(exc).lower()
            if any(code in text for code in ["429", "rate", "timeout", "temporarily", "503", "502", "500"]):
                await asyncio.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"{provider} LangChain error: {exc}") from exc
    raise RuntimeError(f"{provider} rate limited or unavailable after retries")

//Currently We are Not using this function
async def _openai_compatible_chat(
    url: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    max_tokens: int,
    temperature: float,
    provider: str,
) -> str:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                res = await client.post(url, headers=headers, json=payload)
            if res.status_code in {429, 500, 502, 503, 504}:
                await asyncio.sleep(2 ** attempt)
                continue
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500] if exc.response is not None else str(exc)
            raise RuntimeError(f"{provider} HTTP error: {detail}") from exc
    raise RuntimeError(f"{provider} rate limited or unavailable after retries")


async def search_web(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Use Tavily first, then Serper. Returns compact search snippets."""
    if _env("TAVILY_API_KEY"):
        try:
            return await _tavily_search(query, max_results)
        except Exception as exc:
            logger.warning("Tavily search failed: %s", exc)
    if _env("SERPER_API_KEY"):
        try:
            return await _serper_search(query, max_results)
        except Exception as exc:
            logger.warning("Serper search failed: %s", exc)
    return []


async def _tavily_search(query: str, max_results: int) -> List[Dict[str, Any]]:
    payload = {
        "api_key": _env("TAVILY_API_KEY"),
        "query": query,
        "search_depth": "basic",
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(TAVILY_URL, json=payload)
    res.raise_for_status()
    data = res.json()
    return [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "content": _clip(item.get("content", ""), 700),
        }
        for item in data.get("results", [])[:max_results]
    ]


async def _serper_search(query: str, max_results: int) -> List[Dict[str, Any]]:
    headers = {"X-API-KEY": _env("SERPER_API_KEY"), "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(SERPER_URL, headers=headers, json={"q": query, "num": max_results})
    res.raise_for_status()
    data = res.json()
    return [
        {
            "title": item.get("title", ""),
            "url": item.get("link", ""),
            "content": _clip(item.get("snippet", ""), 700),
        }
        for item in data.get("organic", [])[:max_results]
    ]
