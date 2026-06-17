type Point = [number, number]

// Gaussian elimination on an augmented matrix [A|b] of size n×(n+1)
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length
  const aug = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

    const pivot = aug[col][col]
    if (Math.abs(pivot) < 1e-10) continue
    for (let j = col; j <= n; j++) aug[col][j] /= pivot

    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col]
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j]
    }
  }

  return aug.map(row => row[n])
}

// Compute a homography matrix H (9 values, h[8]=1) that maps srcPts → dstPts.
// Pass dstPts as src and srcPts as dst to get the inverse mapping directly.
function computeHomography(srcPts: Point[], dstPts: Point[]): number[] {
  const A: number[][] = []
  const b: number[] = []

  for (let i = 0; i < 4; i++) {
    const [x, y] = srcPts[i]
    const [xp, yp] = dstPts[i]
    A.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp])
    b.push(xp)
    A.push([0, 0, 0, x, y, 1, -x * yp, -y * yp])
    b.push(yp)
  }

  const h = solveLinearSystem(A, b)
  return [...h, 1]
}

function bilinearSample(data: Uint8ClampedArray, w: number, h: number, sx: number, sy: number): [number, number, number, number] {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(sx)))
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(sy)))
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  const fx = sx - x0
  const fy = sy - y0

  const idx = (row: number, col: number) => (row * w + col) * 4
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const r = lerp(lerp(data[idx(y0, x0)], data[idx(y0, x1)], fx), lerp(data[idx(y1, x0)], data[idx(y1, x1)], fx), fy)
  const g = lerp(lerp(data[idx(y0, x0) + 1], data[idx(y0, x1) + 1], fx), lerp(data[idx(y1, x0) + 1], data[idx(y1, x1) + 1], fx), fy)
  const bv = lerp(lerp(data[idx(y0, x0) + 2], data[idx(y0, x1) + 2], fx), lerp(data[idx(y1, x0) + 2], data[idx(y1, x1) + 2], fx), fy)
  const a = lerp(lerp(data[idx(y0, x0) + 3], data[idx(y0, x1) + 3], fx), lerp(data[idx(y1, x0) + 3], data[idx(y1, x1) + 3], fx), fy)

  return [r, g, bv, a]
}

function loadImageToCanvas(dataUrl: string, maxSide = 1500): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve({ canvas, scale })
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Applies a 4-point perspective warp.
 * srcCorners: 4 points in the SOURCE image's pixel space (top-left, top-right, bottom-right, bottom-left).
 * outW / outH: desired output dimensions (computed automatically if 0).
 */
export async function applyPerspectiveWarp(
  srcDataUrl: string,
  srcCorners: Point[],
  outW = 0,
  outH = 0
): Promise<string> {
  const { canvas: src, scale } = await loadImageToCanvas(srcDataUrl, 1500)
  const ctx = src.getContext('2d')!
  const srcData = ctx.getImageData(0, 0, src.width, src.height)

  // Scale corners to match downscaled source
  const corners = srcCorners.map(([x, y]): Point => [x * scale, y * scale])

  // Compute output dimensions from bounding box if not provided
  if (outW === 0 || outH === 0) {
    const xs = corners.map(c => c[0])
    const ys = corners.map(c => c[1])
    const bboxW = Math.max(...xs) - Math.min(...xs)
    const bboxH = Math.max(...ys) - Math.min(...ys)
    // Preserve aspect ratio, cap at 1500px
    const capScale = Math.min(1, 1500 / Math.max(bboxW, bboxH))
    outW = Math.round(bboxW * capScale)
    outH = Math.round(bboxH * capScale)
  }

  // Destination rectangle: TL, TR, BR, BL
  const dstCorners: Point[] = [[0, 0], [outW, 0], [outW, outH], [0, outH]]

  // Compute H_inv: maps dst pixels → src pixels (inverse mapping for rasterization)
  const H = computeHomography(dstCorners, corners)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d')!
  const outData = outCtx.createImageData(outW, outH)

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      // Apply H to (dx, dy) to get source (sx, sy)
      const w_coord = H[6] * dx + H[7] * dy + H[8]
      const sx = (H[0] * dx + H[1] * dy + H[2]) / w_coord
      const sy = (H[3] * dx + H[4] * dy + H[5]) / w_coord

      const [r, g, b, a] = bilinearSample(srcData.data, src.width, src.height, sx, sy)
      const outIdx = (dy * outW + dx) * 4
      outData.data[outIdx] = r
      outData.data[outIdx + 1] = g
      outData.data[outIdx + 2] = b
      outData.data[outIdx + 3] = a
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return outCanvas.toDataURL('image/jpeg', 0.92)
}

/**
 * Enhances a document scan using Canvas CSS filters.
 */
export async function enhanceDocumentScan(
  dataUrl: string,
  mode: 'color' | 'grayscale' | 'bw'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!

      const filters: Record<typeof mode, string> = {
        color: 'contrast(1.35) brightness(1.05) saturate(1.1)',
        grayscale: 'grayscale(1) contrast(1.5) brightness(1.05)',
        bw: 'grayscale(1) contrast(3) brightness(1.1)',
      }
      ctx.filter = filters[mode]
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
