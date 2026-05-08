#!/bin/bash
# Автозамена пути macOS -> VPS
find /root/.gemini/configs/ /opt/ibkr/ -type f \( -name "*.py" -o -name "*.yaml" -o -name "*.json" \) | \
xargs sed -i 's|/opt/homebrew/Cellar/python@3\.14/[^/]*/Frameworks/Python.framework/Versions/3\.14|/opt/ibkr/ibkr-venv|g'
