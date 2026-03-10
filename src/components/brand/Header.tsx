import Image from "next/image";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showDoneButton?: boolean;
  onDone?: () => void;
  isDoneLoading?: boolean;
}

export function Header({ showDoneButton = false, onDone, isDoneLoading = false }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-10 sm:h-12 shrink-0">
          <Image
            src="/assets/logo.png"
            alt="Accident Payments"
            width={180}
            height={48}
            className="h-10 sm:h-12 w-auto object-contain"
            priority
          />
        </div>
        <div className="hidden sm:block h-8 w-px bg-[var(--ap-border)]" />
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-semibold text-zinc-900">
            Document Upload Portal
          </div>
        </div>
      </div>
      {showDoneButton && (
        <Button
          onClick={onDone}
          disabled={isDoneLoading}
          className="shrink-0 bg-[var(--ap-accent)] hover:bg-[var(--ap-accent-dark)] text-white"
        >
          {isDoneLoading ? "Finishing..." : "Done"}
        </Button>
      )}
    </header>
  );
}
