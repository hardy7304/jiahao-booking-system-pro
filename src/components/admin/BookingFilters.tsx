import { useState } from "react";
import { format } from "date-fns";
import { Search, X, CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface BookingFilters {
  search: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  category: string;
  status: string;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "全部服務" },
  { value: "foot", label: "腳底按摩" },
  { value: "body", label: "全身指壓" },
  { value: "fascia", label: "筋膜刀" },
  { value: "package", label: "套餐" },
  { value: "combo", label: "深層雙拼" },
];

export default function BookingFiltersBar({
  filters,
  onChange,
  resultCount,
}: {
  filters: BookingFilters;
  onChange: (f: BookingFilters) => void;
  resultCount: number;
}) {
  const hasFilters =
    filters.search || filters.dateFrom || filters.dateTo || filters.category !== "all" || filters.status !== "all";

  const clearFilters = () =>
    onChange({ search: "", dateFrom: undefined, dateTo: undefined, category: "all", status: "all" });

  return (
    <div className="bg-card rounded-xl shadow p-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋姓名或電話..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left", !filters.dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {filters.dateFrom ? format(filters.dateFrom, "M/d") : "起始日"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.dateFrom} onSelect={(d) => onChange({ ...filters, dateFrom: d })} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">~</span>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left", !filters.dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {filters.dateTo ? format(filters.dateTo, "M/d") : "結束日"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.dateTo} onSelect={(d) => onChange({ ...filters, dateTo: d })} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Category */}
        <Select value={filters.category} onValueChange={(v) => onChange({ ...filters, category: v })}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">有效預約</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" /> 清除
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        找到 <span className="font-medium text-foreground">{resultCount}</span> 筆預約
      </div>
    </div>
  );
}
