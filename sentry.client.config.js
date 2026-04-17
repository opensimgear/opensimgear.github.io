import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: 'https://8453bfdc55a4896cbb5cfbe9f8b669a6@o4511237018681344.ingest.de.sentry.io/4511237021565008',
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  integrations: [Sentry.replayIntegration()],
  // Enable logs to be sent to Sentry
  enableLogs: true,
  // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysSessionSampleRate: 0.1,
  // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  replaysOnErrorSampleRate: 1.0,
});
