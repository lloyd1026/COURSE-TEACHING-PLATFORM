
import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface KnowledgePointManagerProps {
    courseId: number;
    linkedKPs: any[]; // { id, name, ... }
    onLink: (id: number) => void;
    onUnlink: (relationId: number) => void;
    isLoading?: boolean;
}

export function KnowledgePointManager({
    courseId,
    linkedKPs,
    onLink,
    isLoading
}: KnowledgePointManagerProps) {
    const [open, setOpen] = useState(false);
    const { data: allPoints } = trpc.knowledge.pointsByCourse.useQuery(
        { courseId },
        { enabled: !!courseId }
    );

    // Filter out points that are already linked
    const availablePoints = allPoints?.filter(
        (kp: any) => !linkedKPs.find((linked: any) => linked.id === kp.id)
    ) || [];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                    disabled={isLoading}
                >
                    {isLoading ? "处理中..." : "添加关联知识点..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="搜索知识点..." />
                    <CommandList>
                        <CommandEmpty>未找到知识点</CommandEmpty>
                        <CommandGroup>
                            {availablePoints.map((kp: any) => (
                                <CommandItem
                                    key={kp.id}
                                    value={kp.name}
                                    onSelect={() => {
                                        onLink(kp.id);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span>{kp.name}</span>
                                        {kp.chapterTitle && <span className="text-xs text-muted-foreground">{kp.chapterTitle}</span>}
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4 opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
