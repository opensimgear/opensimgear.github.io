export type PlannerExportSections = {
  image: boolean;
  visualLayout: boolean;
  purchaseSummary: boolean;
};

type PlannerPrintDocumentInput = {
  title: string;
  subtitle: string;
  imageAlt: string;
  imageUrl: string;
  purchaseSummaryHtml: string;
  sections: PlannerExportSections;
  stylesheetsHtml: string;
  visualLayoutHtml: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSection(title: string, className: string, html: string) {
  return `
    <section class="planner-export__section ${className}">
      <div class="planner-export__section-label">${escapeHtml(title)}</div>
      ${html}
    </section>
  `;
}

export function hasSelectedPlannerExportSections(sections: PlannerExportSections) {
  return Object.values(sections).some(Boolean);
}

export function buildPlannerPrintDocument({
  title,
  subtitle,
  imageAlt,
  imageUrl,
  purchaseSummaryHtml,
  sections,
  stylesheetsHtml,
  visualLayoutHtml,
}: PlannerPrintDocumentInput) {
  const sectionMarkup = [
    sections.image && imageUrl
      ? `
        <section class="planner-export__hero">
          <img class="planner-export__hero-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" />
        </section>
      `
      : '',
    sections.visualLayout ? renderSection('Visual Cut Layout', 'planner-export-layout', visualLayoutHtml) : '',
    sections.purchaseSummary ? renderSection('Purchase Summary', 'planner-export-summary', purchaseSummaryHtml) : '',
  ].join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} Export</title>
    ${stylesheetsHtml}
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #111827;
      }

      body {
        font-family:
          'Inter',
          'Segoe UI',
          sans-serif;
      }

      .planner-export {
        width: min(100%, 1120px);
        margin: 0 auto;
        padding: 28px 32px 40px;
      }

      .planner-export__header {
        margin-bottom: 1.25rem;
      }

      .planner-export__title {
        margin: 0;
        font-size: 1.55rem;
        line-height: 1.1;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: #0f172a;
      }

      .planner-export__subtitle {
        margin: 0.45rem 0 0;
        font-size: 0.82rem;
        line-height: 1.4;
        color: #475569;
      }

      .planner-export__hero {
        margin-bottom: 1.5rem;
      }

      .planner-export__hero-image {
        display: block;
        width: 100%;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 0.75rem;
        background: #f8fafc;
      }

      .planner-export__section {
        margin-top: 1.25rem;
        break-inside: avoid;
      }

      .planner-export__section-label {
        margin-bottom: 0.65rem;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #475569;
      }

      .planner-export .planner-export-controls,
      .planner-export .waste-tooltip,
      .planner-export .waste-tooltip-trigger__help,
      .planner-export script {
        display: none !important;
      }

      .planner-export .overflow-x-auto,
      .planner-export .overflow-hidden {
        overflow: visible !important;
      }

      .planner-export .planner-export-summary,
      .planner-export .planner-export-summary > div {
        width: auto !important;
        min-width: 0 !important;
      }

      .planner-export .planner-export-summary table {
        width: 100% !important;
        min-width: max-content !important;
        white-space: nowrap !important;
      }

      .planner-export .planner-export-summary table {
        table-layout: auto;
      }

      .planner-export .planner-export-layout button,
      .planner-export .planner-export-summary button {
        cursor: default !important;
      }

      .planner-export .planner-export-layout .widget-card__header,
      .planner-export .planner-export-summary .widget-card__header {
        padding-left: 0.85rem;
        padding-right: 0.85rem;
      }

      @page {
        margin: 14mm;
      }

      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .planner-export {
          width: 100%;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="planner-export">
      <header class="planner-export__header">
        <h1 class="planner-export__title">${escapeHtml(title)}</h1>
        <p class="planner-export__subtitle">${escapeHtml(subtitle)}</p>
      </header>
      ${sectionMarkup}
    </main>
    <script>
      window.addEventListener('load', async () => {
        const images = Array.from(document.images).filter((image) => !image.complete);
        await Promise.all(
          images.map(
            (image) =>
              new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              })
          )
        );
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        window.requestAnimationFrame(() => {
          window.print();
        });
      });
    </script>
  </body>
</html>`;
}
