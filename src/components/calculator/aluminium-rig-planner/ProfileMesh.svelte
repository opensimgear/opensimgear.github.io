<script lang="ts">
  import { T } from '@threlte/core';

  import { createAluminium40x40Geometry, createAluminium80x40Geometry } from './modules/profile-geometry';
  import type { MeshSpec } from './modules/shared';

  type Props = {
    mesh: MeshSpec;
  };

  const { mesh }: Props = $props();

  function hexToLuminance(hex: string) {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return 0.5;
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
    const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
    const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  function liftHex(hex: string, amount: number) {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
      return hex;
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    const liftChannel = (value: number) => Math.round(value + (255 - value) * amount);

    return `#${[liftChannel(red), liftChannel(green), liftChannel(blue)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')}`;
  }

  const materialProps = $derived.by(() => {
    const luminance = hexToLuminance(mesh.color);
    const isDarkFinish = luminance < 0.3;

    return {
      color: isDarkFinish ? liftHex(mesh.color, 0.08) : mesh.color,
      metalness: mesh.metalness ?? (isDarkFinish ? 0.28 : 0.58),
      roughness: mesh.roughness ?? (isDarkFinish ? 0.62 : 0.34),
    };
  });

  const profileGeometry = $derived.by(() => {
    if (mesh.profileType === 'alu40x40') {
      return createAluminium40x40Geometry(mesh.size);
    }

    if (mesh.profileType === 'alu80x40') {
      return createAluminium80x40Geometry(mesh.size);
    }

    return null;
  });
</script>

{#if profileGeometry}
  <T.Mesh
    castShadow
    receiveShadow
    geometry={profileGeometry}
    position={mesh.position}
    rotation={mesh.rotation ?? [0, 0, 0]}
  >
    <T.MeshStandardMaterial
      color={materialProps.color}
      metalness={materialProps.metalness}
      roughness={materialProps.roughness}
    />
  </T.Mesh>
{:else}
  <T.Mesh castShadow receiveShadow position={mesh.position} rotation={mesh.rotation ?? [0, 0, 0]}>
    <T.BoxGeometry args={mesh.size} />
    <T.MeshStandardMaterial
      color={materialProps.color}
      metalness={materialProps.metalness}
      roughness={materialProps.roughness}
    />
  </T.Mesh>
{/if}
