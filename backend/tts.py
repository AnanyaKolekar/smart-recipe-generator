"""Text-to-speech with Indian English and Kannada using Google TTS."""

from __future__ import annotations

import base64
import io
import re

from gtts import gTTS

MAX_TTS_CHARS = 4500


def _clean_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    return cleaned[:MAX_TTS_CHARS]


def synthesize_speech_base64(text: str, language: str = "en") -> str:
    """
    Synthesize speech and return base64-encoded MP3.

    Args:
        text: Text to speak.
        language: 'en' for Indian English, 'kn' for Kannada.

    Returns:
        Base64 string of MP3 audio bytes.
    """
    cleaned = _clean_text(text)
    if not cleaned:
        raise ValueError("Text for speech synthesis cannot be empty")

    if language == "kn":
        tts = gTTS(text=cleaned, lang="kn", slow=False)
    else:
        # tld=co.in gives Indian English accent
        tts = gTTS(text=cleaned, lang="en", tld="co.in", slow=False)

    buffer = io.BytesIO()
    tts.write_to_fp(buffer)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")
