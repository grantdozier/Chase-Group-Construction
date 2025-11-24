from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

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

  Behavior:
  - Launch Chromium using Playwright.
  - Open the Lafayette Parish Assessor Beacon search page.
  - Fill the Address search box and click Search.
  - If a detail page loads, scrape owner, parcel number, acreage, and assessed
    value using the provided selectors.
  - Capture a screenshot and HTML under ~/.local_rag_store/beacon_debug for
    debugging.
  """

  debug_dir = Path.home() / ".local_rag_store" / "beacon_debug"
  debug_dir.mkdir(parents=True, exist_ok=True)

  owner = parcel_id = acreage = value = None

  try:
      with sync_playwright() as p:
          browser = p.chromium.launch(headless=False)
          context = browser.new_context()
          page = context.new_page()

          # Direct URL to the Beacon application for Lafayette Parish
          search_url = (
              "https://beacon.schneidercorp.com/Application.aspx"
              "?AppID=966&LayerID=20531&PageTypeID=2&PageID=8141"
          )
          page.goto(search_url, wait_until="load", timeout=60000)

          # Accept terms dialog if present
          try:
              page.get_by_role("button", name="Agree").click(timeout=5000)
          except PlaywrightTimeoutError:
              pass
          except Exception:
              pass

          # Fill the Address search box
          search_text = address or property_label
          try:
              page.fill("#ctl00_ContentPlaceHolder1_txtAddress", search_text)
              page.click("#ctl00_ContentPlaceHolder1_btnSearch")
          except PlaywrightTimeoutError:
              pass
          except Exception:
              pass

          # Give the site some time to navigate / load details
          try:
              page.wait_for_timeout(3000)
          except Exception:
              pass

          # Try to read detail labels. If the search produced a list instead of
          # a detail page, these selectors may fail; we simply fall back.
          try:
              owner = page.locator("#ctl00_ContentPlaceHolder1_lblOwner").inner_text(timeout=5000)
          except PlaywrightTimeoutError:
              owner = None
          except Exception:
              owner = None

          try:
              parcel_id = page.locator("#ctl00_ContentPlaceHolder1_lblParcelNumber").inner_text(timeout=2000)
          except PlaywrightTimeoutError:
              parcel_id = None
          except Exception:
              parcel_id = None

          try:
              acreage = page.locator("#ctl00_ContentPlaceHolder1_lblAcreage").inner_text(timeout=2000)
          except PlaywrightTimeoutError:
              acreage = None
          except Exception:
              acreage = None

          try:
              value = page.locator("#ctl00_ContentPlaceHolder1_lblAssessedValue").inner_text(timeout=2000)
          except PlaywrightTimeoutError:
              value = None
          except Exception:
              value = None

          # Save debug artifacts for the current view
          safe_label = "_".join(property_label.split())[:40]
          screenshot_path = debug_dir / f"beacon_{safe_label}.png"
          html_path = debug_dir / f"beacon_{safe_label}.html"

          try:
              page.screenshot(path=str(screenshot_path), full_page=True)
              html_path.write_text(page.content(), encoding="utf-8")
          except Exception:
              pass

          browser.close()
  except Exception:
      # If anything above fails, we just fall back to placeholder notes below.
      pass

  base_notes = "Beacon automation ran. Screenshot and HTML saved for analysis."
  if address:
      base_notes += f" Property: {address}."

  result = BeaconResult(
      owner=owner or "",
      parcel_id=parcel_id or "",
      acreage=acreage or "",
      value=value or "",
      notes=base_notes,
  )
  return {
      "owner": result.owner or "",
      "parcel_id": result.parcel_id or "",
      "acreage": result.acreage or "",
      "value": result.value or "",
      "notes": result.notes or "",
  }
