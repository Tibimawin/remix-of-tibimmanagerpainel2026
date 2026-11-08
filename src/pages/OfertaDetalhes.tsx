import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MessageCircle, Send, Clock, Calendar, Star, Tag } from 'lucide-react';

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

const OfertaDetalhes = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOffer = async () => {
            if (!id) {
                navigate('/');
                return;
            }

            try {
                const offerDoc = await getDoc(doc(db, 'offers', id));

                if (offerDoc.exists()) {
                    const offerData = { id: offerDoc.id, ...offerDoc.data() } as Offer;

                    // Verificar se não expirou
                    if (!offerData.expirationDate || new Date(offerData.expirationDate) > new Date()) {
                        setOffer(offerData);
                    } else {
                        navigate('/');
                    }
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error('Erro ao carregar oferta:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        loadOffer();
    }, [id, navigate]);

    const isNewOffer = (createdAt: string) => {
        const offerDate = new Date(createdAt);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return offerDate > yesterday;
    };

    const getTimeRemaining = (expirationDate?: string) => {
        if (!expirationDate) return null;

        const now = new Date();
        const expiry = new Date(expirationDate);
        const diff = expiry.getTime() - now.getTime();

        if (diff <= 0) return null;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h restantes`;
        if (hours > 0) return `${hours}h restantes`;
        return 'Expira em breve';
    };

    // Formatar preço com R$ se não tiver
    const formatPrice = (price: string) => {
        if (!price) return 'R$ 0,00';
        if (price.includes('R$')) return price;
        return `R$ ${price}`;
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-muted rounded w-1/4"></div>
                        <div className="h-96 bg-muted rounded-xl"></div>
                        <div className="h-32 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!offer) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header com botão voltar */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Dashboard
                </Button>

                {/* Card principal */}
                <Card className="modern-card p-0 overflow-hidden">
                    {/* Imagem da oferta */}
                    <div className="relative w-full h-96 bg-gradient-to-br from-gray-800 to-gray-900">
                        {offer.imageUrl ? (
                            <img
                                src={offer.imageUrl}
                                alt={offer.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                        const priceFormatted = offer.price.includes('R$') ? offer.price : `R$ ${offer.price}`;
                                        parent.innerHTML = `
                      <div class="flex flex-col items-center justify-center h-full text-white/80">
                        <svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                        </svg>
                        <span class="font-bold text-2xl">${offer.title}</span>
                        <span class="text-4xl font-black mt-4">${priceFormatted}</span>
                      </div>
                    `;
                                    }
                                }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-primary/20 to-accent/20">
                                <Tag className="w-24 h-24 text-white/80 mb-4" />
                                <span className="font-bold text-2xl text-white">{offer.title}</span>
                                <span className="text-4xl font-black mt-4 text-white">{formatPrice(offer.price)}</span>
                            </div>
                        )}

                        {/* Badge "Nova" */}
                        {isNewOffer(offer.createdAt) && (
                            <div className="absolute top-6 left-6">
                                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg text-base px-4 py-2 animate-pulse">
                                    <Star className="w-4 h-4 mr-2 fill-current" />
                                    NOVA OFERTA
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Conteúdo */}
                    <div className="p-8 space-y-6">
                        {/* Título e preço */}
                        <div className="space-y-3">
                            <h1 className="text-4xl font-bold text-foreground">{offer.title}</h1>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <span className="text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                    {formatPrice(offer.price)}
                                </span>

                                {offer.expirationDate && (
                                    <Badge variant="outline" className="text-base px-4 py-2">
                                        <Clock className="w-4 h-4 mr-2" />
                                        {getTimeRemaining(offer.expirationDate)}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Divisor */}
                        <div className="border-t border-border/40"></div>

                        {/* Descrição */}
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold text-foreground">Sobre a Oferta</h2>
                            <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {offer.description}
                            </p>
                        </div>

                        {/* Informações adicionais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-muted/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Criada em</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(offer.createdAt).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {offer.expirationDate && (
                                <div className="flex items-center space-x-3">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Válida até</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(offer.expirationDate).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Call to action */}
                        <div className="space-y-4 pt-4">
                            <div className="text-center py-4">
                                <h3 className="text-xl font-bold text-foreground mb-2">Interessado?</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Entre em contato agora mesmo através do WhatsApp ou Telegram
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button
                                    size="lg"
                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-base"
                                    onClick={() => {
                                        const message = `Olá! Tenho interesse na oferta: ${offer.title} - ${offer.price}`;
                                        window.open(`https://wa.me/244930717724?text=${encodeURIComponent(message)}`, '_blank');
                                    }}
                                >
                                    <MessageCircle className="w-5 h-5 mr-2" />
                                    Contatar via WhatsApp
                                </Button>

                                <Button
                                    size="lg"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base"
                                    onClick={() => {
                                        const message = `Olá! Tenho interesse na oferta: ${offer.title} - ${offer.price}`;
                                        window.open(`https://t.me/Tibimawin?text=${encodeURIComponent(message)}`, '_blank');
                                    }}
                                >
                                    <Send className="w-5 h-5 mr-2" />
                                    Contatar via Telegram
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default OfertaDetalhes;
