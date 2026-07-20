import fs from "fs";
import path from "path";

const FONT_DIR = path.resolve("assets/fonts");

export const generateFontCSS = (requiredFamilies = []) => {
  let css = "";
  if (!fs.existsSync(FONT_DIR)) return css;

  const allFamilies = fs.readdirSync(FONT_DIR);

  // Filter families based on requirement to avoid huge HTML
  const familiesToProcess = requiredFamilies.length > 0
    ? allFamilies.filter(f => requiredFamilies.includes(f))
    : allFamilies.slice(0, 5); // Default to first few if none specified to avoid overflow

  familiesToProcess.forEach((family) => {
    const familyPath = path.join(FONT_DIR, family);

    if (!fs.existsSync(familyPath) || !fs.statSync(familyPath).isDirectory()) return;

    const files = fs.readdirSync(familyPath);

    files.forEach((file) => {
      if (!file.endsWith(".ttf")) return;
      const fullPath = path.join(familyPath, file);

      try {
        const fontBuffer = fs.readFileSync(fullPath);
        const base64Font = fontBuffer.toString("base64");

        let weight = "normal";
        let style = "normal";

        const lowFile = file.toLowerCase();
        if (lowFile.includes("bold")) weight = "bold";
        if (lowFile.includes("italic")) style = "italic";
        if (lowFile.includes("light")) weight = "300";
        if (lowFile.includes("medium")) weight = "500";
        if (lowFile.includes("semibold")) weight = "600";
        if (lowFile.includes("extrabold")) weight = "800";
        if (lowFile.includes("black")) weight = "900";
        if (lowFile.includes("thin")) weight = "100";

        css += `
        @font-face {
          font-family: '${family}';
          src: url('data:font/ttf;base64,${base64Font}') format('truetype');
          font-weight: ${weight};
          font-style: ${style};
          font-display: block;
        }`;
      } catch (err) {
        console.error(`❌ Error reading font ${file}:`, err.message);
      }
    });
  });

  return css;
};
