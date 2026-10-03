#!/bin/sh
set -eu

if [ ! -f backend/instance/game.db ]; then
    python -m flask --app backend.app init-db
fi
exec gunicorn --bind 0.0.0.0:3000 --workers 1 --threads 100 \
    --access-logfile - --error-logfile - 'backend.app:create_app()'
