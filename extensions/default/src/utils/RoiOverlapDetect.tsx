// Below code is only working for circle roi.
// type Vec3 = [number, number, number];

// interface CircleROI {
//   data: {
//     handles: {
//       points: Vec3[];
//     };
//     cachedStats: {
//       [key: string]: {
//         radius: number;
//         statsArray: { name: string; value: number | Vec3 }[];
//       };
//     };
//   };
// }

// // Helper: get center point from statsArray
// function getCenterFromStats(statsArray: any[]): [number, number] {
//   const centerEntry = statsArray.find(s => s.name === 'center');
//   const [x, y] = centerEntry.value;
//   return [x, y];
// }

// // Helper: actual geometric overlap area between 2 circles
// function computeCircleOverlapAreaPercent(
//   centerA: [number, number],
//   radiusA: number,
//   centerB: [number, number],
//   radiusB: number
// ): number {
//   const dx = centerA[0] - centerB[0];
//   const dy = centerA[1] - centerB[1];
//   const d = Math.hypot(dx, dy);

//   // No overlap
//   if (d >= radiusA + radiusB) {
//     return 0;
//   }

//   // One circle inside another
//   if (d <= Math.abs(radiusA - radiusB)) {
//     const smaller = Math.min(radiusA, radiusB);
//     return (Math.PI * smaller * smaller) / (Math.PI * radiusA * radiusA);
//   }

//   // Partial overlap
//   const r1sq = radiusA * radiusA;
//   const r2sq = radiusB * radiusB;

//   const alpha = 2 * Math.acos((r1sq + d * d - r2sq) / (2 * radiusA * d));
//   const beta = 2 * Math.acos((r2sq + d * d - r1sq) / (2 * radiusB * d));

//   const area1 = 0.5 * r1sq * (alpha - Math.sin(alpha));
//   const area2 = 0.5 * r2sq * (beta - Math.sin(beta));
//   const overlapArea = area1 + area2;

//   return overlapArea / (Math.PI * r1sq);
// }

// // ✅ MAIN FUNCTION: input your two annotation objects directly
// export default function getOverlapPercentageFromAnnotations(
//   annotationA: CircleROI,
//   annotationB: CircleROI
// ): number {
//   const keyA = Object.keys(annotationA.data.cachedStats)[0];
//   const keyB = Object.keys(annotationB.data.cachedStats)[0];

//   const radiusA = annotationA.data.cachedStats[keyA].radius;
//   const radiusB = annotationB.data.cachedStats[keyB].radius;

//   const centerA = getCenterFromStats(annotationA.data.cachedStats[keyA].statsArray);
//   const centerB = getCenterFromStats(annotationB.data.cachedStats[keyB].statsArray);

//   return computeCircleOverlapAreaPercent(centerA, radiusA, centerB, radiusB);
// }

// --------------------it's working but not accurate for other roi---------------
// ROIComparator.ts

type Annotation = any;

const MASK_SIZE = 512;

function worldToPixel(point: number[], bounds: number[][]): number[] {
  const [[minX, minY], [maxX, maxY]] = bounds;
  const xNorm = (point[0] - minX) / (maxX - minX);
  const yNorm = (point[1] - minY) / (maxY - minY);
  return [Math.floor(xNorm * MASK_SIZE), Math.floor(yNorm * MASK_SIZE)];
}

function get2DPolygonPoints(annotation: Annotation): number[][] {
  const { toolName } = annotation.metadata;

  if (toolName === 'CircleROI') {
    const [center, perimeter] = annotation.data.handles.points;
    const radius = Math.sqrt(
      Math.pow(perimeter[0] - center[0], 2) + Math.pow(perimeter[1] - center[1], 2)
    );
    const segments = 64;
    return Array.from({ length: segments }, (_, i) => {
      const angle = (2 * Math.PI * i) / segments;
      return [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)];
    });
  }

  if (toolName === 'EllipticalROI') {
    const [top, bottom, left, right] = annotation.data.handles.points;
    const center = [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2];
    const rx = Math.abs(right[0] - left[0]) / 2;
    const ry = Math.abs(bottom[1] - top[1]) / 2;
    const segments = 64;
    return Array.from({ length: segments }, (_, i) => {
      const angle = (2 * Math.PI * i) / segments;
      return [center[0] + rx * Math.cos(angle), center[1] + ry * Math.sin(angle)];
    });
  }

  if (toolName === 'RectangleROI') {
    return annotation.data.handles.points.map((p: number[]) => [p[0], p[1]]);
  }

  if (
    toolName === 'PlanarFreehandROI' ||
    toolName === 'SplineROI' ||
    toolName === 'LivewireContour'
  ) {
    return annotation.data.contour?.polyline?.map((p: number[]) => [p[0], p[1]]) ?? [];
  }

  if (toolName === 'Length') {
    return []; // Length is not area-based, skip.
  }

  return [];
}

