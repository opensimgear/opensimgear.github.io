<script lang="ts">
  import { Grid } from '@threlte/extras';

  type Props = {
    plane?: 'xy' | 'xz' | 'yz';
    position?: [number, number, number];
    scale?: number;
  };

  const { plane = 'xy', position = [0, 0, -0.01], scale = 2 }: Props = $props();
</script>

<Grid
  {plane}
  {position}
  {scale}
  cellColor="#cbd5e1"
  sectionColor="#94a3b8"
  cellSize={0.1}
  sectionSize={0.5}
  cellThickness={0.5}
  sectionThickness={0.8}
  infiniteGrid={true}
  fadeDistance={5}
  fadeStrength={1.6}
/>
