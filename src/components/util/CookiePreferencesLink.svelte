<script lang="ts">
  import * as CookieConsent from 'vanilla-cookieconsent';
  let { label = '' }: { label?: string } = $props();
</script>

<button type="button" class="btn-primary" onclick={CookieConsent.showPreferences}>{label}</button>
