#!/bin/bash
# Conxian Repository Maintenance Utility
# Prunes and cleans merged branches for the root and submodules.

echo "--- Cleaning Main Repository ---"
git fetch -p --all --recurse-submodules
git branch --merged | grep -v "\*" | grep -vE "^(main|master|develop)$" | xargs -n 1 git branch -d 2>/dev/null || echo "No merged branches to delete in root."

echo -e "\n--- Cleaning Submodule: lib-conxian-core ---"
cd services/lib-conxian-core
git fetch -p --all
git branch --merged | grep -v "\*" | grep -vE "^(main|master|develop)$" | xargs -n 1 git branch -d 2>/dev/null || echo "No merged branches to delete in core."
cd ../..

echo -e "\n--- Cleaning Submodule: conxian-ui ---"
cd services/conxian-ui
git fetch -p --all
git branch --merged | grep -v "\*" | grep -vE "^(main|master|develop)$" | xargs -n 1 git branch -d 2>/dev/null || echo "No merged branches to delete in UI."
cd ../..

echo -e "\nDone."
