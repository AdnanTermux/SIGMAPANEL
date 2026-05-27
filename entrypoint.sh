#!/bin/bash

# Start SMPP Server in background
python smpp_server.py &

# Start Worker in background
python worker.py &

# Start FastAPI application
uvicorn main:app --host 0.0.0.0 --port 8000
