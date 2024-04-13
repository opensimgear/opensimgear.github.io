<script>
  import * as CookieConsent from 'vanilla-cookieconsent';

  export let label = '';

  function showCookiePreferences(e) {
    e.preventDefault();
    debugger;
    CookieConsent.showPreferences();
  }
</script>

<button type="button" class="" on:click={showCookiePreferences}>{label}</button>
