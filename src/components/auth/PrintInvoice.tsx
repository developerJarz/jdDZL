"use client";
export function PrintInvoice() {
  return (
    <button className="invoice-print" onClick={() => window.print()}>
      Print / save PDF
    </button>
  );
}
