import { describe, expect, it } from 'vitest';

import {
  buildPlannerPrintDocument,
  hasSelectedPlannerExportSections,
} from '../../components/calculator/aluminum-rig-planner/export';

describe('aluminum rig planner export', () => {
  it('detects when at least one export section is selected', () => {
    expect(
      hasSelectedPlannerExportSections({
        image: false,
        visualLayout: false,
        purchaseSummary: false,
      })
    ).toBe(false);

    expect(
      hasSelectedPlannerExportSections({
        image: false,
        visualLayout: true,
        purchaseSummary: false,
      })
    ).toBe(true);
  });

  it('renders only selected print sections', () => {
    const html = buildPlannerPrintDocument({
      title: 'Rig export',
      subtitle: 'Cut plan',
      imageAlt: '3D view',
      imageUrl: 'data:image/png;base64,test',
      purchaseSummaryHtml: '<div>summary</div>',
      sections: {
        image: true,
        visualLayout: false,
        purchaseSummary: true,
      },
      stylesheetsHtml: '<style>.test{}</style>',
      visualLayoutHtml: '<div>layout</div>',
    });

    expect(html).toContain('planner-export__hero-image');
    expect(html).not.toContain('Visual Cut Layout');
    expect(html).toContain('Purchase Summary');
    expect(html).toContain('<div>summary</div>');
    expect(html).toContain('window.print()');
    expect(html).not.toContain('window.close()');
  });
});
