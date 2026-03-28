import type { ShopItem } from "./Game";

export type ShopBadge = "limited" | "hot";

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable pseudo-random labels per item (sense of urgency). */
export function getShopItemBadge(item: ShopItem): ShopBadge | null {
  const h = hashId(item.id + item.name);
  if (h % 5 === 0) return "limited";
  if (h % 5 === 1) return "hot";
  return null;
}
