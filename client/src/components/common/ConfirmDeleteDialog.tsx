import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title = "确认删除？",
  description = "此操作不可撤销，相关数据将永久移除。",
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="z-[9999] rounded-[2rem] p-8 max-w-[280px] bg-white/95 backdrop-blur-xl border-none shadow-2xl">
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
              {isLoading ? <Loader2 className="h-5 w-5 text-red-500 animate-spin" /> : <Trash2 className="h-5 w-5 text-red-500" />}
            </div>
            <AlertDialogTitle className="text-[15px] font-medium text-zinc-900 text-center">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[11px] text-zinc-400 leading-relaxed">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-8">
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // 防止自动关闭，由业务逻辑控制关闭
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full h-10 text-[12px] font-medium w-full border-none transition-all active:scale-95"
          >
            {isLoading ? "处理中..." : "确认删除"}
          </AlertDialogAction>
          <AlertDialogCancel className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full h-10 text-[12px] font-medium w-full m-0 border-none">
            取消
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}