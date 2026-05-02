<script lang="ts">
  import { T } from '@threlte/core';
  import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
  import {
    BoxGeometry,
    BufferGeometry,
    CylinderGeometry,
    Float32BufferAttribute,
    TorusGeometry,
  } from 'three';

  import { ENDCAP_MATERIAL, PROFILE_APPEARANCE } from '../constants/profile';
  import {
    getProfileGeometry,
    getProfileMeshRotation,
    getProfileMeshScale,
  } from '../modules/profile-geometry';
  import type { MeshSpec } from '../modules/shared';

  type Props = {
    mesh: MeshSpec;
  };

  const { mesh }: Props = $props();

  function hexToLuminance(hex: string) {
    const normalized = hex.replace('#', '');

    if (normalized.length !== PROFILE_APPEARANCE.hexColorLength) {
      return PROFILE_APPEARANCE.invalidHexLuminanceFallback;
    }

    const red =
      Number.parseInt(normalized.slice(0, 2), PROFILE_APPEARANCE.hexChannelRadix) / PROFILE_APPEARANCE.colorChannelMax;
    const green =
      Number.parseInt(normalized.slice(2, 4), PROFILE_APPEARANCE.hexChannelRadix) / PROFILE_APPEARANCE.colorChannelMax;
    const blue =
      Number.parseInt(normalized.slice(4, 6), PROFILE_APPEARANCE.hexChannelRadix) / PROFILE_APPEARANCE.colorChannelMax;

    return (
      PROFILE_APPEARANCE.luminanceWeights.red * red +
      PROFILE_APPEARANCE.luminanceWeights.green * green +
      PROFILE_APPEARANCE.luminanceWeights.blue * blue
    );
  }

  function liftHex(hex: string, amount: number) {
    const normalized = hex.replace('#', '');

    if (normalized.length !== PROFILE_APPEARANCE.hexColorLength) {
      return hex;
    }

    const red = Number.parseInt(normalized.slice(0, 2), PROFILE_APPEARANCE.hexChannelRadix);
    const green = Number.parseInt(normalized.slice(2, 4), PROFILE_APPEARANCE.hexChannelRadix);
    const blue = Number.parseInt(normalized.slice(4, 6), PROFILE_APPEARANCE.hexChannelRadix);

    const liftChannel = (value: number) =>
      Math.round(value + (PROFILE_APPEARANCE.colorChannelMax - value) * amount);

    return `#${[liftChannel(red), liftChannel(green), liftChannel(blue)]
      .map((value) =>
        value
          .toString(PROFILE_APPEARANCE.hexChannelRadix)
          .padStart(PROFILE_APPEARANCE.hexColorLength / 3, '0')
      )
      .join('')}`;
  }

  const materialProps = $derived.by(() => {
    if (mesh.materialKind === 'plastic') {
      return {
        color: mesh.color,
        metalness: mesh.metalness ?? ENDCAP_MATERIAL.metalness,
        roughness: mesh.roughness ?? ENDCAP_MATERIAL.roughness,
      };
    }

    const luminance = hexToLuminance(mesh.color);
    const isDarkFinish = luminance < PROFILE_APPEARANCE.darkFinishThreshold;

    return {
      color: isDarkFinish ? liftHex(mesh.color, PROFILE_APPEARANCE.darkFinishColorLift) : mesh.color,
      metalness: mesh.metalness ?? (isDarkFinish ? PROFILE_APPEARANCE.darkFinishMetalness : PROFILE_APPEARANCE.lightFinishMetalness),
      roughness:
        mesh.roughness ?? (isDarkFinish ? PROFILE_APPEARANCE.darkFinishRoughness : PROFILE_APPEARANCE.lightFinishRoughness),
    };
  });

  const profileGeometry = $derived.by(() => {
    return getProfileGeometry(mesh);
  });
  const profileScale = $derived(
    mesh.shape === 'endcap'
      ? PROFILE_APPEARANCE.identityScale
      : mesh.profileType
        ? getProfileMeshScale(mesh.size)
        : PROFILE_APPEARANCE.identityScale
  );
  const profileRotation = $derived(
    profileGeometry ? getProfileMeshRotation(mesh) : mesh.rotation ?? PROFILE_APPEARANCE.zeroRotation
  );
  const fallbackGeometry = $derived.by(() => {
    if (mesh.shape === 'torus') {
      return new TorusGeometry(
        mesh.torusRadius ?? 0,
        mesh.torusTubeRadius ?? 0,
        mesh.torusRadialSegments ?? 12,
        mesh.torusTubularSegments ?? 24
      );
    }

    if (mesh.shape === 'cylinder') {
      return new CylinderGeometry(
        mesh.cylinderRadiusTop ?? 0,
        mesh.cylinderRadiusBottom ?? 0,
        mesh.size[0],
        mesh.cylinderRadialSegments ?? 20
      );
    }

    if (mesh.shape === 'truncated-box') {
      const [topWidth, topDepth, height] = mesh.size;
      const [bottomWidth, bottomDepth] = mesh.truncatedBoxBottomSize ?? [topWidth, topDepth];
      const topX = topWidth / 2;
      const topY = topDepth / 2;
      const bottomX = bottomWidth / 2;
      const bottomY = bottomDepth / 2;
      const halfHeight = height / 2;
      const vertices = [
        -bottomX,
        -bottomY,
        -halfHeight,
        bottomX,
        -bottomY,
        -halfHeight,
        bottomX,
        bottomY,
        -halfHeight,
        -bottomX,
        bottomY,
        -halfHeight,
        -topX,
        -topY,
        halfHeight,
        topX,
        -topY,
        halfHeight,
        topX,
        topY,
        halfHeight,
        -topX,
        topY,
        halfHeight,
      ];
      const indices = [
        0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3,
        4, 7,
      ];
      const geometry = new BufferGeometry();

      geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }

    if (mesh.shape === 'trapezoid-plate') {
      const [length, thickness, height] = mesh.size;
      const halfLength = length / 2;
      const halfThickness = thickness / 2;
      const halfHeight = height / 2;
      const bottomRise = Math.min(Math.max(mesh.trapezoidPlateBottomRise ?? 0, 0), height - Number.EPSILON);
      const cornerRadius = Math.min(Math.max(mesh.trapezoidPlateCornerRadius ?? 0, 0), height / 2, length / 2);
      const cornerSegments = 8;
      const corners = [
        { x: -halfLength, z: -halfHeight },
        { x: halfLength, z: -halfHeight + bottomRise },
        { x: halfLength, z: halfHeight },
        { x: -halfLength, z: halfHeight },
      ];
      const outline = corners.flatMap((corner, index) => {
        const previous = corners[(index + corners.length - 1) % corners.length];
        const next = corners[(index + 1) % corners.length];
        const previousLength = Math.hypot(previous.x - corner.x, previous.z - corner.z);
        const nextLength = Math.hypot(next.x - corner.x, next.z - corner.z);
        const radius = Math.min(cornerRadius, previousLength / 2, nextLength / 2);

        if (radius <= Number.EPSILON) {
          return [corner];
        }

        const start = {
          x: corner.x + ((previous.x - corner.x) / previousLength) * radius,
          z: corner.z + ((previous.z - corner.z) / previousLength) * radius,
        };
        const end = {
          x: corner.x + ((next.x - corner.x) / nextLength) * radius,
          z: corner.z + ((next.z - corner.z) / nextLength) * radius,
        };
        const points = [];

        for (let step = 0; step <= cornerSegments; step += 1) {
          const t = step / cornerSegments;
          const inverseT = 1 - t;

          points.push({
            x: inverseT * inverseT * start.x + 2 * inverseT * t * corner.x + t * t * end.x,
            z: inverseT * inverseT * start.z + 2 * inverseT * t * corner.z + t * t * end.z,
          });
        }

        return points;
      });
      const vertices: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];

      const pushVertex = (x: number, y: number, z: number, normal: [number, number, number]) => {
        vertices.push(x, y, z);
        normals.push(...normal);
        return vertices.length / 3 - 1;
      };

      const frontIndices = outline.map((point) => pushVertex(point.x, -halfThickness, point.z, [0, -1, 0]));
      const backIndices = outline.map((point) => pushVertex(point.x, halfThickness, point.z, [0, 1, 0]));

      for (let index = 1; index < outline.length - 1; index += 1) {
        indices.push(frontIndices[0], frontIndices[index], frontIndices[index + 1]);
        indices.push(backIndices[0], backIndices[index + 1], backIndices[index]);
      }

      for (let index = 0; index < outline.length; index += 1) {
        const nextIndex = (index + 1) % outline.length;
        const point = outline[index];
        const nextPoint = outline[nextIndex];
        const edgeX = nextPoint.x - point.x;
        const edgeZ = nextPoint.z - point.z;
        const edgeLength = Math.hypot(edgeX, edgeZ) || 1;
        const normal = [edgeZ / edgeLength, 0, -edgeX / edgeLength] as [number, number, number];
        const frontStart = pushVertex(point.x, -halfThickness, point.z, normal);
        const backStart = pushVertex(point.x, halfThickness, point.z, normal);
        const backEnd = pushVertex(nextPoint.x, halfThickness, nextPoint.z, normal);
        const frontEnd = pushVertex(nextPoint.x, -halfThickness, nextPoint.z, normal);

        indices.push(frontStart, backStart, backEnd, frontStart, backEnd, frontEnd);
      }

      const geometry = new BufferGeometry();

      geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
      geometry.setIndex(indices);
      return geometry;
    }

    const [width, height, depth] = mesh.size;
    const minDimension = Math.min(width, height, depth);
    const radiusLimit = Math.max(0, minDimension / 2 - Number.EPSILON);
    const cornerRadius = Math.min(mesh.cornerRadius ?? 0, radiusLimit);

    if (cornerRadius > 0) {
      return new RoundedBoxGeometry(width, height, depth, mesh.cornerSegments ?? 5, cornerRadius);
    }

    return new BoxGeometry(width, height, depth);
  });
</script>

{#if profileGeometry}
  <T.Mesh
    castShadow
    geometry={profileGeometry}
    position={mesh.position}
    rotation={profileRotation}
    scale={profileScale}
  >
    <T.MeshStandardMaterial
      color={materialProps.color}
      metalness={materialProps.metalness}
      roughness={materialProps.roughness}
    />
  </T.Mesh>
{:else}
  <T.Mesh
    castShadow
    receiveShadow={mesh.shape !== 'trapezoid-plate'}
    geometry={fallbackGeometry}
    position={mesh.position}
    rotation={mesh.rotation ?? PROFILE_APPEARANCE.zeroRotation}
  >
    <T.MeshStandardMaterial
      color={materialProps.color}
      flatShading={mesh.shape === 'trapezoid-plate'}
      metalness={materialProps.metalness}
      roughness={materialProps.roughness}
    />
  </T.Mesh>
{/if}
