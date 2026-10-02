import { normalizeCategory } from '../src/constants/categoryFields';

/**
 * Picking the invoice template is the one decision that must NOT follow the
 * business's current category: an invoice has to reprint the way it was
 * issued. This mirrors the choice made in pdfGenerator.
 */
const resolveTemplate = (invoice: any, business: any) =>
  normalizeCategory(invoice?.businessCategory ?? business?.business_category) ===
  'PHARMA'
    ? 'pharma'
    : 'general';

describe('template choice survives a category switch', () => {
  const generalBiz = { business_category: 'GENERAL' };
  const pharmaBiz = { business_category: 'PHARMA' };

  it('an invoice issued under GENERAL still reprints as general after switching to pharma', () => {
    const issued = { businessCategory: 'GENERAL' };
    expect(resolveTemplate(issued, generalBiz)).toBe('general');
    expect(resolveTemplate(issued, pharmaBiz)).toBe('general');
  });

  it('an invoice issued under PHARMA still reprints as pharma after switching back to general', () => {
    const issued = { businessCategory: 'PHARMA' };
    expect(resolveTemplate(issued, pharmaBiz)).toBe('pharma');
    // the case that previously lost batch, expiry and free goods
    expect(resolveTemplate(issued, generalBiz)).toBe('pharma');
  });

  it('falls back to the current category for invoices stamped before this existed', () => {
    const legacy = { businessCategory: undefined };
    expect(resolveTemplate(legacy, generalBiz)).toBe('general');
    expect(resolveTemplate(legacy, pharmaBiz)).toBe('pharma');
  });

  it('treats an unknown or null stamp as general rather than throwing', () => {
    expect(resolveTemplate({ businessCategory: null }, generalBiz)).toBe('general');
    expect(resolveTemplate({ businessCategory: 'NONSENSE' }, pharmaBiz)).toBe('general');
    expect(resolveTemplate({}, {})).toBe('general');
  });

  it('a new invoice being previewed uses the current category', () => {
    // nothing stamped yet - it is created under whatever is active now
    expect(resolveTemplate({}, pharmaBiz)).toBe('pharma');
    expect(resolveTemplate({}, generalBiz)).toBe('general');
  });
});
