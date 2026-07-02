// Ambient module declaration for plain (non-module) CSS side-effect imports,
// e.g. `import "./globals.css"` in app/layout.tsx.
// Next's own type declarations only cover `*.module.css`, so editors running
// with `noUncheckedSideEffectImports` enabled flag plain CSS imports (TS2882)
// without this.
declare module "*.css";
