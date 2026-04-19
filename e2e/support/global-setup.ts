export default async function globalSetup() {
  if (!process.env.PLAYWRIGHT_BASE_URL?.trim()) {
    throw new Error(
      'Missing PLAYWRIGHT_BASE_URL. Run `PLAYWRIGHT_BASE_URL=https://opensimgear.github.io pnpm e2e` or set it before `playwright test`.'
    );
  }
}
