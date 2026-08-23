export function directoryBenefitLabel(item) {
  const value = Number(item?.benefit_value || 0);
  if (item?.benefit_type === "percentage") return `${value}% de descuento`;
  if (item?.benefit_type === "quantity") {
    const buy = Number(item?.promotion_buy_quantity || 0);
    const pay = Number(item?.promotion_pay_quantity || 0);
    const itemName = item?.promotion_item ? ` en ${item.promotion_item}` : "";
    return buy && pay ? `${buy}x${pay}${itemName}` : "Promoción especial";
  }
  return `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value)} de descuento`;
}
