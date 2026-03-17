import Image from "next/image";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showDoneButton?: boolean;
  onDone?: () => void;
  isDoneLoading?: boolean;
}

export function Header({ showDoneButton = false, onDone, isDoneLoading = false }: HeaderProps) {
  return (
    <header className="relative flex items-center justify-center">
      <div className="h-10 sm:h-12">
        <Image
          src="/assets/logo.png"
          alt="Accident Payments"
          width={180}
          height={48}
          className="h-10 sm:h-12 w-auto object-contain"
          priority
        />
      </div>

      {showDoneButton && (
        <Button
          onClick={onDone}
          disabled={isDoneLoading}
          className="absolute right-0 bg-[var(--ap-accent)] hover:bg-[var(--ap-accent-dark)] text-white"
        >
          {isDoneLoading ? "Finishing..." : "Done"}
        </Button>
      )}
    </header>
  );
}
