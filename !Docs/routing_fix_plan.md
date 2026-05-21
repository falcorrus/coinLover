# Усиление детекции платформы и исправление входа на coinlover.ru

Решить проблему, при которой обычные веб-пользователи на `https://coinlover.ru/` ошибочно перенаправляются на мобильный экран входа (`NativeAuthScreen` с Telegram/Email полями) вместо лендинга. Проблема вызвана ложным определением `window.Capacitor` в вебе из-за импорта Capacitor библиотек, которые создают глобальный объект, или из-за агрессивного кэширования старого JS-кода.

Мы перейдем на использование надежного официального метода `Capacitor.getPlatform()` для разделения Web (включая PWA) и Native (iOS/Android) во всем проекте.

## Суть изменений
1. **Абсолютная надежность:** Мы заменяем проверку `(window as any).Capacitor?.isNativePlatform` на официальный вызов `Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android"`.
2. **Исправление API-запросов:** Эта же неверная детекция влияла на `googleSheets.ts`, заставляя веб-версию использовать нативный мобильный транспорт `CapacitorHttp.request`, что приводило к сбоям синхронизации в браузере.
3. **Разделение логики:** 
   - Веб и PWA (Mac/iOS/Android) -> платформа `"web"` -> Лендинг (если нет сохраненного `ssId`)
   - Мобильное приложение -> платформы `"ios" | "android"` -> Мобильный вход `NativeAuthScreen`
   - Любая среда с `ssId` -> Вход в саму программу
   - GET-флаг `?force_native=true` по-прежнему принудительно открывает `NativeAuthScreen` для отладки в вебе.

## Предлагаемые изменения

### Frontend

#### `src/App.tsx`
- Импортировать `Capacitor` из `@capacitor/core` напрямую.
- Переписать `isNativeApp` с использованием `Capacitor.getPlatform()`.

```typescript
import { Capacitor } from "@capacitor/core";
...
  const isNativeApp = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("force_native") === "true") return true;
    
    try {
      const platform = Capacitor.getPlatform();
      return platform === "ios" || platform === "android";
    } catch (e) {
      return false;
    }
  }, []);
```

#### `src/services/googleSheets.ts`
- Импортировать `Capacitor` вместе с `CapacitorHttp` из `@capacitor/core`.
- Заменить неверное определение `(window as any).Capacitor?.isNativePlatform` на `Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android"`.

```typescript
import { Capacitor, CapacitorHttp } from "@capacitor/core";
 
const getGoogleScriptUrl = () => {
  const isNative = Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android";
  if (isNative) {
    const isProd = (import.meta as any).env.PROD;
    return isProd ? "https://coinlover.ru/api/sheets" : "https://coin.reloto.ru/api/sheets";
  }
  return "/api/sheets";
};
 
// Universal fetch that uses native HTTP on mobile to bypass CORS
const universalFetch = async (url: string, options?: any) => {
  const isNative = Capacitor.getPlatform() === "ios" || Capacitor.getPlatform() === "android";
  ...
```

## Верификация

### Автоматические тесты
- `npm run lint` — проверка типов TypeScript.
- `npm run build` — сборка дистрибутива фронтенда.

### Ручная проверка
- Открыть в Chrome/Safari на Mac с очищенным кэшем/в инкогнито:
  - `https://coinlover.ru` -> Должен открываться Лендинг.
  - `https://coinlover.ru/?force_native=true` -> Должен открываться `NativeAuthScreen`.
- Деплой на `dev` (`coin.reloto.ru`) и `production` (`coinlover.ru`) с помощью `./deploy.sh all`.
