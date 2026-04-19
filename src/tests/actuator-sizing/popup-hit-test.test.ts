import { describe, expect, it } from 'vitest';
import {
  isPointInsidePopupBounds,
  shouldSwallowPopupClick,
} from '../../components/calculator/actuator-sizing/popup-hit-test';

describe('isPointInsidePopupBounds', () => {
  it('returns false when popup bounds missing', () => {
    expect(isPointInsidePopupBounds(10, 20, null)).toBe(false);
  });

  it('returns true for points inside popup bounds', () => {
    expect(isPointInsidePopupBounds(110, 220, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(true);
  });

  it('treats popup edges as inside', () => {
    expect(isPointInsidePopupBounds(100, 150, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(true);
    expect(isPointInsidePopupBounds(200, 300, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(true);
  });

  it('returns false for points outside popup bounds', () => {
    expect(isPointInsidePopupBounds(99, 220, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(false);
    expect(isPointInsidePopupBounds(201, 220, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(false);
    expect(isPointInsidePopupBounds(110, 149, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(false);
    expect(isPointInsidePopupBounds(110, 301, { left: 100, right: 200, top: 150, bottom: 300 })).toBe(false);
  });
});

describe('shouldSwallowPopupClick', () => {
  it('returns false when blocked point missing', () => {
    expect(shouldSwallowPopupClick(null, 100, 200, 300)).toBe(false);
  });

  it('returns true for click near blocked popup press', () => {
    expect(shouldSwallowPopupClick({ x: 100, y: 200, timeStamp: 1000 }, 106, 205, 1500)).toBe(true);
  });

  it('returns false when click drifts too far', () => {
    expect(shouldSwallowPopupClick({ x: 100, y: 200, timeStamp: 1000 }, 109, 200, 1500)).toBe(false);
    expect(shouldSwallowPopupClick({ x: 100, y: 200, timeStamp: 1000 }, 100, 209, 1500)).toBe(false);
  });

  it('returns false when click arrives too late', () => {
    expect(shouldSwallowPopupClick({ x: 100, y: 200, timeStamp: 1000 }, 104, 204, 2001)).toBe(false);
  });
});
