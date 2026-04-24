#!/bin/bash
# Start MariaDB and Adminer containers for NOAgenda development

docker compose -f "docker/docker-compose.yml" up -d
