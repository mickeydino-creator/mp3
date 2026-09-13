#!/bin/sh
set -e

# Start the PO token provider in the background; it only listens on
# localhost, so it's not reachable outside this container.
node /opt/potprovider/server/build/main.js &
POT_PID=$!

# Forward termination signals to both processes so Render's restarts/
# deploys stop the container cleanly instead of leaving it hanging.
trap 'kill "$POT_PID" 2>/dev/null; exit 0' TERM INT

node dist/index.js &
API_PID=$!

wait "$API_PID"
