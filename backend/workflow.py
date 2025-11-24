from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Dict

from fastapi import APIRouter, HTTPException

from .models import (
    WorkflowRun,
    WorkflowCreateRequest,
    WorkflowStepData,
    SiteCredential,
    CredentialUpdateRequest,
)
from .beacon_agent import run_beacon_lookup
from .sos_agent import run_sos_lookup


router = APIRouter(prefix="/workflow", tags=["workflow"])


def _workflow_dir() -> Path:
    base = Path.home() / ".local_rag_store" / "workflows"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _credentials_path() -> Path:
    base = Path.home() / ".local_rag_store"
    base.mkdir(parents=True, exist_ok=True)
    return base / "credentials.json"


def _load_credentials() -> Dict[str, Dict[str, str]]:
    path = _credentials_path()
    if not path.exists():
        return {}
    try:
        import json

        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_credentials(data: Dict[str, Dict[str, str]]) -> None:
    import json

    path = _credentials_path()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _workflow_path(run_id: str) -> Path:
    return _workflow_dir() / f"{run_id}.json"


def _load_run(run_id: str) -> WorkflowRun:
    path = _workflow_path(run_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Workflow run not found")
    data = path.read_text(encoding="utf-8")
    return WorkflowRun.model_validate_json(data)


def _save_run(run: WorkflowRun) -> None:
    path = _workflow_path(run.id)
    path.write_text(run.model_dump_json(indent=2), encoding="utf-8")


@router.get("/runs", response_model=List[WorkflowRun])
async def list_runs() -> List[WorkflowRun]:
    runs: List[WorkflowRun] = []
    for file in _workflow_dir().glob("*.json"):
        try:
            data = file.read_text(encoding="utf-8")
            run = WorkflowRun.model_validate_json(data)
            runs.append(run)
        except Exception:
            continue
    # newest first
    runs.sort(key=lambda r: r.updated_at, reverse=True)
    return runs


@router.post("/runs", response_model=WorkflowRun)
async def create_run(req: WorkflowCreateRequest) -> WorkflowRun:
    now = datetime.utcnow()
    # simple ID: timestamp-based
    run_id = now.strftime("%Y%m%d%H%M%S%f")
    # Predefined steps for the real estate workflow
    default_steps = [
        "beacon_tax",
        "secretary_of_state",
        "usgs_flood",
        "google_search",
        "owner_intel",
        "proposal",
    ]
    run = WorkflowRun(
        id=run_id,
        label=req.label,
        address=req.address,
        created_at=now,
        updated_at=now,
        status="in_progress",
        steps=[WorkflowStepData(step_id=s, data={}) for s in default_steps],
    )
    _save_run(run)
    return run


@router.post("/credentials/{site}", response_model=SiteCredential)
async def set_credentials(site: str, req: CredentialUpdateRequest) -> SiteCredential:
    existing = _load_credentials()
    existing[site] = {"username": req.username, "password": req.password}
    _save_credentials(existing)
    return SiteCredential(site=site, username=req.username, password=req.password)


def _get_site_credentials(site: str) -> Dict[str, str] | None:
    return _load_credentials().get(site)


@router.post("/runs/{run_id}/run_step/{step_id}", response_model=WorkflowRun)
async def run_step(run_id: str, step_id: str) -> WorkflowRun:
    """Execute an automated step for a workflow run.

    Currently only supports a stubbed implementation for the 'beacon_tax' step,
    which fills in placeholder data. Later this will call real Playwright-based
    automation to navigate the Beacon / tax assessor site.
    """

    run = _load_run(run_id)

    if step_id == "beacon_tax":
        creds = _get_site_credentials("beacon")
        data = run_beacon_lookup(
            property_label=run.label,
            address=run.address,
            username=(creds or {}).get("username"),
            password=(creds or {}).get("password"),
        )
        # merge into existing step data
        found = False
        for step in run.steps:
            if step.step_id == step_id:
                step.data = {**(step.data or {}), **data}
                found = True
                break
        if not found:
            run.steps.append(WorkflowStepData(step_id=step_id, data=data))
        run.updated_at = datetime.utcnow()
        _save_run(run)
        return run

    if step_id == "usgs_flood":
        data = {
            "notes": "USGS flood data automation stub ran. Integrate webapps.usgs.gov selectors here to pull flood zone and risk details.",
        }
        found = False
        for step in run.steps:
            if step.step_id == step_id:
                step.data = {**(step.data or {}), **data}
                found = True
                break
        if not found:
            run.steps.append(WorkflowStepData(step_id=step_id, data=data))
        run.updated_at = datetime.utcnow()
        _save_run(run)
        return run

    if step_id == "google_search":
        data = {
            "notes": "Google/web search automation stub ran. Future version will gather links, news, zoning issues, and nearby projects.",
        }
        found = False
        for step in run.steps:
            if step.step_id == step_id:
                step.data = {**(step.data or {}), **data}
                found = True
                break
        if not found:
            run.steps.append(WorkflowStepData(step_id=step_id, data=data))
        run.updated_at = datetime.utcnow()
        _save_run(run)
        return run

    if step_id == "owner_intel":
        data = {
            "notes": "Owner intel automation stub ran. Future version will search social/professional profiles and other properties tied to this entity.",
        }
        found = False
        for step in run.steps:
            if step.step_id == step_id:
                step.data = {**(step.data or {}), **data}
                found = True
                break
        if not found:
            run.steps.append(WorkflowStepData(step_id=step_id, data=data))
        run.updated_at = datetime.utcnow()
        _save_run(run)
        return run

    if step_id == "proposal":
        data = {
            "notes": "Proposal automation stub ran. Future version will assemble a draft proposal using data from all previous steps.",
        }
        found = False
        for step in run.steps:
            if step.step_id == step_id:
                step.data = {**(step.data or {}), **data}
                found = True
                break
        if not found:
            run.steps.append(WorkflowStepData(step_id=step_id, data=data))
        run.updated_at = datetime.utcnow()
        _save_run(run)
        return run

    if step_id == "secretary_of_state":
        # Use the investigation label as the default entity name; later we can
        # allow overriding this per-run.
        entity_name = run.label
        data = run_sos_lookup(entity_name=entity_name)
        found = False
        for step in run.steps:
            if step.step_id == step_id:
                step.data = {**(step.data or {}), **data}
                found = True
                break
        if not found:
            run.steps.append(WorkflowStepData(step_id=step_id, data=data))
        run.updated_at = datetime.utcnow()
        _save_run(run)
        return run

    raise HTTPException(status_code=400, detail=f"Unsupported automated step: {step_id}")


@router.get("/runs/{run_id}", response_model=WorkflowRun)
async def get_run(run_id: str) -> WorkflowRun:
    return _load_run(run_id)


@router.put("/runs/{run_id}", response_model=WorkflowRun)
async def update_run(run_id: str, run_update: WorkflowRun) -> WorkflowRun:
    if run_id != run_update.id:
        raise HTTPException(status_code=400, detail="ID in path and body must match")
    run_update.updated_at = datetime.utcnow()
    _save_run(run_update)
    return run_update


@router.put("/runs/{run_id}/steps/{step_id}", response_model=WorkflowRun)
async def update_step(run_id: str, step_id: str, payload: dict) -> WorkflowRun:
    run = _load_run(run_id)
    found = False
    for step in run.steps:
        if step.step_id == step_id:
            step.data = payload.get("data", step.data)
            found = True
            break
    if not found:
        # Optionally add the step if not present
        run.steps.append(WorkflowStepData(step_id=step_id, data=payload.get("data", {})))
    run.updated_at = datetime.utcnow()
    _save_run(run)
    return run
