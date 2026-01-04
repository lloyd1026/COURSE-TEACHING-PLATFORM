import { Search } from "lucide-react";

/**
 * 2. 状态切换标签 (FilterTabs)
 * 用于“全部/进行中/草稿”等互斥状态切换
 */
export function FilterTabs({ options, value, onChange }: {
  options: { label: string; value: any }[];
  value: any;
  onChange: (val: any) => void;
}) {
  return (
    <div className="flex bg-white/40 backdrop-blur-xl border border-white/60 p-1 rounded-2xl gap-1 shadow-sm">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-xl text-[11px] transition-all whitespace-nowrap ${
            value === opt.value ? "bg-zinc-900 text-white shadow-sm font-medium" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 3. 横向滚动筛选条 (FilterSlider)
 * 用于课程、班级、年份等较多选项的横向滑动
 */
export function FilterSlider({ 
  label, 
  options, 
  value, 
  onChange, 
  searchPlaceholder, 
  onSearchChange, 
  searchValue 
}: {
  label?: string;
  options: { label: string; value: any }[];
  value: any;
  onChange: (val: any) => void;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
}) {
  return (
    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
      {onSearchChange && (
        <div className="relative flex-shrink-0 w-32 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-zinc-300 group-focus-within:text-zinc-500" />
          <input
            placeholder={searchPlaceholder}
            className="w-full pl-7 pr-2 h-7 rounded-full border border-white/60 bg-white/40 text-[10px] focus:outline-none focus:ring-1 focus:ring-zinc-200 transition-all"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      
      {label && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex-shrink-0 ml-1">{label}</span>}
      
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`px-5 py-1.5 rounded-full text-[10px] whitespace-nowrap transition-all hover:scale-105 active:scale-95 ${
              value === opt.value ? "bg-zinc-900 text-white shadow-md font-medium" : "bg-white/60 text-zinc-500 border border-white/60 hover:bg-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}