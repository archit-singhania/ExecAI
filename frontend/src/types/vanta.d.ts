declare module "vanta/dist/vanta.net.min" {
  export type VantaNetOptions = {
    el: HTMLElement;
    THREE?: unknown;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
    backgroundAlpha?: number;
    color?: number;
    backgroundColor?: number;
  };

  export type VantaEffect = {
    destroy: () => void;
  };

  const NET: (options: VantaNetOptions) => VantaEffect;
  export default NET;
}
