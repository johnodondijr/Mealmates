// Guarantee a promise settles within `ms`, so the app never hangs on a stalled
// network call. This is a real risk inside the Android WebView, where a request
// to a remote host (e.g. Supabase) can stall indefinitely with no error — which
// would otherwise freeze the app on its boot screen forever.

export class TimeoutError extends Error {
  constructor(label = 'operation') {
    super(`MealMates: ${label} timed out`)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}
