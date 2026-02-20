#!/bin/bash
cd /opt/aipoweredsites
git pull origin main
docker compose down app
docker compose build app
docker compose up -d
echo "Done! Check: curl localhost"
