export const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

export function getProductImage(image: string | null | undefined): string {
  if (!image) return PRODUCT_PLACEHOLDER;
  const trimmed = image.trim();
  return trimmed === "" ? PRODUCT_PLACEHOLDER : trimmed;
}
