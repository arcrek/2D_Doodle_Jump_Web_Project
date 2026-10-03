#!/usr/bin/env python3
"""Smoke-check the running Docker stack through localhost."""

import argparse
import base64
import hashlib
import json
import os
import socket
import sys
import uuid
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def fetch(base, path, data=None):
    headers = {}
    if data is not None:
        data = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    with urlopen(Request(base + path, data=data, headers=headers), timeout=10) as response:
        return response.status, response.headers.get_content_type(), response.read()


def fetch_json(base, path, data=None):
    status, content_type, body = fetch(base, path, data)
    assert content_type == "application/json", f"{path} did not return JSON"
    return status, json.loads(body)


def check_websocket(base):
    target = urlsplit(base)
    key = base64.b64encode(os.urandom(16)).decode()
    request = (
        "GET /socket.io/?EIO=4&transport=websocket HTTP/1.1\r\n"
        f"Host: {target.netloc}\r\n"
        "Upgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
    ).encode()
    expected = base64.b64encode(hashlib.sha1(
        (key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()
    ).digest()).decode().lower().encode()
    with socket.create_connection((target.hostname, target.port or 80), timeout=10) as connection:
        connection.sendall(request)
        response = b""
        while b"\r\n\r\n" not in response:
            chunk = connection.recv(4096)
            assert chunk, "WebSocket closed during upgrade"
            response += chunk
    headers = response.split(b"\r\n\r\n", 1)[0].lower()
    assert headers.startswith(b"http/1.1 101 "), "WebSocket upgrade did not return HTTP 101"
    assert b"sec-websocket-accept: " + expected in headers, "Invalid WebSocket accept header"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", nargs="?", default="http://localhost:8080")
    parser.add_argument("--run-id", type=uuid.UUID, help="verify a run saved before restart")
    args = parser.parse_args()
    base = args.url.rstrip("/")
    target = urlsplit(base)
    assert target.scheme == "http" and target.hostname in {"localhost", "127.0.0.1", "::1"}, (
        "URL must use HTTP on localhost"
    )

    status, kind, index = fetch(base, "/")
    assert status == 200 and kind == "text/html" and b"<html" in index.lower()
    status, kind, image = fetch(base, "/images/game-background.png")
    assert status == 200 and kind == "image/png" and image.startswith(b"\x89PNG\r\n\x1a\n")
    status, kind, fallback = fetch(base, "/__docker_smoke__/route")
    assert status == 200 and kind == "text/html" and fallback == index

    status, health = fetch_json(base, "/api/health")
    assert status == 200 and health["status"] == "ok"
    status, config = fetch_json(base, "/api/config")
    assert status == 200 and config["rules_version"] == "v1"
    status, kind, packet = fetch(base, "/socket.io/?EIO=4&transport=polling")
    opened = json.loads(packet[1:])
    assert status == 200 and kind == "text/plain" and packet.startswith(b"0{") and opened["sid"]
    assert "websocket" in opened["upgrades"]
    check_websocket(base)

    if args.run_id:
        status, saved = fetch_json(base, "/api/runs/" + str(args.run_id))
        assert status == 200 and saved["run_id"] == str(args.run_id)

    run = {
        "run_id": str(uuid.uuid4()), "player_id": str(uuid.uuid4()),
        "nickname": "Docker smoke", "skin_id": "doodle", "rules_version": "v1",
        "height": 150, "elapsed_ms": 3000, "outcome": "dnf", "placement": 3,
    }
    status, saved = fetch_json(base, "/api/runs", run)
    assert status == 201 and saved["run_id"] == run["run_id"]
    status, saved = fetch_json(base, "/api/runs/" + run["run_id"])
    assert status == 200 and all(saved[key] == value for key, value in run.items())
    print(f"PASS {base}\nrun_id={run['run_id']}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
