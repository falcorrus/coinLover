# Исправление маршрутизации новых пользователей на coinlover.ru (План)

Обеспечить гарантированное отображение лендинга для всех новых пользователей при переходе на `coinlover.ru` (включая PWA в режиме standalone на десктопе/мобильных), а нативный экран входа (`NativeAuthScreen`) показывать только в настоящих нативных приложениях (Capacitor на iOS/Android) или при принудительном тестировании через `?force_native=true`.

## Proposed Changes

---

### Frontend

#### [MODIFY] [src/App.tsx](file:///Users/eugene/MyProjects/CoinLover/src/App.tsx)

* Изменить определение `isNativeApp` в хуке `React.useMemo` так, чтобы оно возвращало `true` только при наличии `window.Capacitor?.isNativePlatform` или при наличии отладочного GET-параметра `?force_native=true`.

```typescript
  const isNativeApp = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("force_native") === "true") return true;

    return typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform;
  }, []);
```

## Verification Plan

### Automated Tests
- Запуск локальной сборки `npm run build` для проверки отсутствия ошибок TypeScript/линтера.

### Manual Verification
- Локальная проверка в браузере:
  1. При отсутствии `ssId` в localStorage переход на `/` должен открывать лендинг.
  2. Переход на `/?force_native=true` должен открывать `NativeAuthScreen`.
  3. Переход на `/landing` должен открывать лендинг.
- Деплой на Dev (`coin.reloto.ru`) и Production (`coinlover.ru`) для окончательной проверки.
