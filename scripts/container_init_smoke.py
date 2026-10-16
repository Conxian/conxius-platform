#!/usr/bin/env python3
"""Exercise the dashboard image with an isolated registry, never production keys."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

CURRENT_PHASE = "setup"


def docker(*args):
    result = subprocess.run(["docker", *args], capture_output=True, text=True, timeout=60)
    if result.returncode:
        raise RuntimeError("Docker operation failed: " + args[0])
    return result.stdout.strip()


def wait_for_health(base, status, expected):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            try:
                result = urllib.request.urlopen(base + "/api/health", timeout=4)
            except urllib.error.HTTPError as error:
                result = error
            with result:
                body = result.read(65537)
                if (result.code == status and len(body) <= 65536
                        and json.loads(body) == {"status": expected}
                        and result.headers.get("Cache-Control") == "no-store"):
                    return
        except (OSError, ValueError):
            pass
        time.sleep(1)
    raise RuntimeError("Dashboard readiness assertion failed")


def main():
    global CURRENT_PHASE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    name = "dashboard-init-" + secrets.token_hex(6)
    with tempfile.TemporaryDirectory(prefix="dashboard-init-") as directory:
        registry = Path(directory) / "registry.json"

        def start(configured):
            command = ["run", "--detach", "--name", name,
                       "--user", f"{os.getuid()}:{os.getgid()}",
                       "--publish", "127.0.0.1::10000",
                       "--env", "PORT=10000", "--env", "HOSTNAME=0.0.0.0"]
            if configured:
                command.extend(["--env", "M2M_SERVICE_KEY_REGISTRY_PATH=/state/registry.json",
                                "--mount", f"type=bind,src={directory},dst=/state"])
            docker(*command, args.image)
            port = docker("port", name, "10000/tcp").rsplit(":", 1)[1]
            return "http://127.0.0.1:" + port

        try:
            CURRENT_PHASE = "missing-registry-denial"
            base = start(False)
            wait_for_health(base, 503, "unhealthy")
            docker("rm", "--force", name)
            CURRENT_PHASE = "registry-bootstrap"
            base = start(True)
            wait_for_health(base, 200, "healthy")
            if not registry.is_file():
                raise RuntimeError("Registry was not persisted to the configured mount")
            digest = hashlib.sha256(registry.read_bytes()).digest()
            CURRENT_PHASE = "restart-preservation"
            docker("restart", name)
            port = docker("port", name, "10000/tcp").rsplit(":", 1)[1]
            base = "http://127.0.0.1:" + port
            wait_for_health(base, 200, "healthy")
            if hashlib.sha256(registry.read_bytes()).digest() != digest:
                raise RuntimeError("Restart changed the registry")
            CURRENT_PHASE = "malformed-registry-denial"
            registry.write_text("{invalid\n", encoding="utf-8")
            registry.chmod(0o600)
            docker("restart", name)
            port = docker("port", name, "10000/tcp").rsplit(":", 1)[1]
            base = "http://127.0.0.1:" + port
            wait_for_health(base, 503, "unhealthy")
            if registry.read_text(encoding="utf-8") != "{invalid\n":
                raise RuntimeError("Malformed registry was silently replaced")
            print(json.dumps({"result": "pass", "scope": "isolated-container-initialization",
                              "checks": ["hosting-port", "missing-registry-denial",
                                         "registry-bootstrap", "restart-preservation",
                                         "malformed-registry-denial"]}))
        finally:
            subprocess.run(["docker", "rm", "--force", name], capture_output=True, timeout=30)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.TimeoutExpired):
        print(json.dumps({"result": "fail", "phase": CURRENT_PHASE,
                          "scope": "isolated-container-initialization"}))
        raise SystemExit(1)

