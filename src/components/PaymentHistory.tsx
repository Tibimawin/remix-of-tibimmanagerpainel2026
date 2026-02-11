import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AsaasService, type AsaasPayment } from '@/services/AsaasService';

interface PaymentHistoryProps {
  userId?: string;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  RECEIVED: { label: 'Recebido', variant: 'default' },
  PENDING: { label: 'Pendente', variant: 'secondary' },
  OVERDUE: { label: 'Vencido', variant: 'destructive' },
  REFUNDED: { label: 'Estornado', variant: 'outline' },
  RECEIVED_IN_CASH: { label: 'Recebido em dinheiro', variant: 'default' },
};

const billingTypeMap: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão',
};

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ userId }) => {
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await AsaasService.listPayments({ externalReference: userId });
        setPayments(result?.data || []);
      } catch (err: any) {
        console.error('Erro ao buscar histórico:', err);
        setError('Não foi possível carregar o histórico');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [userId]);

  if (!userId) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Histórico de Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum pagamento encontrado
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const status = statusMap[p.status] || { label: p.status, variant: 'outline' as const };
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        R$ {p.value.toFixed(2).replace('.', ',')}
                      </span>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {billingTypeMap[p.billingType] || p.billingType} • Vencimento: {new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {p.invoiceUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(p.invoiceUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
