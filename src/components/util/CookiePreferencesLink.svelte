<script lang="ts">
  import * as CookieConsent from 'vanilla-cookieconsent';

  let { label = '' }: { label?: string } = $props();

  function showCookiePreferences(event: MouseEvent) {
    event.preventDefault();
    CookieConsent.showPreferences();
  }
</script>

<button type="button" class="" onclick={showCookiePreferences}>{label}</button>
