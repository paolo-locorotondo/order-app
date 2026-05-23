export const CART_CHANGED_EVENT = "cart-changed";

export function notifyCartChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
  }
}
