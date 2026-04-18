<script lang="ts">
  let { id, title }: { id: string; title: string } = $props();

  let isPlaying = $state(false);

  const thumbnailUrl = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
</script>

<div class="video-shell">
  {#if isPlaying}
    <iframe
      src={embedUrl}
      title={title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  {:else}
    <button type="button" class="video-trigger" aria-label={`Play ${title}`} onclick={() => (isPlaying = true)}>
      <img src={thumbnailUrl} alt={`YouTube thumbnail for ${title}`} loading="lazy" decoding="async" />
      <span class="video-overlay"></span>
      <span class="video-play" aria-hidden="true">
        <svg viewBox="0 0 68 48" role="presentation">
          <path
            d="M66.52 7.74a8 8 0 0 0-5.64-5.66C56.08.8 34 .8 34 .8s-22.08 0-26.88 1.28A8 8 0 0 0 1.48 7.74 83.4 83.4 0 0 0 .2 24a83.4 83.4 0 0 0 1.28 16.26 8 8 0 0 0 5.64 5.66C11.92 47.2 34 47.2 34 47.2s22.08 0 26.88-1.28a8 8 0 0 0 5.64-5.66A83.4 83.4 0 0 0 67.8 24a83.4 83.4 0 0 0-1.28-16.26Z"
            fill="#f03"
          />
          <path d="M45 24 27 14v20" fill="#fff" />
        </svg>
      </span>
    </button>
  {/if}
</div>

<style>
  .video-shell {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 1rem;
    background: #091117;
  }

  .video-shell iframe,
  .video-trigger,
  .video-trigger img {
    width: 100%;
    height: 100%;
  }

  .video-trigger {
    position: relative;
    display: block;
    padding: 0;
    border: 0;
    cursor: pointer;
    background: #091117;
  }

  .video-trigger img,
  .video-shell iframe {
    display: block;
    object-fit: cover;
  }

  .video-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.34));
  }

  .video-play {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4.25rem;
    transform: translate(-50%, -50%);
    transition: transform 180ms ease;
  }

  .video-trigger:hover .video-play,
  .video-trigger:focus-visible .video-play {
    transform: translate(-50%, -50%) scale(1.05);
  }

  .video-play svg {
    display: block;
    width: 100%;
    height: auto;
    filter: drop-shadow(0 0.5rem 1.25rem rgb(0 0 0 / 0.35));
  }
</style>
