import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DOMParser } from '@xmldom/xmldom';
import { ExtrudeGeometry } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, '../src/components/calculator/aluminum-rig-planner/modules');
const generatedDir = path.join(modulesDir, 'generated');

const SVG_UNITS_TO_METERS = 0.001;
const NORMALIZED_BEAM_LENGTH = 1;
const ENDCAP_THICKNESS = 0.004;
const ENDCAP_SEGMENTS = 4;
const ENDCAP_CORNER_RADIUS = 0.002;
const FILE_MAGIC = 0x5247534f;
const FILE_VERSION = 1;
const FILE_HEADER_BYTES = 60;
const BOUNDS_FLOAT_COUNT = 10;
const GEOMETRY_ASSETS = {
  'alu40x40-beam': 'alu40x40-beam.bin',
  'alu80x40-beam': 'alu80x40-beam.bin',
  'alu40x40-endcap': 'alu40x40-endcap.bin',
  'alu80x40-endcap': 'alu80x40-endcap.bin',
};

const profile40x40Svg = await readFile(path.join(modulesDir, 'profiles/40x40.svg'), 'utf8');
const profile80x40Svg = await readFile(path.join(modulesDir, 'profiles/80x40.svg'), 'utf8');

(globalThis).DOMParser = DOMParser;

const svgLoader = new SVGLoader();

function flattenOuterLongFaceNormals(geometry) {
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');

  if (!bounds || !positions || !normals) {
    return;
  }

  const lengthHalf = (bounds.max.z - bounds.min.z) / 2;
  const capEpsilon = Math.max(lengthHalf * 0.015, 0.0025);
  const faceEpsilon = 0.0015;

  for (let index = 0; index < positions.count; index += 1) {
    const axisPosition = positions.getZ(index);

    if (Math.abs(axisPosition) > lengthHalf - capEpsilon) {
      continue;
    }

    if (Math.abs(positions.getX(index) - bounds.max.x) <= faceEpsilon) {
      normals.setXYZ(index, 1, 0, 0);
      continue;
    }

    if (Math.abs(positions.getX(index) - bounds.min.x) <= faceEpsilon) {
      normals.setXYZ(index, -1, 0, 0);
      continue;
    }

    if (Math.abs(positions.getY(index) - bounds.max.y) <= faceEpsilon) {
      normals.setXYZ(index, 0, 1, 0);
      continue;
    }

    if (Math.abs(positions.getY(index) - bounds.min.y) <= faceEpsilon) {
      normals.setXYZ(index, 0, -1, 0);
    }
  }

  normals.needsUpdate = true;
}

function buildExtrudedProfileGeometry(svgMarkup, targetWidth, targetHeight) {
  const svgData = svgLoader.parse(svgMarkup);
  const shapes = svgData.paths.flatMap((shapePath) => SVGLoader.createShapes(shapePath));
  const geometry = new ExtrudeGeometry(shapes, {
    depth: NORMALIZED_BEAM_LENGTH,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 24,
  });

  geometry.scale(SVG_UNITS_TO_METERS, SVG_UNITS_TO_METERS, 1);
  geometry.computeBoundingBox();

  const initialWidth = geometry.boundingBox ? geometry.boundingBox.max.x - geometry.boundingBox.min.x : targetWidth;
  const initialHeight = geometry.boundingBox ? geometry.boundingBox.max.y - geometry.boundingBox.min.y : targetHeight;
  const shouldRotateProfile = (targetWidth >= targetHeight) !== (initialWidth >= initialHeight);

  if (shouldRotateProfile) {
    geometry.rotateZ(Math.PI / 2);
    geometry.computeBoundingBox();
  }

  const profileWidth = geometry.boundingBox ? geometry.boundingBox.max.x - geometry.boundingBox.min.x : targetWidth;
  const profileHeight = geometry.boundingBox ? geometry.boundingBox.max.y - geometry.boundingBox.min.y : targetHeight;
  const scaleX = profileWidth === 0 ? 1 : targetWidth / profileWidth;
  const scaleY = profileHeight === 0 ? 1 : targetHeight / profileHeight;

  geometry.scale(scaleX, scaleY, 1);
  geometry.center();
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');

  if (geometry.getAttribute('uv1')) {
    geometry.deleteAttribute('uv1');
  }

  const mergedGeometry = mergeVertices(geometry);
  const shadedGeometry = toCreasedNormals(mergedGeometry, Math.PI / 2.8);

  shadedGeometry.computeVertexNormals();
  flattenOuterLongFaceNormals(shadedGeometry);
  shadedGeometry.computeBoundingBox();
  shadedGeometry.computeBoundingSphere();

  geometry.dispose();
  mergedGeometry.dispose();

  return shadedGeometry;
}

