FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt gunicorn==23.0.0 \
    && useradd --uid 10001 --create-home app \
    && mkdir -p /app/backend/instance \
    && chown app:app /app/backend/instance
COPY backend/ backend/
USER app
EXPOSE 3000
CMD ["sh", "backend/docker-entrypoint.sh"]
