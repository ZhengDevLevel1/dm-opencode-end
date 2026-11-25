import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { product, specs, wraps, type SpecOption, type WrapOption } from "@/data/product";

type ProductState = {
  spec: string;
  setSpec: Dispatch<SetStateAction<string>>;
  wrap: string;
  setWrap: Dispatch<SetStateAction<string>>;
  qty: number;
  setQty: Dispatch<SetStateAction<number>>;
  currentSpec: SpecOption;
  currentWrap: WrapOption;
  unitPrice: number;
  total: number;
  saved: number;
};

const Ctx = createContext<ProductState | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState("m");
  const [wrap, setWrap] = useState("mist");
  const [qty, setQty] = useState(1);

  const value = useMemo<ProductState>(() => {
    const currentSpec = specs.find((s) => s.id === spec) ?? specs[1];
    const currentWrap = wraps.find((w) => w.id === wrap) ?? wraps[0];
    const unitPrice = product.basePrice + currentSpec.priceDelta;
    return {
      spec,
      setSpec,
      wrap,
      setWrap,
      qty,
      setQty,
      currentSpec,
      currentWrap,
      unitPrice,
      total: unitPrice * qty,
      saved: (product.originalPrice - product.basePrice) * qty,
    };
  }, [spec, wrap, qty]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProduct(): ProductState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProduct must be used within <ProductProvider>");
  return ctx;
}
