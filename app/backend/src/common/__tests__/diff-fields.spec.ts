import { diffFields } from '../diff-fields';

describe('diffFields', () => {
  it('lists only the fields that really change', () => {
    expect(diffFields({ title: 'a', priority: 1, status: 'open' }, { title: 'b', priority: 1 })).toEqual({
      title: { from: 'a', to: 'b' },
    });
  });

  it('treats null and undefined as the same, and ignores identity and position fields', () => {
    expect(diffFields({ description: null }, { description: undefined, position: 3, id: 9, ownerId: 4 })).toEqual({});
  });

  it('compares dates by instant whether they are Dates or ISO strings', () => {
    const d = new Date('2026-05-01T10:00:00.000Z');
    expect(diffFields({ dueDate: d }, { dueDate: '2026-05-01T10:00:00.000Z' })).toEqual({});
    expect(diffFields({ dueDate: d }, { dueDate: '2026-05-02T10:00:00.000Z' })).toEqual({
      dueDate: { from: '2026-05-01T10:00:00.000Z', to: '2026-05-02T10:00:00.000Z' },
    });
  });

  it('notices a change after the shortened part of long text, and shortens only what it shows', () => {
    const base = 'x'.repeat(300);
    const out = diffFields({ description: base }, { description: base + 'y' });
    expect((out.description.from as string).length).toBe(201);
    expect((out.description.to as string).endsWith('…')).toBe(true);
  });
});
