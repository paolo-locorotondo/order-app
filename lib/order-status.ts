import { OrderStatus } from "@/app/generated/prisma/enums";

/** Etichette italiane leggibili per l'enum `OrderStatus`. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    [OrderStatus.IN_ATTESA]: "In attesa",
    [OrderStatus.CONFERMATO]: "Confermato",
    [OrderStatus.SPEDITO]: "Spedito",
    [OrderStatus.PAGATO_DA_CONSEGNARE]: "Pagato da consegnare",
    [OrderStatus.CONSEGNATO_DA_PAGARE]: "Consegnato da pagare",
    [OrderStatus.CONSEGNATO_E_PAGATO]: "Consegnato e pagato",
    [OrderStatus.ANNULLATO]: "Annullato",
};

/** Classi Tailwind background+text per badge di status. */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    [OrderStatus.IN_ATTESA]: "bg-yellow-100 text-yellow-900",
    [OrderStatus.CONFERMATO]: "bg-cyan-100 text-cyan-900",
    [OrderStatus.SPEDITO]: "bg-purple-100 text-purple-900",
    [OrderStatus.PAGATO_DA_CONSEGNARE]: "bg-blue-100 text-blue-900",
    [OrderStatus.CONSEGNATO_DA_PAGARE]: "bg-orange-100 text-orange-900",
    [OrderStatus.CONSEGNATO_E_PAGATO]: "bg-green-100 text-green-900",
    [OrderStatus.ANNULLATO]: "bg-red-100 text-red-900",
};

export const orderStatusLabel = (s: OrderStatus): string => ORDER_STATUS_LABELS[s] ?? s;
export const orderStatusColor = (s: OrderStatus): string =>
    ORDER_STATUS_COLORS[s] ?? "bg-gray-100 text-gray-900";
