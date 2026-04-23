<script lang="ts">
  import { Gizmo } from '@threlte/extras';

  type Props = {
    placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    size: number;
  };

  const { placement = 'top-right', size }: Props = $props();
</script>

<Gizmo {placement} {size} />
