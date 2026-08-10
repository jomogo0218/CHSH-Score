export const SUPPLY_ITEMS = [
  {
    id: "cleaner",
    label: "刷洗廁所清潔劑",
    hint: "學務處領取",
  },
  {
    id: "bin-bag",
    label: "廁所小垃圾桶塑膠袋",
    hint: "學務處領取",
  },
  {
    id: "soap",
    label: "洗手台肥皂",
    hint: "學務處領取",
  },
] as const;

export type SupplyItemId = (typeof SUPPLY_ITEMS)[number]["id"];

export const SUPPLY_STATUS_LABELS = {
  pending: "待處理",
  ready: "可領取",
  done: "已領取",
  rejected: "未通過",
} as const;

export function supplyItemById(id: string) {
  return SUPPLY_ITEMS.find((item) => item.id === id) ?? null;
}
