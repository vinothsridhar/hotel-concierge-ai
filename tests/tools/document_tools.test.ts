import { describe, expect, it } from 'vitest';
import { getAmenitiesInfo, getDiningInfo, getRoomInfo } from '../../src/tools/document_tools';

describe('document tools', () => {
  it('returns room information from rooms.md', () => {
    const result = getRoomInfo('what rooms do you have?');

    expect(result).toContain('Standard Room');
    expect(result).toContain('$150');
  });

  it('returns dining information from menus.md', () => {
    const result = getDiningInfo('restaurant dining options');

    expect(result).toContain('Restaurant');
  });

  it('returns amenities information from amenities.md', () => {
    const result = getAmenitiesInfo('pool gym spa amenities');

    expect(result).toContain('Pool');
  });
});
