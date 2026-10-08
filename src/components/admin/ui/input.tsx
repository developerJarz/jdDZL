import * as React from "react";
import { cn } from "../lib/utils";

const fieldBase =
  "w-full min-w-0 rounded-lg border border-input bg-card text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldBase,
        "flex h-9 px-3 py-1 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldBase, "flex field-sizing-content min-h-20 px-3 py-2", className)}
      {...props}
    />
  );
}

/** Native select styled like the other fields — used for compact filters. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(fieldBase, "h-9 cursor-pointer appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8 pl-3 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237d6851' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]", className)}
      {...props}
    />
  );
}

export { Input, Textarea, NativeSelect };
