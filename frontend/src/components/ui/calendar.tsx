"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-4",
        caption: "flex items-center justify-between px-1",
        caption_label: "text-sm font-semibold text-gray-700",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-white p-0 text-gray-600 hover:bg-amber-50 hover:text-amber-600",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7 text-xs font-medium text-muted-foreground",
        head_cell:
          "h-8 rounded-md uppercase tracking-wide flex items-center justify-center",
        row: "grid grid-cols-7 gap-1",
        cell: cn(
          "relative text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "mx-auto size-9 p-0 font-medium text-gray-700 justify-center aria-selected:opacity-100",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-60 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      styles={{
        months: { width: "100%" },
        month: { width: "100%" },
        head_row: {
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          textAlign: "center",
        },
        head_cell: {
          fontSize: "0.75rem",
          textTransform: "uppercase",
          color: "#6b7280",
        },
        row: {
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "0.25rem",
        },
        cell: {
          padding: "0.125rem 0",
          textAlign: "center",
        },
        day: {
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "0.5rem",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
