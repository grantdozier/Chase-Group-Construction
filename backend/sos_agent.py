from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, List

from playwright.sync_api import sync_playwright


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
    - Open https://coraweb.sos.la.gov.
    - Attempt to navigate into the business / commercial search.
    - Capture a screenshot and HTML of the first search page under
      ~/.local_rag_store/sos_debug.
    - Return placeholder structured data so the rest of the pipeline keeps
      working.

    Next step (once DOM selectors are confirmed) will be to actually perform the
    entity search and scrape real officers/agent/address details.
    """

    debug_dir = Path.home() / ".local_rag_store" / "sos_debug"
    debug_dir.mkdir(parents=True, exist_ok=True)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()

            base_url = "https://coraweb.sos.la.gov/"
            page.goto(base_url, wait_until="load", timeout=60000)

            # TODO: refine selectors once we have HTML snapshots from this page
            # Try to click something that looks like a commercial / business search
            try:
                page.get_by_role("link", name="Commercial Search").click(timeout=10000)
            except Exception:
                try:
                    page.get_by_text("Business Filings", exact=False).click(timeout=10000)
                except Exception:
                    pass

            safe_name = "_".join(entity_name.split())[:40]
            screenshot_path = debug_dir / f"sos_{safe_name}.png"
            html_path = debug_dir / f"sos_{safe_name}.html"

            page.screenshot(path=str(screenshot_path), full_page=True)
            html_path.write_text(page.content(), encoding="utf-8")

            browser.close()
    except Exception:
        # Ignore automation errors for now; we still return placeholder data.
        pass

    base_notes = (
        "SOS automation scaffold ran. Screenshot and HTML saved for analysis. "
        "Placeholder data below."
    )

    result = SosResult(
        entity_name=entity_name,
        status="(status TBD)",
        registered_agent="(registered agent TBD)",
        registered_office_address="(registered office address TBD)",
        officers=["(officers TBD)"],
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
