#!/bin/bash
# Schedule email campaign for 8:00 AM CEST (6:00 UTC)
# This script sends the KI-Readiness-Check announcement to CRM contacts

set -e
source ~/.synclaro/.env

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Synclaro KI-Readiness-Check Email Campaign ==="
echo "Scheduled execution: $(date)"
echo ""

# Send to contacts from CRM (personalized)
node "$SCRIPT_DIR/send-campaign.js"
