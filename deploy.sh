docker buildx build --platform linux/arm64 --load -t verekia/minidraco .
docker save verekia/minidraco | gzip > /tmp/minidraco.tar.gz
scp /tmp/minidraco.tar.gz midgar:/tmp/
ssh midgar docker load --input /tmp/minidraco.tar.gz
ssh midgar docker compose up -d minidraco