function buildRoundedEndCapGeometry(width, height) {
  const radius = Math.min(ENDCAP_CORNER_RADIUS, width / 2, height / 2);
  const geometry = new RoundedBoxGeometry(width, height, ENDCAP_THICKNESS, ENDCAP_SEGMENTS, radius);

  geometry.center();
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}

function collectGeometryData(geometry) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const index = geometry.getIndex();

  return {
    position: position.array,
    normal: normal.array,
    index: index ? (index.array instanceof Uint32Array ? index.array : Uint32Array.from(index.array)) : null,
    boundingBox: geometry.boundingBox,
    boundingSphere: geometry.boundingSphere,
  };
}

const geometries = {
  'alu40x40-beam': collectGeometryData(buildExtrudedProfileGeometry(profile40x40Svg, 0.04, 0.04)),
  'alu80x40-beam': collectGeometryData(buildExtrudedProfileGeometry(profile80x40Svg, 0.04, 0.08)),
  'alu40x40-endcap': collectGeometryData(buildRoundedEndCapGeometry(0.04, 0.04)),
  'alu80x40-endcap': collectGeometryData(buildRoundedEndCapGeometry(0.04, 0.08)),
};

function getGeometryByteLength(geometryData) {
  return geometryData.position.byteLength + geometryData.normal.byteLength + (geometryData.index?.byteLength ?? 0);
}

function createGeometryFileBuffer(geometryData) {
  const totalByteLength = FILE_HEADER_BYTES + getGeometryByteLength(geometryData);
  const fileBuffer = Buffer.allocUnsafe(totalByteLength);
  let offset = 0;
  const boundingBox = geometryData.boundingBox;
  const boundingSphere = geometryData.boundingSphere;

  fileBuffer.writeUInt32LE(FILE_MAGIC, offset);
  offset += 4;
  fileBuffer.writeUInt32LE(FILE_VERSION, offset);
  offset += 4;
  fileBuffer.writeUInt32LE(geometryData.position.length, offset);
  offset += 4;
  fileBuffer.writeUInt32LE(geometryData.normal.length, offset);
  offset += 4;
  fileBuffer.writeUInt32LE(geometryData.index?.length ?? 0, offset);
  offset += 4;

  const bounds = [
    ...(boundingBox?.min.toArray() ?? [0, 0, 0]),
    ...(boundingBox?.max.toArray() ?? [0, 0, 0]),
    ...(boundingSphere?.center.toArray() ?? [0, 0, 0]),
    boundingSphere?.radius ?? 0,
  ];

  for (let boundsIndex = 0; boundsIndex < BOUNDS_FLOAT_COUNT; boundsIndex += 1) {
    fileBuffer.writeFloatLE(bounds[boundsIndex], offset);
    offset += 4;
  }

  Buffer.from(geometryData.position.buffer, geometryData.position.byteOffset, geometryData.position.byteLength).copy(
    fileBuffer,
    offset
  );
  offset += geometryData.position.byteLength;

  Buffer.from(geometryData.normal.buffer, geometryData.normal.byteOffset, geometryData.normal.byteLength).copy(
    fileBuffer,
    offset
  );
  offset += geometryData.normal.byteLength;

  if (geometryData.index) {
    Buffer.from(geometryData.index.buffer, geometryData.index.byteOffset, geometryData.index.byteLength).copy(
      fileBuffer,
      offset
    );
    offset += geometryData.index.byteLength;
  }

  return fileBuffer;
}

await mkdir(generatedDir, { recursive: true });
await rm(path.join(generatedDir, 'profile-geometries.bin'), { force: true });

for (const [key, filename] of Object.entries(GEOMETRY_ASSETS)) {
  const outputFile = path.join(generatedDir, filename);
  await writeFile(outputFile, createGeometryFileBuffer(geometries[key]));
  console.log(`Wrote ${outputFile}`);
}