function getWorldBounds(...annotations: Annotation[]): number[][] {
  const allPoints = annotations.flatMap(a => get2DPolygonPoints(a));
  const xs = allPoints.map(p => p[0]);
  const ys = allPoints.map(p => p[1]);
  return [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ];
}

function rasterizePolygon(points: number[][], bounds: number[][]): boolean[][] {
  const mask = Array.from({ length: MASK_SIZE }, () => Array(MASK_SIZE).fill(false));

  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.canvas.width = MASK_SIZE;
  ctx.canvas.height = MASK_SIZE;
  ctx.clearRect(0, 0, MASK_SIZE, MASK_SIZE);

  ctx.beginPath();
  const [startX, startY] = worldToPixel(points[0], bounds);
  ctx.moveTo(startX, startY);
  points.forEach(([x, y]) => {
    const [px, py] = worldToPixel([x, y], bounds);
    ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, MASK_SIZE, MASK_SIZE).data;

  for (let y = 0; y < MASK_SIZE; y++) {
    for (let x = 0; x < MASK_SIZE; x++) {
      const index = (y * MASK_SIZE + x) * 4;
      if (imageData[index + 3] > 0) {
        mask[y][x] = true;
      }
    }
  }

  return mask;
}

function computeOverlap(maskA: boolean[][], maskB: boolean[][]): number {
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < MASK_SIZE; y++) {
    for (let x = 0; x < MASK_SIZE; x++) {
      const a = maskA[y][x];
      const b = maskB[y][x];
      if (a && b) {
        intersection++;
      }
      if (a || b) {
        union++;
      }
    }
  }
  return union === 0 ? 0 : (intersection / union) * 100;
}

export function calculateROIOverlap(annoA: Annotation, annoB: Annotation): number {
  const shapeA = get2DPolygonPoints(annoA);
  const shapeB = get2DPolygonPoints(annoB);

  if (shapeA.length === 0 || shapeB.length === 0) {
    return 0;
  }

  const bounds = getWorldBounds(annoA, annoB);
  const maskA = rasterizePolygon(shapeA, bounds);
  const maskB = rasterizePolygon(shapeB, bounds);
  return computeOverlap(maskA, maskB);
}

// ----------------Third output -------------------------

// function createEmptyMask(width, height) {
//   return new Uint8Array(width * height);
// }

// function pointToPixel(point, spacing, origin) {
//   const [x, y] = point;
//   const px = Math.round((x - origin[0]) / spacing[0]);
//   const py = Math.round((y - origin[1]) / spacing[1]);
//   return [px, py];
// }

// function drawCircleROI(mask, width, height, handles, spacing, origin) {
//   const [start, end] = handles.points;
//   const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
//   const radius = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)) / 2;

//   const [cx, cy] = pointToPixel(center, spacing, origin);
//   const rPx = Math.round(radius / spacing[0]); // assuming square pixel

//   for (let y = cy - rPx; y <= cy + rPx; y++) {
//     for (let x = cx - rPx; x <= cx + rPx; x++) {
//       if (x >= 0 && x < width && y >= 0 && y < height) {
//         const dx = x - cx;
//         const dy = y - cy;
//         if (dx * dx + dy * dy <= rPx * rPx) {
//           mask[y * width + x] = 1;
//         }
//       }
//     }
//   }
// }

// function drawRectangleROI(mask, width, height, handles, spacing, origin) {
//   const [tl, tr, bl, br] = handles.points;
//   const topLeft = pointToPixel(tl, spacing, origin);
//   const bottomRight = pointToPixel(br, spacing, origin);

