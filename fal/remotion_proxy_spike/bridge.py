import atexit
import json
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path
from typing import Any
from urllib import error, request


class NodeBridge:
    def __init__(
        self,
        port: int = 8765,
        startup_timeout_seconds: int = 20,
        node_script_path: str | None = None,
    ) -> None:
        self.port = port
        self.startup_timeout_seconds = startup_timeout_seconds
        self.node_script_path = node_script_path or self._default_node_script_path()
        self._process: subprocess.Popen[str] | None = None
        self._lock = threading.Lock()
        atexit.register(self.stop)

    def _default_node_script_path(self) -> str:
        local_path = Path(__file__).resolve().with_name("node_server.mjs")
        deployed_path = Path("/app/node_server.mjs")

        if local_path.exists():
            return str(local_path)

        return str(deployed_path)

    def _node_binary(self) -> str:
        binary = shutil.which("node") or shutil.which("nodejs")
        if binary is None:
            raise RuntimeError("Could not find a Node.js binary in PATH")
        return binary

    def _base_url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def start(self) -> None:
        with self._lock:
            if self._process and self._process.poll() is None:
                return

            env = os.environ.copy()
            env["REMOTION_PROXY_PORT"] = str(self.port)

            self._process = subprocess.Popen(
                [self._node_binary(), self.node_script_path],
                env=env,
            )

        self._wait_for_health()

    def _wait_for_health(self) -> None:
        deadline = time.time() + self.startup_timeout_seconds

        while time.time() < deadline:
            if self._process is not None and self._process.poll() is not None:
                raise RuntimeError(
                    f"Node process exited early with code {self._process.returncode}"
                )

            try:
                self.health()
                return
            except Exception:
                time.sleep(0.25)

        raise TimeoutError("Timed out waiting for the local Node server to boot")

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        body = None
        headers = {}

        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = request.Request(
            url=f"{self._base_url()}{path}",
            data=body,
            headers=headers,
            method=method,
        )

        try:
            with request.urlopen(req, timeout=self.startup_timeout_seconds) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Node server returned HTTP {exc.code} for {path}: {details}"
            ) from exc

    def health(self) -> dict[str, Any]:
        return self._request_json("GET", "/healthz")

    def render(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.start()
        return self._request_json("POST", "/render", payload)

    def stop(self) -> None:
        with self._lock:
            process = self._process
            self._process = None

        if process is None or process.poll() is not None:
            return

        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
