import React, { createContext, useContext, useState, useEffect } from 'react';
import { LojaProduto } from '@/services/LojaService';
import { toast } from 'sonner';

export interface LojaCartItem {
  product: LojaProduto;
  quantity: number;
}

interface LojaCartContextType {
  items: LojaCartItem[];
  addItem: (product: LojaProduto, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const LojaCartContext = createContext<LojaCartContextType | undefined>(undefined);

const STORAGE_KEY = 'tibim_loja_cart_v1';

export const LojaCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<LojaCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage quota errors
    }
  }, [items]);

  const addItem = (product: LojaProduto, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty, product } : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    toast.success(`${product.nome} adicionado ao carrinho!`, {
      action: {
        label: 'Ver Carrinho',
        onClick: () => setIsDrawerOpen(true)
      }
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    toast.info('Produto removido do carrinho');
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as LojaCartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.preco * i.quantity, 0);

  return (
    <LojaCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isDrawerOpen,
        setIsDrawerOpen
      }}
    >
      {children}
    </LojaCartContext.Provider>
  );
};

export const useLojaCart = () => {
  const ctx = useContext(LojaCartContext);
  if (!ctx) {
    throw new Error('useLojaCart must be used within LojaCartProvider');
  }
  return ctx;
};
