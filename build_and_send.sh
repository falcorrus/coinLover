#!/bin/bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
cd /Users/eugene/MyProjects/CoinLover

# Удаляем старый APK, чтобы не отправить его по ошибке
rm -f apk/coinlover-debug.apk
rm -f android/app/build/outputs/apk/debug/app-debug.apk

echo "Building web..."
pnpm run build || { echo "Web build failed"; exit 1; }

echo "Copying to android..."
npx cap copy android || { echo "Capacitor copy failed"; exit 1; }

cd android
echo "Assembling APK..."
./gradlew assembleDebug || { echo "Gradle build failed"; exit 1; }

echo "Copying APK..."
cd ..
mkdir -p apk
cp android/app/build/outputs/apk/debug/app-debug.apk apk/coinlover-debug.apk

echo "Sending to Telegram..."
DATE_STR=$(date +'%m-%d')
curl -F chat_id="159194550" -F document=@"apk/coinlover-debug.apk" -F caption="CoinLover APK Fix: Build ${DATE_STR}" https://api.telegram.org/bot6027699883:AAFKOu9gPsc7rd-SDQeFCHTt0edI73dXWSQ/sendDocument
