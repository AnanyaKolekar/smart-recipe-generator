"""Text-to-speech with authentic Indian English and Kannada neural voices."""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import re

import edge_tts

logger = logging.getLogger(__name__)

MAX_TTS_CHARS = 4500

# Microsoft Edge neural voices — native en-IN / kn-IN Indian accents
INDIAN_VOICES: dict[str, str] = {
    "en": "en-IN-NeerjaNeural",
    "kn": "kn-IN-SapnaNeural",
}

# Slightly slower pace for clearer cooking-step narration
SPEECH_RATE = "-8%"


def _clean_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    return cleaned[:MAX_TTS_CHARS]


def _voice_for_language(language: str) -> str:
    return INDIAN_VOICES.get(language, INDIAN_VOICES["en"])


async def _synthesize_edge_tts(text: str, language: str) -> bytes:
    voice = _voice_for_language(language)
    communicate = edge_tts.Communicate(text, voice, rate=SPEECH_RATE)
    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    audio = buffer.getvalue()
    if not audio:
        raise ValueError("Speech synthesis returned empty audio")
    return audio


async def synthesize_speech_base64_async(text: str, language: str = "en") -> str:
    """
    Synthesize speech and return base64-encoded MP3.

    Args:
        text: Text to speak.
        language: 'en' for Indian English (en-IN), 'kn' for Kannada (kn-IN).

    Returns:
        Base64 string of MP3 audio bytes.
    """
    cleaned = _clean_text(text)
    if not cleaned:
        raise ValueError("Text for speech synthesis cannot be empty")

    logger.info("Synthesizing %s speech with %s", language, _voice_for_language(language))
    audio_bytes = await _synthesize_edge_tts(cleaned, language)
    return base64.b64encode(audio_bytes).decode("utf-8")


def synthesize_speech_base64(text: str, language: str = "en") -> str:
    """Sync wrapper for callers that are not async."""
    return asyncio.run(synthesize_speech_base64_async(text, language))
