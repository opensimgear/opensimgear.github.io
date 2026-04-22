import * as Sentry from '@sentry/astro';

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://8453bfdc55a4896cbb5cfbe9f8b669a6@o4511237018681344.ingest.de.sentry.io/4511237021565008',
    sendDefaultPii: false,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ['error'] }),
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
      Sentry.feedbackIntegration({
        // Additional SDK configuration goes in here, for example:
        colorScheme: 'system',
      }),
    ],
    enableLogs: true,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