//   for (
//     let y = Math.min(topLeft[1], bottomRight[1]);
//     y <= Math.max(topLeft[1], bottomRight[1]);
//     y++
//   ) {
//     for (
//       let x = Math.min(topLeft[0], bottomRight[0]);
//       x <= Math.max(topLeft[0], bottomRight[0]);
//       x++
//     ) {
//       if (x >= 0 && x < width && y >= 0 && y < height) {
//         mask[y * width + x] = 1;
//       }
//     }
//   }
// }

// function calculateOverlap(maskA, maskB, width, height) {
//   let intersection = 0;
//   let countA = 0;
//   let countB = 0;

//   for (let i = 0; i < width * height; i++) {
//     if (maskA[i]) {
//       countA++;
//     }
//     if (maskB[i]) {
//       countB++;
//     }
//     if (maskA[i] && maskB[i]) {
//       intersection++;
//     }
//   }

//   return {
//     overlapA: countA > 0 ? (intersection / countA) * 100 : 0,
//     overlapB: countB > 0 ? (intersection / countB) * 100 : 0,
//     overlapMin: Math.min(
//       countA > 0 ? (intersection / countA) * 100 : 0,
//       countB > 0 ? (intersection / countB) * 100 : 0
//     ).toFixed(1),
//   };
// }

// function generateROIMasks(annotations, width, height, spacing = [0.5, 0.5], origin = [0, 0]) {
//   const masks = [];

//   for (const annotation of annotations) {
//     const mask = createEmptyMask(width, height);
//     const { toolName } = annotation.metadata;
//     const handles = annotation.data.handles;

//     if (toolName === 'CircleROI') {
//       drawCircleROI(mask, width, height, handles, spacing, origin);
//     } else if (toolName === 'RectangleROI') {
//       drawRectangleROI(mask, width, height, handles, spacing, origin);
//     }

//     masks.push(mask);
//   }

//   return masks;
// }

// export default function calculateAnnotationOverlap(
//   annotations,
//   width = 512,
//   height = 512,
//   spacing = [0.5, 0.5],
//   origin = [0, 0]
// ) {
//   const [maskA, maskB] = generateROIMasks(annotations, width, height, spacing, origin);
//   return calculateOverlap(maskA, maskB, width, height);
// }

// // Example usage:
// // const result = calculateAnnotationOverlap(annotationObjs, 512, 512);
// // console.log(result);  // { overlapA: ..., overlapB: ..., overlapMin: ... }

// ---------Forth output ----------

// // Accurate ROI Overlap Calculation for Circle, Rectangle, Ellipse, and Polygon ROIs

// const WIDTH = 512;
// const HEIGHT = 512;
// const SPACING = [0.012, 0.012]; // mm per pixel
// const ORIGIN = [0, 0]; // image origin in mm

// function mmToPixel([x, y]) {
//   const px = Math.round((x - ORIGIN[0]) / SPACING[0]);
//   const py = Math.round((y - ORIGIN[1]) / SPACING[1]);
//   return [px, py];
// }

// function createMask() {
//   return new Uint8Array(WIDTH * HEIGHT);
// }

// function drawROI(mask, annotation) {
//   const tool = annotation.metadata.toolName;
//   if (tool === 'CircleROI') {
//     drawCircleROI(mask, annotation);
//   } else if (tool === 'RectangleROI') {
//     drawRectangleROI(mask, annotation);
//   } else if (tool === 'EllipticalROI') {
//     drawEllipseROI(mask, annotation);
//   } else if (tool === 'SplineROI' || tool === 'PlanarFreehandROI' || tool === 'LivewireContour') {
//     drawPolygonROI(mask, annotation);
//   }
// }

// function drawCircleROI(mask, annotation) {
//   const points = annotation.data.handles.points;
//   if (!points || points.length < 2) {
//     return;
//   }

//   const [centerMM, edgeMM] = points;
//   const [cx, cy] = mmToPixel(centerMM);
//   const [ex, ey] = mmToPixel(edgeMM);
//   const dx = ex - cx;
//   const dy = ey - cy;
//   const radius = Math.sqrt(dx * dx + dy * dy);

