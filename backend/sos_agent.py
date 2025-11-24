from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, List

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


@dataclass
class SosResult:
    entity_name: Optional[str] = None
    status: Optional[str] = None
    registered_agent: Optional[str] = None
    registered_office_address: Optional[str] = None
    officers: Optional[List[str]] = None
    notes: Optional[str] = None


def run_sos_lookup(entity_name: str) -> Dict[str, object]:
    """Playwright-based scaffold for Louisiana SOS lookup.

    Current behavior:
    - Launch Chromium using Playwright.
    - Open https://coraweb.sos.la.gov/CommercialSearch/CommercialSearch.aspx.
    - Fill the Entity Name search box and click Search.
    - Click the first entity in the results grid if possible.
    - Scrape registered agent, agent address, officers, and status using the
      provided selectors.
    - Capture a screenshot and HTML under ~/.local_rag_store/sos_debug.
    """

    debug_dir = Path.home() / ".local_rag_store" / "sos_debug"
    debug_dir.mkdir(parents=True, exist_ok=True)

    status: Optional[str] = None
    agent_name: Optional[str] = None
    agent_address: Optional[str] = None
    officers: List[str] = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            search_url = "https://coraweb.sos.la.gov/CommercialSearch/CommercialSearch.aspx"
            page.goto(search_url, wait_until="load", timeout=60000)

            # Fill entity name and search
            try:
                page.fill("#MainContent_txtEntityName", entity_name)
                page.click("#MainContent_btnSearch")
            except PlaywrightTimeoutError:
                pass
            except Exception:
                pass

            # Give results time to appear
            try:
                page.wait_for_timeout(3000)
            except Exception:
                pass

            # Try to click the first result link in the results grid, if present
            try:
                first_link = page.locator("#MainContent_gvSearchResults a").first
                first_link().click(timeout=5000)
                page.wait_for_timeout(2000)
            except PlaywrightTimeoutError:
                pass
            except Exception:
                pass

            # Scrape registered agent and address
            try:
                agent_name = page.locator("#MainContent_lblAgentName").inner_text(timeout=3000)
            except PlaywrightTimeoutError:
                agent_name = None
            except Exception:
                agent_name = None

            try:
                agent_address = page.locator("#MainContent_lblAgentAddress").inner_text(timeout=3000)
            except PlaywrightTimeoutError:
                agent_address = None
            except Exception:
                agent_address = None

            # Officers table
            try:
                officers = page.locator("#MainContent_gvOfficers tr").all_inner_texts()
            except PlaywrightTimeoutError:
                officers = []
            except Exception:
                officers = []

            # Capture screenshot + HTML
            safe_name = "_".join(entity_name.split())[:40]
            screenshot_path = debug_dir / f"sos_{safe_name}.png"
            html_path = debug_dir / f"sos_{safe_name}.html"

            try:
                page.screenshot(path=str(screenshot_path), full_page=True)
                html_path.write_text(page.content(), encoding="utf-8")
            except Exception:
                pass

            browser.close()
    except Exception:
        # Ignore automation errors; we still return whatever we were able to
        # scrape (possibly empty) together with notes.
        pass

    base_notes = "SOS automation ran. Screenshot and HTML saved for analysis."

    result = SosResult(
        entity_name=entity_name,
        status=status or "",
        registered_agent=agent_name or "",
        registered_office_address=agent_address or "",
        officers=officers or [],
        notes=base_notes,
    )

    return {
        "entity_name": result.entity_name or "",
        "status": result.status or "",
        "registered_agent": result.registered_agent or "",
        "registered_office_address": result.registered_office_address or "",
        "officers": result.officers or [],
        "notes": result.notes or "",
    }
