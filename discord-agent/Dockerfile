FROM python:3.12-slim
COPY --from=docker:cli /usr/local/bin/docker /usr/local/bin/docker
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY discord_bot.py .
CMD ["python", "discord_bot.py"]
