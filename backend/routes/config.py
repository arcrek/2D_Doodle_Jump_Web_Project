from flask import Blueprint, jsonify, request

from ..rules import RULES, ALL_RULES

config_api = Blueprint("config", __name__)


@config_api.get("/api/health")
def health():
    return jsonify(status="ok", service="doodle-jump-flask", version="0.0.1")


@config_api.get("/api/config")
def config():
    version = request.args.get("rules_version")
    if version and version in ALL_RULES:
        return jsonify(ALL_RULES[version])
    return jsonify(RULES)
