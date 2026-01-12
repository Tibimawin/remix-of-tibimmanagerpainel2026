import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Badge } from '@/components/ui/badge';
import { Tag, Star, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Offer {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const UserOffers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Carregar ofertas válidas em tempo real
  useEffect(() => {
    const q = query(
      collection(db, 'offers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const offersData: Offer[] = [];
      querySnapshot.forEach((doc) => {
        const offerData = { id: doc.id, ...doc.data() } as Offer;

        // Filtrar ofertas que não expiraram
        if (!offerData.expirationDate || new Date(offerData.expirationDate) > new Date()) {
          offersData.push(offerData);
        }
      });
      setOffers(offersData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar ofertas:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Verificar se oferta é nova (criada nas últimas 24h)
  const isNewOffer = (createdAt: string) => {
    const offerDate = new Date(createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return offerDate > yesterday;
  };

  // Formatar preço com R$ se não tiver
  const formatPrice = (price: string) => {
    if (!price) return 'R$ 0,00';

    // Se já tem R$, retorna como está
    if (price.includes('R$')) return price;

    // Se não tem, adiciona R$ no início
    return `R$ ${price}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma promoção disponível</h3>
        <p className="text-sm text-muted-foreground">Novas ofertas aparecerão aqui em breve</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Promoções</h2>
          <p className="text-sm text-muted-foreground">Aproveite nossas ofertas especiais</p>
        </div>
      </div>

      {/* Grid de Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <div
            key={offer.id}
            onClick={() => navigate(`/oferta/${offer.id}`)}
            className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
          >
            {/* Badge "Nova" se aplicável */}
            {isNewOffer(offer.createdAt) && (
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg animate-pulse">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  NOVA
                </Badge>
              </div>
            )}

            {/* Imagem do Banner */}
            <div className="relative w-full h-72 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
              {offer.imageUrl ? (
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback se imagem não carregar  
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const priceWithCurrency = offer.price.includes('R$') ? offer.price : `R$ ${offer.price}`;
                      parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary/20 to-accent/20 text-white/80">
                          <svg class="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                          </svg>
                          <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                            <p class="text-lg font-bold uppercase mb-2">${offer.title}</p>
                            <div class="flex items-baseline gap-2">
                              <span class="text-xs font-medium opacity-80">Apenas</span>
                              <span class="text-3xl font-black">${priceWithCurrency}</span>
                            </div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                // Fallback visual se não houver imagem
                <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary/20 to-accent/20">
                  <Tag className="w-12 h-12 text-white/80 mb-3" />
                </div>
              )}

              {/* Overlay gradient sempre visível */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

              {/* Texto sobreposto - SEMPRE VISÍVEL */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-5">
                <p className="text-lg font-bold uppercase mb-2 drop-shadow-lg">
                  {offer.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium opacity-90 drop-shadow">Apenas</span>
                  <span className="text-3xl font-black drop-shadow-lg bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                    {formatPrice(offer.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Descrição aparece no hover */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 pt-20 bg-gradient-to-t from-black via-black/95 to-transparent text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10">
              <p className="text-sm font-medium line-clamp-2 opacity-90">{offer.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};