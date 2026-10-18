FROM python:3.12-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

COPY index.html server.py ./

EXPOSE 8088

# Non-root user
USER 1000:1000

CMD ["python3", "-u", "server.py"]
