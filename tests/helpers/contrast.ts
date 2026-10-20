import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

// Composite transparent backgrounds; pass gradient endpoints explicitly where used.
export async function readable(locator: Locator, options: { pseudo?: string; background?: string } = {}) {
  await expect(locator).toBeVisible();
  const result = await locator.evaluate((element, options) => {
    const doc = element.ownerDocument;
    const view = doc.defaultView!;
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    function rgba(color: string): number[] {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    }
    function over(front: number[], back: number[]) {
      return front.slice(0, 3).map((value, index) => value * front[3] / 255 + back[index] * (1 - front[3] / 255)).concat(255);
    }
    const ancestors: Element[] = [];
    for (let current: Element | null = element; current; current = current.parentElement) ancestors.unshift(current);
    let background = [255, 255, 255, 255];
    for (const ancestor of ancestors) background = over(rgba(view.getComputedStyle(ancestor).backgroundColor), background);
    if (options.background) {
      const probe = doc.createElement('span');
      probe.style.backgroundColor = options.background;
      element.appendChild(probe);
      background = over(rgba(view.getComputedStyle(probe).backgroundColor), background);
      probe.remove();
    }
    const style = view.getComputedStyle(element, options.pseudo);
    const foreground = rgba(style.color);
    foreground[3] *= ancestors.reduce((opacity, ancestor) => opacity * Number(view.getComputedStyle(ancestor).opacity), 1);
    if (options.pseudo) foreground[3] *= Number(style.opacity);
    function luminance(color: number[]) {
      const rgb = color.slice(0, 3).map(value => {
        const channel = value / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    }
    const text = luminance(over(foreground, background));
    const surface = luminance(background);
    return { ratio: (Math.max(text, surface) + .05) / (Math.min(text, surface) + .05), color: style.color, background, label: element.className };
  }, options);
  expect(result.ratio, JSON.stringify(result)).toBeGreaterThanOrEqual(4.5);
}
