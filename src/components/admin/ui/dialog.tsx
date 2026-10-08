"use client";
import * as React from "react";
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";

const overlayClass =
  "fixed inset-0 z-50 bg-[#1a120a]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/* ---------- Dialog ---------- */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl border bg-popover p-6 text-popover-foreground shadow-2xl duration-200 outline-none admin-scroll",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground opacity-80 transition hover:bg-accent hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-6", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg leading-tight font-bold", className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/* ---------- Sheet (side panel) ---------- */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "right" | "left" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-full flex-col bg-popover text-popover-foreground shadow-2xl transition ease-in-out outline-none data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
          side === "right"
            ? "right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-xl"
            : "left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-xs",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 border-b px-6 py-5 pr-14", className)} {...props} />;
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("admin-scroll flex-1 overflow-y-auto px-6 py-5", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap justify-end gap-2 border-t bg-muted/40 px-6 py-4", className)} {...props} />;
}

const SheetTitle = DialogTitle;
const SheetDescription = DialogDescription;

/* ---------- Alert dialog ---------- */
const AlertDialog = AlertPrimitive.Root;

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className={overlayClass} />
      <AlertPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-popover p-6 text-popover-foreground shadow-2xl duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </AlertPrimitive.Portal>
  );
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Title>) {
  return <AlertPrimitive.Title className={cn("text-lg font-bold", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Description>) {
  return <AlertPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function AlertDialogAction({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Action> & { destructive?: boolean }) {
  return (
    <AlertPrimitive.Action
      className={cn(buttonVariants({ variant: destructive ? "destructive" : "default" }), className)}
      {...props}
    />
  );
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Cancel>) {
  return <AlertPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
