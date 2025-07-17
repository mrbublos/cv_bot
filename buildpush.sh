#!/bin/bash
export VERSION=latest
docker buildx build --platform linux/amd64 -t skrendelauth/cv-bot:$VERSION -t skrendelauth/cv-bot:latest .
docker push skrendelauth/cv-bot:$VERSION