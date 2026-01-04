import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchFilterBarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchFilterBar({ 
  onSearch, 
  placeholder = "输入关键字...", 
  initialValue = "" 
}: SearchFilterBarProps) {
  const [inputValue, setInputValue] = useState(initialValue);

  const handleConfirm = () => {
    onSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue("");
    onSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <div className="flex gap-3 w-full">
      <div className="relative flex-1 group">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-12 rounded-2xl border-none bg-zinc-100 px-6 font-bold text-sm focus-visible:ring-2 focus-visible:ring-zinc-200 transition-all shadow-inner"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button
        onClick={handleConfirm}
        className="h-12 px-8 rounded-2xl bg-zinc-900 text-white font-bold text-xs gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
      >
        <Search className="h-4 w-4" />
        确认搜索
      </Button>
    </div>
  );
}