//   for (let y = Math.max(0, cy - radius); y <= Math.min(HEIGHT - 1, cy + radius); y++) {
//     for (let x = Math.max(0, cx - radius); x <= Math.min(WIDTH - 1, cx + radius); x++) {
//       const dx = x - cx;
//       const dy = y - cy;
//       if (dx * dx + dy * dy <= radius * radius) {
//         mask[y * WIDTH + x] = 1;
//       }
//     }
//   }
// }

// function drawRectangleROI(mask, annotation) {
//   const points = annotation.data.handles.points;
//   if (!points || points.length < 2) {
//     return;
//   }

//   const [p1MM, p2MM] = [points[0], points[3]]; // Diagonal corners
//   const [x1, y1] = mmToPixel(p1MM);
//   const [x2, y2] = mmToPixel(p2MM);

//   const minX = Math.min(x1, x2);
//   const maxX = Math.max(x1, x2);
//   const minY = Math.min(y1, y2);
//   const maxY = Math.max(y1, y2);

//   for (let y = Math.max(0, minY); y <= Math.min(HEIGHT - 1, maxY); y++) {
//     for (let x = Math.max(0, minX); x <= Math.min(WIDTH - 1, maxX); x++) {
//       mask[y * WIDTH + x] = 1;
//     }
//   }
// }

// function drawEllipseROI(mask, annotation) {
//   const points = annotation.data.handles.points;
//   if (!points || points.length < 2) {
//     return;
//   }

//   const [p1MM, p2MM] = points;
//   const [x1, y1] = mmToPixel(p1MM);
//   const [x2, y2] = mmToPixel(p2MM);

//   const cx = Math.round((x1 + x2) / 2);
//   const cy = Math.round((y1 + y2) / 2);
//   const rx = Math.abs(x2 - x1) / 2;
//   const ry = Math.abs(y2 - y1) / 2;

//   for (let y = Math.max(0, cy - ry); y <= Math.min(HEIGHT - 1, cy + ry); y++) {
//     for (let x = Math.max(0, cx - rx); x <= Math.min(WIDTH - 1, cx + rx); x++) {
//       const dx = (x - cx) / rx;
//       const dy = (y - cy) / ry;
//       if (dx * dx + dy * dy <= 1) {
//         mask[y * WIDTH + x] = 1;
//       }
//     }
//   }
// }

// function drawPolygonROI(mask, annotation) {
//   const polyline = annotation.data?.contour?.polyline;
//   if (!polyline || polyline.length < 3) {
//     return;
//   }

//   const polygon = polyline.map(mmToPixel);

//   for (let y = 0; y < HEIGHT; y++) {
//     for (let x = 0; x < WIDTH; x++) {
//       if (pointInPolygon(x, y, polygon)) {
//         mask[y * WIDTH + x] = 1;
//       }
//     }
//   }
// }

// function pointInPolygon(x, y, polygon) {
//   let inside = false;
//   for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
//     const [xi, yi] = polygon[i];
//     const [xj, yj] = polygon[j];
//     const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
//     if (intersect) {
//       inside = !inside;
//     }
//   }
//   return inside;
// }

// export default function CalculateOverlap(annA, annB) {
//   const maskA = createMask();
//   const maskB = createMask();

//   drawROI(maskA, annA);
//   drawROI(maskB, annB);

//   let countA = 0,
//     countB = 0,
//     countOverlap = 0;
//   for (let i = 0; i < WIDTH * HEIGHT; i++) {
//     if (maskA[i]) {
//       countA++;
//     }
//     if (maskB[i]) {
//       countB++;
//     }
//     if (maskA[i] && maskB[i]) {
//       countOverlap++;
//     }
//   }

//   const overlapA = countA > 0 ? (countOverlap / countA) * 100 : 0;
//   const overlapB = countB > 0 ? (countOverlap / countB) * 100 : 0;
//   const overlapMin = Math.min(overlapA, overlapB).toFixed(1);

//   return {
//     overlapA: +overlapA.toFixed(1),
//     overlapB: +overlapB.toFixed(1),
//     overlapMin,
//   };
// }

// // Example usage:
// // const result = calculateOverlap(annotation1, annotation2);
// // console.log(result);
