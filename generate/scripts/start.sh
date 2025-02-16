#!/bin/bash

docker rm -f brainrot-container 2>/dev/null || true

docker run -d --name brainrot-container -e MODE=${MODE:-dev} brainrot