
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp } from "lucide-react";

export type OrderColumn =
  | "Nome"
  | "Categoria"
  | "Tipo"
  | "Views"
  | "Temporadas"
  | "Data";

const LABELS: Record<OrderColumn, string> = {
  Nome: "Nome",
  Categoria: "Categorias",
  Tipo: "Tipo",
  Views: "Views",
  Temporadas: "Temporadas",
  Data: "Data",
};

interface OrderDropdownProps {
  selected: OrderColumn;
  direction: "asc" | "desc";
  onChange: (column: OrderColumn, direction: "asc" | "desc") => void;
}

const ORDER_OPTIONS: OrderColumn[] = [
  "Nome",
  "Categoria",
  "Tipo",
  "Views",
  "Temporadas",
  "Data",
];

export const OrderDropdown: React.FC<OrderDropdownProps> = ({
  selected,
  direction,
  onChange,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 px-4 py-2 border border-input"
        >
          Ordenar
          <span className="text-lg -ml-1">▾</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-48 z-50">
        {ORDER_OPTIONS.map((col) => (
          <DropdownMenuItem
            key={col}
            className={
              "flex items-center cursor-pointer " +
              (selected === col ? "font-bold text-primary" : "")
            }
            onClick={() =>
              onChange(
                col,
                selected === col && direction === "asc" ? "desc" : "asc"
              )
            }
          >
            {LABELS[col]}
            {selected === col &&
              (direction === "asc" ? (
                <ArrowUp
                  className="ml-auto text-muted-foreground"
                  size={16}
                  strokeWidth={2.3}
                />
              ) : (
                <ArrowDown
                  className="ml-auto text-muted-foreground"
                  size={16}
                  strokeWidth={2.3}
                />
              ))}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
