import json
import argparse
from uuid import uuid4

from bridge import NodeBridge


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pipeline",
        choices=[
            "stub",
            "brainrot_transcript_audio",
            "brainrot_prep_upload",
            "brainrot_remotion_render",
            "brainrot_lambda_render",
        ],
        default="stub",
    )
    parser.add_argument("--mock-services", action="store_true")
    parser.add_argument("--pitch-mode", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    bridge = NodeBridge()
    try:
        props: dict[str, object] = {"topic": "fal spike"}

        if args.pipeline in {
            "brainrot_transcript_audio",
            "brainrot_prep_upload",
            "brainrot_remotion_render",
            "brainrot_lambda_render",
        }:
            props = {
                "pipeline": args.pipeline,
                "topic": "fal spike migration",
                "agentA": "JOE_ROGAN",
                "agentB": "JOE_BIDEN",
                "music": "WII_SHOP_CHANNEL_TRAP",
            }

            if args.mock_services:
                props["use_mock_services"] = True

            if args.pitch_mode:
                props["pitchMode"] = True

        response = bridge.render(
            {
                "job_id": str(uuid4()),
                "composition_id": "Video",
                "props": props,
            }
        )
        print(json.dumps(response, indent=2, sort_keys=True))
    finally:
        bridge.stop()


if __name__ == "__main__":
    main()
