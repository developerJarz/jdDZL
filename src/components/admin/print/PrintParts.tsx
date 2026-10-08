"use client";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function PrintToolbar({ auto = false, label = "Print" }: { auto?: boolean; label?: string }) {
  useEffect(() => {
    if (auto) setTimeout(() => window.print(), 400);
  }, [auto]);
  return (
    <div className="print-toolbar">
      <button type="button" onClick={() => window.print()}>
        {label}
      </button>
      <button type="button" className="ghost" onClick={() => window.close()}>
        Close
      </button>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, { format: "CODE128", width: 1.4, height: 38, fontSize: 11, margin: 0, displayValue: true });
    } catch {
      ref.current.innerHTML = "";
    }
  }, [value]);
  return <svg ref={ref} role="img" aria-label={`Barcode ${value}`} />;
}

/** 38 × 25 mm style labels in a grid; print on label sheets or a label printer. */
export function BarcodeSheet({ store, labels }: { store: string; labels: { name: string; code: string; price: number }[] }) {
  return (
    <main className="labels-page">
      <PrintToolbar label={`Print ${labels.length} labels`} />
      <div className="labels">
        {labels.map((l, i) => (
          <div className="label" key={i}>
            <p className="label-store">{store}</p>
            <p className="label-name">{l.name}</p>
            <Barcode value={l.code} />
            <p className="label-price">৳{Math.round(l.price).toLocaleString("en-BD")}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
