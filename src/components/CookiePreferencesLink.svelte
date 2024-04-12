<script>
  import * as CookieConsent from 'vanilla-cookieconsent';

  export let label = '';

  function showCookiePreferences(e) {
    e.preventDefault();
    CookieConsent.showPreferences();
  }
</script>

<button type="button" class="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none" on:click={showCookiePreferences}>{label}</button>
