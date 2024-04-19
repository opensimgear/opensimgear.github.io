<script lang="ts">
  export let label = 'Label';
  export let value = 0;
  export let step = 1;
  export let unit = 'unit';
  export let initVal = 0;

  const handleWheel = (event: any) => {
    event.preventDefault(); // Prevent the page from scrolling
    const delta = event.deltaY;
    if (delta < 0) {
      value += step; // Scroll up to increase
    } else {
      value -= step; // Scroll down to decrease
    }
  };

  const reset = () => {
    value = initVal;
  };
</script>

<div class="flex rounded-lg shadow-sm relative">
  <span
    class="w-32 px-4 inline-flex items-center min-w-fit rounded-s-md border border-e-0 border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-neutral-700 dark:border-neutral-700 dark:text-neutral-400"
    >{label}</span
  >
  <input
    type="text"
    class="py-2 px-3 pe-11 block w-full border-gray-200 shadow-sm text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
    bind:value
    on:wheel={handleWheel}
  />
  <span class="absolute right-16 py-3 text-neutral-400 text-sm">{unit}</span>
  <button
    type="button"
    class="w-[2.875rem] h-[2.875rem] flex-shrink-0 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-e-md border border-transparent bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
    on:click={reset}
  >
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g
        fill="none"
        fill-rule="evenodd"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        transform="matrix(0 1 1 0 2.5 2.5)"
      >
        <path
          d="m3.98652376 1.07807068c-2.38377179 1.38514556-3.98652376 3.96636605-3.98652376 6.92192932 0 4.418278 3.581722 8 8 8s8-3.581722 8-8-3.581722-8-8-8"
        />
        <path d="m4 1v4h-4" transform="matrix(1 0 0 -1 0 6)" />
      </g>
    </svg>
  </button>
</div>
