#!/bin/bash
export VERSION=9
docker buildx build --platform linux/amd64 -t skrendelauth/cv_bot:$VERSION -t skrendelauth/cv_bot:latest .
docker push skrendelauth/cv_bot:$VERSION