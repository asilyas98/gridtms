FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-docker.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements-docker.txt

COPY app ./app
COPY sample_data ./sample_data

EXPOSE 8080
CMD ["python", "-m", "uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8080"]
