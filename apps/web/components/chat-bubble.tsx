import type { ApiMessage } from "@/types";
import { cn, formatRelativeDate } from "@/lib/format";

export function ChatBubble({ message }: { message: ApiMessage }) {
  return (
    <div className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
          message.mine
            ? "bg-brand-navy text-white"
            : "border border-slate-200 bg-white text-slate-700",
        )}
      >
        <p>{message.content}</p>
        <p
          className={cn(
            "mt-1 text-[11px] font-semibold",
            message.mine ? "text-white/65" : "text-slate-400",
          )}
        >
          {formatRelativeDate(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
