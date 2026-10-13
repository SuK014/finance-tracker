import { renderBahtIcon } from "@/lib/appIcon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default async function Icon() {
  return renderBahtIcon(size.width);
}
