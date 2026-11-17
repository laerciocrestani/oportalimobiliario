import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const file = join(dirname(fileURLToPath(import.meta.url)), 'ports.env')

function readPort(name: string): number {
  const line = readFileSync(file, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${name}=`))

  const value = Number(line?.slice(name.length + 1))

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Porta ${name} ausente em e2e/ports.env`)
  }

  return value
}

export const e2ePorts = {
  api: readPort('API_PORT'),
  vite: readPort('VITE_PORT'),
  astro: readPort('ASTRO_PORT'),
}
