<script lang="ts">
  import { T } from '@threlte/core';
  import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
  import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, TorusGeometry } from 'three';

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
    receiveShadow
    geometry={fallbackGeometry}
    position={mesh.position}
    rotation={mesh.rotation ?? PROFILE_APPEARANCE.zeroRotation}
  >
    <T.MeshStandardMaterial
      color={materialProps.color}
      metalness={materialProps.metalness}
      roughness={materialProps.roughness}
    />
  </T.Mesh>
{/if}
