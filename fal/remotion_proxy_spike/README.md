# Remotion Proxy Spike

This is a minimal proof of concept for the runtime shape we want on fal:

- a Python `fal.App` owns the public endpoint
- the Python app starts a local Node process in `setup()`
- the Python app calls the Node process over `127.0.0.1`

Right now the Node side only returns a stub JSON response. That is intentional. The goal of this spike is to prove the container, process lifecycle, and request path before wiring in the real Remotion renderer.

## Files

- `app.py`: the fal app
- `bridge.py`: shared Python helper that boots and calls the local Node server
- `node_server.mjs`: tiny localhost Node API
- `local_smoke_test.py`: local non-fal smoke test for the same bridge flow
- `Dockerfile`: minimal custom container for fal

## Local smoke test

Run this from the repo root:

```bash
python3 fal/remotion_proxy_spike/local_smoke_test.py
```

You should get back JSON from the Node process.

## Install the fal CLI locally

Homebrew Python blocks global `pip` installs, so use the repo-local virtualenv:

```bash
python3 -m venv fal/remotion_proxy_spike/.venv
fal/remotion_proxy_spike/.venv/bin/python -m pip install fal
fal/remotion_proxy_spike/.venv/bin/fal --version
```

## Deploy on fal

From this folder:

```bash
cd fal/remotion_proxy_spike
./.venv/bin/fal deploy app.py::RemotionProxySpike
```

## Call it

Synchronous:

```bash
./.venv/bin/fal run app.py::RemotionProxySpike --input '{"job_id":"spike-1","composition_id":"Video","props":{"topic":"hello"}}'
```

Queued from an app:

```python
import fal_client

handler = fal_client.submit(
    "your-namespace/remotion-proxy-spike",
    arguments={
        "job_id": "spike-1",
        "composition_id": "Video",
        "props": {"topic": "hello"},
    },
)

print(handler.request_id)
print(handler.get())
```

## What comes next

Once this is confirmed on fal, the next change is to replace the stub Node server with a real Remotion SSR service:

1. Bundle the Remotion project once during runner startup.
2. Accept render payloads from the Python fal endpoint.
3. Run `selectComposition()` and `renderMedia()` in Node.
4. Upload the result to S3.
5. Return the S3 URL and metrics back through the fal response.

## Extra endpoint

- `/egress`: verifies outbound internet access from the fal runner by requesting `https://www.google.com/generate_204`
