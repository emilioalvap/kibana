#!/usr/bin/env bash

set -euo pipefail

# Build team assignments dat file
node scripts/generate_team_assignments.js --verbose --src .github/CODEOWNERS --dest 'src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt'