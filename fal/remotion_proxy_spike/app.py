import sys
import time
from pathlib import Path

import fal
from fal.container import ContainerImage
from pydantic import BaseModel, Field


APP_DIR = Path(__file__).resolve().parent
for candidate in (APP_DIR, Path("/app")):
    candidate_str = str(candidate)
    if candidate_str not in sys.path:
        sys.path.insert(0, candidate_str)

from bridge import NodeBridge


class SpikeRequest(BaseModel):
    job_id: str = Field(description="Opaque request id for tracing.")
    composition_id: str = Field(
        default="Video",
        description="Future Remotion composition id.",
    )
    props: dict = Field(
        default_factory=dict,
        description="Future Remotion input props.",
    )


class SpikeResponse(BaseModel):
    ok: bool
    job_id: str
    composition_id: str
    fal_runner_started_at: float
    node: dict


class HealthResponse(BaseModel):
    ok: bool
    node: dict


class RemotionProxySpike(fal.App):
    app_name = "remotion-proxy-spike"
    local_python_modules = ["bridge"]
    app_files_ignore = [
        r"\.pyc$",
        r"__pycache__/",
        r"\.git/",
        r"\.DS_Store$",
        r"\.venv/",
    ]
    image = ContainerImage.from_dockerfile_str(
        (APP_DIR / "Dockerfile").read_text(),
        context_dir=APP_DIR,
    )
    machine_type = "S"
    keep_alive = 300
    startup_timeout = 300
    request_timeout = 300
    max_concurrency = 2
    max_multiplexing = 1

    def setup(self) -> None:
        self.started_at = time.time()
        self.bridge = NodeBridge()
        self.bridge.start()

    @fal.endpoint(
        "/health",
        health_check=fal.HealthCheck(
            start_period_seconds=15,
            timeout_seconds=5,
            failure_threshold=3,
            call_regularly=True,
        ),
    )
    def health(self) -> HealthResponse:
        return HealthResponse(ok=True, node=self.bridge.health())

    @fal.endpoint("/")
    def render(self, input: SpikeRequest) -> SpikeResponse:
        node_response = self.bridge.render(input.model_dump())
        return SpikeResponse(
            ok=True,
            job_id=input.job_id,
            composition_id=input.composition_id,
            fal_runner_started_at=self.started_at,
            node=node_response,
        )
