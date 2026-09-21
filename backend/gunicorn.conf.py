"""Gunicorn settings for the API container."""

import os

bind = "0.0.0.0:8000"
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
accesslog = "-"
# Heartbeat files on tmpfs: avoids disk stalls and works with a read-only root filesystem.
worker_tmp_dir = "/dev/shm"
# On SIGTERM, let in-flight requests finish before Kubernetes kills the pod.
graceful_timeout = 30
