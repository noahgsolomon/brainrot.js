import json
from uuid import uuid4

from bridge import NodeBridge


def main() -> None:
    bridge = NodeBridge()
    try:
        response = bridge.render(
            {
                "job_id": str(uuid4()),
                "composition_id": "Video",
                "props": {"topic": "fal spike"},
            }
        )
        print(json.dumps(response, indent=2, sort_keys=True))
    finally:
        bridge.stop()


if __name__ == "__main__":
    main()
