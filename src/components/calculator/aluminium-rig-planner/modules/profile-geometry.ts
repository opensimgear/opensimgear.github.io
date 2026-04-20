import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { ExtrudeGeometry } from 'three';

import profile40x40Svg from './profiles/40x40.svg?raw';
import profile80x40Svg from './profiles/80x40.svg?raw';

type BeamAxis = 'x' | 'y' | 'z';

const geometryCache = new Map<string, ExtrudeGeometry>();
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

function getBeamAxis(size: [number, number, number]): BeamAxis {
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
  geometryCache.set(cacheKey, geometry);

  return geometry;
}

export function createAluminium40x40Geometry(size: [number, number, number]) {
  return createExtrudedSvgProfileGeometry(profile40x40Svg, size, 'alu40x40');
}

export function createAluminium80x40Geometry(size: [number, number, number]) {
  return createExtrudedSvgProfileGeometry(profile80x40Svg, size, 'alu80x40');
}
