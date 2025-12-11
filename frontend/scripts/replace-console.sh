#!/bin/bash
# Script to replace console.error and console.warn with logger

find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e "s/import { logger } from '\.\.\/lib\/logger';/import { logger } from '..\/lib\/logger';/g" \
  -e "s/console\.error(\([^)]*\));/logger.error(\1);/g" \
  -e "s/console\.warn(\([^)]*\));/logger.warn(\1);/g" \
  {} \;


