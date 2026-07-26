// Regenerates app icon / splash / manifest PNGs from public/icon.svg.
// Run after replacing icon.svg (or before running `npx @capacitor/assets generate --ios`).
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const svgPath = path.join(root, 'public', 'icon.svg')
const bg = '#0a0a0f' // matches CLAUDE.md's "Neutral Dark" brand color

async function opaqueIcon(size, outPath) {
  await sharp(svgPath, { density: 384 })
    .resize(size, size, { fit: 'contain', background: bg })
    .flatten({ background: bg })
    .png()
    .toFile(outPath)
}

async function splash(size, outPath) {
  const logoSize = Math.round(size * 0.35)
  const logoBuf = await sharp(svgPath, { density: 384 })
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .flatten({ background: bg })
    .png()
    .toFile(outPath)
}

async function main() {
  await mkdir(path.join(root, 'assets'), { recursive: true })

  // Capacitor asset pipeline inputs (npx @capacitor/assets generate --ios reads these)
  await opaqueIcon(1024, path.join(root, 'assets', 'icon.png'))
  await splash(2732, path.join(root, 'assets', 'splash.png'))

  // Web manifest + apple-touch-icon (fixes previously-dangling references)
  await opaqueIcon(192, path.join(root, 'public', 'icon-192.png'))
  await opaqueIcon(512, path.join(root, 'public', 'icon-512.png'))
  await opaqueIcon(180, path.join(root, 'public', 'apple-touch-icon.png'))

  console.log('Icons generated: assets/icon.png, assets/splash.png, public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
