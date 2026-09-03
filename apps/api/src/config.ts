export function parsePort(rawPort: string | undefined): number {
  const port = Number(rawPort ?? '8787')

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}
