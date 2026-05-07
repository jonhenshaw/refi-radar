import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver. Tests rely on the chart frame having a
// non-zero width before SVG renders, so we stub a fixed-size observer here.
class ResizeObserverStub {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element): void {
    queueMicrotask(() => {
      const entry = {
        target,
        contentRect: { width: 920, height: 340, top: 0, left: 0, right: 920, bottom: 340, x: 0, y: 0, toJSON: () => ({}) },
        borderBoxSize: [{ inlineSize: 920, blockSize: 340 }],
        contentBoxSize: [{ inlineSize: 920, blockSize: 340 }],
        devicePixelContentBoxSize: [{ inlineSize: 920, blockSize: 340 }],
      } as unknown as ResizeObserverEntry;
      this.callback([entry], this as unknown as ResizeObserver);
    });
  }
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;

// jsdom returns a 0-sized rect. Force a sane fallback so chart code can compute scales.
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
  const rect = originalGetBoundingClientRect.call(this);
  if (rect.width === 0 && rect.height === 0) {
    const fake = { x: 0, y: 0, top: 0, left: 0, right: 920, bottom: 340, width: 920, height: 340 };
    return { ...fake, toJSON: () => fake } as DOMRect;
  }
  return rect;
};

// jsdom doesn't reliably implement pointer capture; provide no-op fallbacks.
const elementProto = Element.prototype as unknown as {
  setPointerCapture?: (id: number) => void;
  releasePointerCapture?: (id: number) => void;
  hasPointerCapture?: (id: number) => boolean;
};
if (!elementProto.setPointerCapture) elementProto.setPointerCapture = () => {};
if (!elementProto.releasePointerCapture) elementProto.releasePointerCapture = () => {};
if (!elementProto.hasPointerCapture) elementProto.hasPointerCapture = () => false;

// PointerEvent in jsdom 29 lacks the constructor signature React's synthetic events expect.
// Synthesize one from MouseEvent so fireEvent.pointerDown/Move/Up work.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    pressure: number;
    isPrimary: boolean;
    width: number;
    height: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
      this.pressure = init.pressure ?? 0;
      this.isPrimary = init.isPrimary ?? true;
      this.width = init.width ?? 1;
      this.height = init.height ?? 1;
      this.tiltX = init.tiltX ?? 0;
      this.tiltY = init.tiltY ?? 0;
      this.twist = init.twist ?? 0;
    }
  }
  (globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill;
}

// Native <dialog>.showModal is not implemented in jsdom; stub it.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
      (this as unknown as { open: boolean }).open = true;
    };
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.setAttribute('open', '');
      (this as unknown as { open: boolean }).open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
      (this as unknown as { open: boolean }).open = false;
    };
  }
}
