declare module "jspdf/dist/jspdf.es.min.js" {
  const jsPDF: new (opts?: { orientation?: "portrait" | "landscape" }) => {
    setFontSize: (n: number) => void;
    setTextColor: (r: number, g: number, b: number) => void;
    text: (s: string, x: number, y: number) => void;
    output: (t: "blob") => Blob;
  };
  export { jsPDF };
}
