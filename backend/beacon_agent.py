from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from pathlib import Path

from playwright.sync_api import sync_playwright

# NOTE: This is currently a STUB that pretends to run a Beacon / tax assessor lookup.
# Later we can replace the internals with real Playwright-based automation.


@dataclass
class BeaconResult:
  owner: str | None = None
  parcel_id: str | None = None
  acreage: str | None = None
  value: str | None = None
  notes: str | None = None


def run_beacon_lookup(
    property_label: str,
    address: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> Dict[str, str]:
  """Playwright-based scaffold for Beacon lookup.

  Current behavior:
  - Launch Chromium using Playwright.
  - Open https://lafayetteassessor.com/.
  - Click the "Real Estate Map & Search" navigation item.
  - If a Terms & Conditions dialog appears, click "Agree".
  - Capture a screenshot and HTML of the Real Property Search view under
    ~/.local_rag_store/beacon_debug.
  - Return placeholder structured data so the rest of the pipeline keeps
    working.

  Next step (once DOM selectors are confirmed) will be to actually fill in the
  search address/parcel and scrape real owner/parcel/acreage/value details.
  """

  debug_dir = Path.home() / ".local_rag_store" / "beacon_debug"
  debug_dir.mkdir(parents=True, exist_ok=True)

  try:
      with sync_playwright() as p:
          browser = p.chromium.launch(headless=False)
          context = browser.new_context()
          page = context.new_page()

          base_url = "https://lafayetteassessor.com/"
          page.goto(base_url, wait_until="load", timeout=60000)

          # Click the "Real Estate Map & Search" nav item if present
          try:
              page.get_by_role("link", name="Real Estate Map & Search", exact=True).click(timeout=10000)
          except Exception:
              # If the selector fails, continue with whatever page we have
              pass

          # A new tab/window might have opened; pick the last page in the context
          if len(context.pages) > 1:
              page = context.pages[-1]

          # Accept Terms & Conditions if the dialog is present
          try:
              page.get_by_role("button", name="Agree").click(timeout=10000)
          except Exception:
              pass

          # Save debug artifacts for the Real Property Search view
          safe_label = "_".join(property_label.split())[:40]
          screenshot_path = debug_dir / f"beacon_{safe_label}.png"
          html_path = debug_dir / f"beacon_{safe_label}.html"

          page.screenshot(path=str(screenshot_path), full_page=True)
          html_path.write_text(page.content(), encoding="utf-8")

          browser.close()
  except Exception:
      # For now, ignore automation errors and fall back to placeholders.
      pass

  base_notes = "Beacon automation scaffold ran. Screenshot and HTML saved for analysis. Placeholder data below."
  if address:
      base_notes += f" Property: {address}."

  result = BeaconResult(
      owner="(owner from Beacon TBD)",
      parcel_id="(parcel id TBD)",
      acreage="(acreage TBD)",
      value="(assessed value TBD)",
      notes=base_notes,
  )
  return {
      "owner": result.owner or "",
      "parcel_id": result.parcel_id or "",
      "acreage": result.acreage or "",
      "value": result.value or "",
      "notes": result.notes or "",
  }
