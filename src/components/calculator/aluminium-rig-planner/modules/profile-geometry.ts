import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { BufferGeometry, ExtrudeGeometry } from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import profile40x40Svg from './profiles/40x40.svg?raw';
import profile80x40Svg from './profiles/80x40.svg?raw';

export type BeamAxis = 'x' | 'y' | 'z';

const geometryCache = new Map<string, BufferGeometry>();
const svgLoader = new SVGLoader();
const SVG_UNITS_TO_METERS = 0.001;
function getTargetCrossSectionSize(axis: BeamAxis, size: [number, number, number]) {
  if (axis === 'x') {
    return {
      targetWidth: size[2],
      targetHeight: size[1],
    };
  }

  if (axis === 'y') {
    return {
      targetWidth: size[0],
      targetHeight: size[2],
    };
  }

  return {
    targetWidth: size[0],
    targetHeight: size[1],
  };
}

export function getBeamAxis(size: [number, number, number]): BeamAxis {
  if (size[0] >= size[1] && size[0] >= size[2]) {
    return 'x';
  }

  if (size[1] >= size[0] && size[1] >= size[2]) {
    return 'y';
  }

  return 'z';
}

function createExtrudedSvgProfileGeometry(svgMarkup: string, size: [number, number, number], cacheKeyPrefix: string) {
  const cacheKey = `${cacheKeyPrefix}:${size.join('x')}`;
  const cachedGeometry = geometryCache.get(cacheKey);

  if (cachedGeometry) {
    return cachedGeometry;
  }

  const axis = getBeamAxis(size);
  const length = axis === 'x' ? size[0] : axis === 'y' ? size[1] : size[2];
  const svgData = svgLoader.parse(svgMarkup);
  const shapes = svgData.paths.flatMap((path) => SVGLoader.createShapes(path));
  const geometry = new ExtrudeGeometry(shapes, {
    depth: length,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 24,
  });

  geometry.scale(SVG_UNITS_TO_METERS, SVG_UNITS_TO_METERS, 1);
  geometry.computeBoundingBox();

  const { targetWidth, targetHeight } = getTargetCrossSectionSize(axis, size);
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

  if (axis === 'x') {
    geometry.rotateY(Math.PI / 2);
  } else if (axis === 'y') {
    geometry.rotateX(-Math.PI / 2);
  }

  geometry.center();
  const mergedGeometry = mergeVertices(geometry);
  const shadedGeometry = toCreasedNormals(mergedGeometry, Math.PI / 2.8);

  shadedGeometry.computeVertexNormals();
  flattenOuterLongFaceNormals(shadedGeometry, axis);
  geometry.dispose();
  mergedGeometry.dispose();

  geometryCache.set(cacheKey, shadedGeometry);

  return shadedGeometry;
}

function flattenOuterLongFaceNormals(geometry: BufferGeometry, axis: BeamAxis) {
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');

  if (!bounds || !positions || !normals) {
    return;
  }

  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const crossAxisIndices = axis === 'x' ? [1, 2] : axis === 'y' ? [0, 2] : [0, 1];
  const lengthHalf = (bounds.max.getComponent(axisIndex) - bounds.min.getComponent(axisIndex)) / 2;
  const capEpsilon = Math.max(lengthHalf * 0.015, 0.0025);
  const faceEpsilon = 0.0015;

  for (let index = 0; index < positions.count; index += 1) {
    const axisPosition = positions.getComponent(index, axisIndex);

    if (Math.abs(axisPosition) > lengthHalf - capEpsilon) {
      continue;
    }

    let replaced = false;

    for (const crossAxisIndex of crossAxisIndices) {
      const min = bounds.min.getComponent(crossAxisIndex);
      const max = bounds.max.getComponent(crossAxisIndex);
      const value = positions.getComponent(index, crossAxisIndex);

      if (Math.abs(value - max) <= faceEpsilon) {
        normals.setComponent(index, 0, 0);
        normals.setComponent(index, 1, 0);
        normals.setComponent(index, 2, 0);
        normals.setComponent(index, crossAxisIndex, 1);
        replaced = true;
        break;
      }

      if (Math.abs(value - min) <= faceEpsilon) {
        normals.setComponent(index, 0, 0);
        normals.setComponent(index, 1, 0);
        normals.setComponent(index, 2, 0);
        normals.setComponent(index, crossAxisIndex, -1);
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      continue;
    }
  }

  normals.needsUpdate = true;
}

export function createAluminium40x40Geometry(size: [number, number, number]) {
  return createExtrudedSvgProfileGeometry(profile40x40Svg, size, 'alu40x40');
}

export function createAluminium80x40Geometry(size: [number, number, number]) {
  return createExtrudedSvgProfileGeometry(profile80x40Svg, size, 'alu80x40');
}
