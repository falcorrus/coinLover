#!/bin/bash
set -e

export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/Users/eugene/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$PATH

echo "==> 1. Building web production bundle..."
pnpm run build

echo "==> 2. Syncing web build with Capacitor Android..."
npx cap sync android

echo "==> 3. Assembling signed Release AAB..."
cd android
./gradlew bundleRelease
cd ..

mkdir -p playmarket_release
cp android/app/build/outputs/bundle/release/app-release.aab playmarket_release/coinlover-release.aab

echo "=========================================================="
echo "✅ Success! Release bundle ready for Google Play Console:"
echo "   playmarket_release/coinlover-release.aab"
echo "=========================================================="
