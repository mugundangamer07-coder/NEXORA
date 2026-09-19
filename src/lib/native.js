import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

// Screens a user lands on (after login or on launch). Going "back" from these
// would only replay a redirect, so they exit the app like any Android home screen.
const ROOT_PATHS = new Set(['/', '/login', '/dashboard', '/manager', '/admin'])

export function initNative() {
  if (!Capacitor.isNativePlatform()) return

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && !ROOT_PATHS.has(window.location.pathname)) window.history.back()
    else App.exitApp()
  })
}
