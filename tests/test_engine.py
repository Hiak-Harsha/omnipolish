"""Unit tests for OmniPolish Core Engine, Providers, and REST API."""

import pytest
from omnipolish.core.engine import PolisherEngine
from omnipolish.core.providers import RuleBasedFallbackProvider
from omnipolish.core.prompt import build_system_prompt
from omnipolish.server.api import get_status, format_message, FormatRequest

def test_system_prompt_builder():
    prompt_wa = build_system_prompt("whatsapp")
    assert "*important key point*" in prompt_wa
    
    prompt_md = build_system_prompt("markdown")
    assert "**important key point**" in prompt_md

    prompt_plain = build_system_prompt("plain")
    assert "Instagram" in prompt_plain

def test_rule_based_fallback_typos():
    fallback = RuleBasedFallbackProvider()
    input_text = "teh meeting is tomorrow and i cant make it plz let me know"
    result = fallback.polish(input_text, mode="markdown")
    
    # Typos corrected
    assert "the" in result.lower()
    assert "can't" in result.lower()
    assert "please" in result.lower()
    # Highlighting of important keyword 'meeting'
    assert "**meeting**" in result.lower()

def test_engine_clean_output():
    engine = PolisherEngine()
    
    # Code fence stripping
    wrapped = "```markdown\nHello world\n```"
    assert engine.clean_output(wrapped) == "Hello world"
    
    # Preamble stripping
    preamble = "Here is the corrected message: Can we meet at 5pm?"
    assert engine.clean_output(preamble) == "Can we meet at 5pm?"

    # Quote stripping
    quoted = '"This is a test message"'
    assert engine.clean_output(quoted) == "This is a test message"

def test_engine_fallback_execution():
    engine = PolisherEngine()
    engine.set_provider(RuleBasedFallbackProvider())
    formatted, latency, provider = engine.format_text(
        "urgent reminder for project submission",
        mode="whatsapp"
    )
    assert "*urgent*" in formatted.lower() or "*reminder*" in formatted.lower()
    assert latency >= 0.0
    assert "RuleBasedFallbackProvider" in provider

def test_api_status_endpoint():
    status = get_status()
    assert status["status"] == "online"
    assert "provider" in status
    assert "hotkey" in status

def test_api_format_endpoint():
    req = FormatRequest(
        text="hey whats up teh project deadline is 4pm asap",
        mode="whatsapp"
    )
    res = format_message(req)
    assert res.formatted_text is not None
    assert res.latency_ms >= 0.0
    assert res.provider is not None
    assert "*deadline*" in res.formatted_text.lower() or "*asap*" in res.formatted_text.lower()
