export async function onRequestError(
  error: unknown,
  request: { path?: string }
) {
  const { logError } = await import('@/lib/error-log')
  const err = error as Error
  await logError({
    source: 'server',
    message: err?.message ?? String(error),
    stack: err?.stack ?? null,
    url: request?.path ?? null,
  })
}
