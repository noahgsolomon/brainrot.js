import json
import random
import sys
import time
from pathlib import Path
from urllib import error, request

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
    callback_url: str | None = Field(
        default=None,
        description="Optional Brainrot webhook URL for progress updates.",
    )
    callback_headers: dict[str, str] = Field(
        default_factory=dict,
        description="Optional headers forwarded to the Brainrot webhook.",
    )
    step_delay_seconds: int = Field(
        default=5,
        ge=0,
        le=30,
        description="Delay between simulated progress updates.",
    )
    final_url: str = Field(
        default="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        description="Dummy media URL returned on completion.",
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


class EgressResponse(BaseModel):
    ok: bool
    url: str
    status_code: int
    checked_at: str


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

    def _post_callback(
        self,
        callback_url: str,
        callback_headers: dict[str, str],
        payload: dict,
    ) -> None:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "remotion-proxy-spike/1.0",
            **callback_headers,
        }
        req = request.Request(
            url=callback_url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=20) as response:
                if response.status >= 400:
                    raise RuntimeError(
                        f"Callback returned unexpected HTTP {response.status}"
                    )
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Callback failed with HTTP {exc.code}: {details}"
            ) from exc

    def _emit_test_progress(self, input: SpikeRequest) -> None:
        if not input.callback_url:
            return

        steps = [
            ("Accepted fal smoke test job", random.randint(5, 12)),
            ("Booting local renderer bridge", random.randint(18, 32)),
            ("Pretending to render frames", random.randint(45, 68)),
            ("Uploading dummy output", random.randint(75, 92)),
        ]

        for status, progress in steps:
            self._post_callback(
                input.callback_url,
                input.callback_headers,
                {
                    "status": status,
                    "progress": progress,
                },
            )
            time.sleep(input.step_delay_seconds)

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

    @fal.endpoint("/egress")
    def egress(self) -> EgressResponse:
        url = "https://www.google.com/generate_204"
        req = request.Request(
            url=url,
            headers={"User-Agent": "remotion-proxy-spike/1.0"},
            method="GET",
        )

        with request.urlopen(req, timeout=10) as response:
            return EgressResponse(
                ok=True,
                url=url,
                status_code=response.status,
                checked_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )

    @fal.endpoint("/")
    def render(self, input: SpikeRequest) -> SpikeResponse:
        self._emit_test_progress(input)

        node_response = self.bridge.render(
            input.model_dump(
                exclude={
                    "callback_url",
                    "callback_headers",
                    "step_delay_seconds",
                    "final_url",
                }
            )
        )

        if input.callback_url:
            self._post_callback(
                input.callback_url,
                input.callback_headers,
                {
                    "status": "COMPLETED",
                    "progress": 100,
                    "url": input.final_url,
                },
            )

        return SpikeResponse(
            ok=True,
            job_id=input.job_id,
            composition_id=input.composition_id,
            fal_runner_started_at=self.started_at,
            node=node_response,
        )
