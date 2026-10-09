/** Keep customer totals and tracking while excluding internal purchasing and staff details. */
export function customerOrderView<T extends object>(value: T): T {
  const result = { ...value } as Record<string, unknown>;
  for (const key of ["ip", "assignedTo", "actorId", "createdBy", "internalNotes"]) delete result[key];
  for (const key of ["items", "lines"]) {
    if (Array.isArray(result[key])) result[key] = result[key].map(item => {
      const publicItem = { ...item };
      delete publicItem.cost;
      return publicItem;
    });
  }
  if (Array.isArray(result.payments)) result.payments = result.payments.map(payment => {
    const publicPayment = { ...payment };
    delete publicPayment.actorId;
    return publicPayment;
  });
  return result as T;
}
