import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

let fontDataPromise: Promise<Buffer> | null = null;

function loadFont() {
  if (!fontDataPromise) {
    fontDataPromise = readFile(
      path.join(process.cwd(), "src/app/fonts/ibm-plex-sans-thai-bold.ttf")
    );
  }
  return fontDataPromise;
}

// Baht-sign app icon on the app's dark-theme background/accent pair
// (--bg / --accent from globals.css), so the icon reads as this app's
// own colors rather than an invented palette.
export async function renderBahtIcon(size: number) {
  const fontData = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16171b",
        }}
      >
        <div
          style={{
            fontFamily: "IBM Plex Sans Thai",
            fontSize: size * 0.62,
            color: "#7c97f0",
            lineHeight: 1,
          }}
        >
          ฿
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "IBM Plex Sans Thai", data: fontData, weight: 700 }],
    }
  );
}
