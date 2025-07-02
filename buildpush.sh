#!/bin/bash
export VERSION=1
#docker build -t skrendelauth/file-saver:$VERSION -t skrendelauth/file-saver:latest .
docker buildx build --platform linux/amd64 -t skrendelauth/cv_bot:$VERSION -t skrendelauth/cv_bot:latest .
docker push skrendelauth/cv_bot:$VERSION