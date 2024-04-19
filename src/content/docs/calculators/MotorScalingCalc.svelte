<script>
  import { Canvas } from '@threlte/core';
  import { T } from '@threlte/core';
  import { Grid, OrbitControls, interactivity } from '@threlte/extras';
  import Tree from '~/components/model/Tree.svelte';
  import Servo from '~/components/model/hf-sp421.svelte';

  let requiredAxialSpeed = 300;
  let requiredAxialForce = 1000;
  const ballScrew = {
    '1605': {
      pitch: 5,
      diameter: 16,
    },
    '1610': {
      pitch: 10,
      diameter: 16,
    },
  };
  let driveRatio = 1;
  let selectedBallScrew = '1605';
  $: requiredRPM = () => {
    return (requiredAxialSpeed * 60 * driveRatio) / ballScrew[selectedBallScrew].pitch;
  };
  $: requiredTorque = () => {
    return (requiredAxialForce * ballScrew[selectedBallScrew].pitch) / 1000 / (2 * Math.PI * driveRatio);
  };
</script>

<div class="w-full">
  <form class="">
    <div>
      <label for="requiredAxialSpeed">Required axial speed</label>
      <input type="number" id="requiredAxialSpeed" bind:value={requiredAxialSpeed} />
    </div>
    <div>
      <label for="requiredAxialForce">Required axial force</label>
      <input type="number" id="requiredAxialForce" bind:value={requiredAxialForce} />
    </div>
    <div>
      <label for="ballScrew">Ballscrew Pitch</label>
      <select id="ballScrew" bind:value={selectedBallScrew}>
        {#each Object.entries(ballScrew) as [bs, _]}
          <option value={bs} selected={selectedBallScrew === bs}>{bs}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="driveRatio">Drive ratio</label>
      <input type="number" id="driveRation" bind:value={driveRatio} />
    </div>
    {requiredRPM()}
    {requiredTorque()}
  </form>
</div>
