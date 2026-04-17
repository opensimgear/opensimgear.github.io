import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://8453bfdc55a4896cbb5cfbe9f8b669a6@o4511237018681344.ingest.de.sentry.io/4511237021565008',
  sendDefaultPii: false,
  integrations: [Sentry.replayIntegration()],
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
