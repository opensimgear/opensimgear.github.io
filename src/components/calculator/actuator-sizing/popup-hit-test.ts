type PopupBounds = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;

type PopupClickPoint = {
  x: number;
  y: number;
  timeStamp: number;
};

const POPUP_CLICK_DISTANCE_TOLERANCE_PX = 8;
const POPUP_CLICK_TIMEOUT_MS = 1000;

export function isPointInsidePopupBounds(x: number, y: number, bounds: PopupBounds | null | undefined) {
  if (!bounds) {
    return false;
  }

  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export function shouldSwallowPopupClick(
  blockedPoint: PopupClickPoint | null | undefined,
  clickX: number,
  clickY: number,
  clickTimeStamp: number
) {
  if (!blockedPoint) {
    return false;
  }

  if (clickTimeStamp - blockedPoint.timeStamp > POPUP_CLICK_TIMEOUT_MS) {
    return false;
  }

  return (
    Math.abs(clickX - blockedPoint.x) <= POPUP_CLICK_DISTANCE_TOLERANCE_PX &&
    Math.abs(clickY - blockedPoint.y) <= POPUP_CLICK_DISTANCE_TOLERANCE_PX
  );
}
