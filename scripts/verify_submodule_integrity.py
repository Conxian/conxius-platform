#!/usr/bin/env python3

# Remediated submodule integrity check (Phase 7 monorepo pivot)
# Since submodules are now managed as external repositories, this script
# verifies that no accidental gitlinks remain in the monorepo.

import subprocess
import sys

def main():
    try:
        out = subprocess.check_output(["git", "ls-files", "-s"], text=True)
        gitlinks = [line for line in out.splitlines() if line.startswith("160000")]

        if gitlinks:
            print("Submodule integrity failure: Found unexpected gitlinks in monorepo:")
            for link in gitlinks:
                print(f"- {link}")
            return 1

        print("Submodule integrity verification passed (No gitlinks found).")
        return 0
    except Exception as e:
        print(f"Error checking gitlinks: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
