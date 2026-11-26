// Images bundled by Metro: `import logo from './logo.png'` gives the asset's id for <Image source>.
declare module '*.png' {
  const id: number;
  export default id;
}
