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
        print(f"[bridge.py] NodeBridge.__init__(port={port}, timeout={startup_timeout_seconds})")
        self.port = port
        self.startup_timeout_seconds = startup_timeout_seconds
        self.node_script_path = node_script_path or self._default_node_script_path()
        self._process: subprocess.Popen[str] | None = None
        self._lock = threading.Lock()
        atexit.register(self.stop)
        print(f"[bridge.py] node_script_path={self.node_script_path}")

    def _default_node_script_path(self) -> str:
        local_path = Path(__file__).resolve().with_name("node_server.mjs")
        deployed_path = Path("/app/node_server.mjs")

        if local_path.exists():
            print(f"[bridge.py] using local node script: {local_path}")
            return str(local_path)

        print(f"[bridge.py] using deployed node script: {deployed_path}")
        return str(deployed_path)

    def _node_binary(self) -> str:
        binary = shutil.which("node") or shutil.which("nodejs")
        if binary is None:
            print("[bridge.py] ERROR: no Node.js binary found in PATH")
            raise RuntimeError("Could not find a Node.js binary in PATH")
        print(f"[bridge.py] node binary: {binary}")
        return binary

    def _base_url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def start(self) -> None:
        print("[bridge.py] start() called")
        with self._lock:
            if self._process and self._process.poll() is None:
                print(f"[bridge.py] start() — process already running (pid={self._process.pid})")
                return

            env = os.environ.copy()
            env["REMOTION_PROXY_PORT"] = str(self.port)

            node_bin = self._node_binary()
            print(f"[bridge.py] spawning: {node_bin} {self.node_script_path}")
            self._process = subprocess.Popen(
                [node_bin, self.node_script_path],
                env=env,
            )
            print(f"[bridge.py] node process spawned (pid={self._process.pid})")

        self._wait_for_health()
        print("[bridge.py] start() complete — node is healthy")

    def _wait_for_health(self) -> None:
        deadline = time.time() + self.startup_timeout_seconds
        print(f"[bridge.py] _wait_for_health() waiting up to {self.startup_timeout_seconds}s...")

        attempt = 0
        while time.time() < deadline:
            attempt += 1
            if self._process is not None and self._process.poll() is not None:
                print(f"[bridge.py] ERROR: node process exited early with code {self._process.returncode}")
                raise RuntimeError(
                    f"Node process exited early with code {self._process.returncode}"
                )

            try:
                result = self.health()
                print(f"[bridge.py] _wait_for_health() healthy after {attempt} attempts: {result}")
                return
            except Exception as e:
                if attempt <= 3 or attempt % 10 == 0:
                    print(f"[bridge.py] _wait_for_health() attempt {attempt} failed: {e}")
                time.sleep(0.25)

        print(f"[bridge.py] ERROR: timed out after {self.startup_timeout_seconds}s waiting for node")
        raise TimeoutError("Timed out waiting for the local Node server to boot")

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self._base_url()}{path}"
        body = None
        headers = {}

        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        print(f"[bridge.py] _request_json({method} {url}) payload_size={len(body) if body else 0}")

        req = request.Request(
            url=url,
            data=body,
            headers=headers,
            method=method,
        )

        try:
            with request.urlopen(req, timeout=self.startup_timeout_seconds) as resp:
                raw = resp.read().decode("utf-8")
                print(f"[bridge.py] _request_json({method} {path}) <- HTTP {resp.status}, body_len={len(raw)}")
                return json.loads(raw)
        except error.HTTPError as exc:
            details = exc.read().decode("utf-8", errors="replace")
            print(f"[bridge.py] _request_json({method} {path}) FAILED: HTTP {exc.code} — {details}")
            raise RuntimeError(
                f"Node server returned HTTP {exc.code} for {path}: {details}"
            ) from exc

    def health(self) -> dict[str, Any]:
        return self._request_json("GET", "/healthz")

    def render(self, payload: dict[str, Any]) -> dict[str, Any]:
        print(f"[bridge.py] render() called with payload keys={list(payload.keys())}")
        self.start()
        result = self._request_json("POST", "/render", payload)
        print(f"[bridge.py] render() complete, response keys={list(result.keys())}")
        return result

    def stop(self) -> None:
        print("[bridge.py] stop() called")
        with self._lock:
            process = self._process
            self._process = None

        if process is None or process.poll() is not None:
            print("[bridge.py] stop() — no running process to stop")
            return

        print(f"[bridge.py] stop() terminating pid={process.pid}")
        process.terminate()
        try:
            process.wait(timeout=5)
            print(f"[bridge.py] stop() process terminated cleanly")
        except subprocess.TimeoutExpired:
            print(f"[bridge.py] stop() process didn't terminate, killing...")
            process.kill()
