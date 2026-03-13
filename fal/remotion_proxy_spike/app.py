import json
import random
import sys
import time
from pathlib import Path
from urllib import error, request

import fal
from fal.container import ContainerImage
from fal.toolkit import Video
from pydantic import BaseModel, Field


APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent.parent
for candidate in (APP_DIR, Path("/app")):
    candidate_str = str(candidate)
    if candidate_str not in sys.path:
        sys.path.insert(0, candidate_str)

from bridge import NodeBridge

print(f"[app.py] Module loaded, APP_DIR={APP_DIR}")


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
    video_url: str | None = None


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
        r"node_modules/",
        r"\.next/",
        r"\.turbo/",
    ]
    image = ContainerImage.from_dockerfile_str(
        (APP_DIR / "Dockerfile").read_text(),
        context_dir=REPO_ROOT,
    )
    machine_type = "GPU-L40"
    keep_alive = 300
    startup_timeout = 300
    request_timeout = 1800
    max_concurrency = 2
    max_multiplexing = 1

    def setup(self) -> None:
        print("[app.py] setup() called — initializing NodeBridge...")
        self.started_at = time.time()
        self.bridge = NodeBridge(
            startup_timeout_seconds=int(self.startup_timeout),
            request_timeout_seconds=int(self.request_timeout),
        )
        self.bridge.start()
        print(f"[app.py] setup() complete — bridge started, started_at={self.started_at}")

    def _post_callback(
        self,
        callback_url: str,
        callback_headers: dict[str, str],
        payload: dict,
    ) -> None:
        print(f"[app.py] _post_callback() -> {callback_url} payload={json.dumps(payload)}")
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
                print(f"[app.py] _post_callback() <- HTTP {response.status}")
                if response.status >= 400:
                    raise RuntimeError(
                        f"Callback returned unexpected HTTP {response.status}"
                    )
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            print(f"[app.py] _post_callback() FAILED: HTTP {exc.code} — {details}")
            raise RuntimeError(
                f"Callback failed with HTTP {exc.code}: {details}"
            ) from exc

    def _emit_test_progress(self, input: SpikeRequest) -> None:
        if not input.callback_url:
            print(f"[app.py] _emit_test_progress() skipped — no callback_url")
            return

        steps = [
            ("Accepted fal smoke test job", random.randint(5, 12)),
            ("Booting local renderer bridge", random.randint(18, 32)),
            ("Pretending to render frames", random.randint(45, 68)),
            ("Uploading dummy output", random.randint(75, 92)),
        ]

        print(f"[app.py] _emit_test_progress() sending {len(steps)} progress updates to {input.callback_url}")
        for i, (status, progress) in enumerate(steps):
            print(f"[app.py] progress step {i+1}/{len(steps)}: status={status!r} progress={progress}")
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
        node_health = self.bridge.health()
        print(f"[app.py] /health -> node={node_health}")
        return HealthResponse(ok=True, node=node_health)

    @fal.endpoint("/egress")
    def egress(self) -> EgressResponse:
        url = "https://www.google.com/generate_204"
        print(f"[app.py] /egress checking {url}")
        req = request.Request(
            url=url,
            headers={"User-Agent": "remotion-proxy-spike/1.0"},
            method="GET",
        )

        with request.urlopen(req, timeout=10) as response:
            checked_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            print(f"[app.py] /egress <- HTTP {response.status} at {checked_at}")
            return EgressResponse(
                ok=True,
                url=url,
                status_code=response.status,
                checked_at=checked_at,
            )

    @fal.endpoint("/")
    def render(self, input: SpikeRequest) -> SpikeResponse:
        print(f"[app.py] /render called — job_id={input.job_id} composition_id={input.composition_id}")
        print(f"[app.py] /render props keys={list(input.props.keys())} callback_url={input.callback_url}")

        try:
            print(f"[app.py] /render calling bridge.render()...")
            render_payload = input.model_dump()
            print(f"[app.py] /render bridge payload={json.dumps(render_payload)}")
            node_response = self.bridge.render(render_payload)
            print(f"[app.py] /render bridge response={json.dumps(node_response)}")

            video_url: str | None = None
            output_video_url = node_response.get("outputVideoUrl")
            output_video_path = node_response.get("outputVideoPath")

            if isinstance(output_video_url, str) and output_video_url:
                video_url = output_video_url

            if video_url is None and isinstance(output_video_path, str) and output_video_path:
                print(f"[app.py] /render uploading rendered video from {output_video_path}")
                hosted_video = Video.from_path(output_video_path)
                candidate_url = getattr(hosted_video, "url", None)
                if not isinstance(candidate_url, str) or not candidate_url:
                    raise RuntimeError("fal Video.from_path() did not return a URL")

                video_url = candidate_url
                node_response["hostedVideoUrl"] = video_url

            if video_url is not None and input.callback_url:
                print(f"[app.py] /render sending COMPLETED callback with url={video_url}")
                self._post_callback(
                    input.callback_url,
                    input.callback_headers,
                    {
                        "status": "COMPLETED",
                        "progress": 100,
                        "url": video_url,
                    },
                )

            print(f"[app.py] /render done — job_id={input.job_id}")
            return SpikeResponse(
                ok=True,
                job_id=input.job_id,
                composition_id=input.composition_id,
                fal_runner_started_at=self.started_at,
                node=node_response,
                video_url=video_url,
            )
        except Exception as exc:
            print(f"[app.py] /render failed: {exc}")

            if input.callback_url:
                try:
                    self._post_callback(
                        input.callback_url,
                        input.callback_headers,
                        {
                            "status": "ERROR",
                            "progress": 100,
                            "error": str(exc),
                        },
                    )
                except Exception as callback_error:
                    print(f"[app.py] /render failed to post ERROR callback: {callback_error}")

            raise
