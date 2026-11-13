#!/usr/bin/env bash
# Links the three SDKs of the sibling RNPackage monorepo into node_modules for local development.
# Release installs must not be overwritten by these symlinks. Opt in with CUA_LINK_LOCAL_SDKS=1.
set -euo pipefail

if [ "${CUA_LINK_LOCAL_SDKS:-0}" != "1" ]; then
  echo "link-sdks: skipped (set CUA_LINK_LOCAL_SDKS=1 for sibling-monorepo development)"
  exit 0
fi

app="$(cd "$(dirname "$0")/.." && pwd)"
sdk="${CUA_SDK_ROOT:-$app/../RNPackage}/packages"

for pkg in react-native-gps-tracking react-native-apple-health-sync react-native-live-activity-tracking; do
  if [ ! -d "$sdk/$pkg" ]; then
    echo "link-sdks: $sdk/$pkg not found (set CUA_SDK_ROOT to the RNPackage folder)" >&2
    exit 1
  fi
  rm -rf "$app/node_modules/$pkg"
  ln -s "$sdk/$pkg" "$app/node_modules/$pkg"
  echo "linked $pkg"
done
