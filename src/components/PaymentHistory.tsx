import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Receipt, Download, RefreshCw } from 'lucide-react';
import { AsaasPaymentService } from '@/services/AsaasPaymentService';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Payment {
  id: string;
  value: number;
  status: string;
  billingType: string;
  dueDate?: string;
  paymentDate?: string;
  confirmedDate?: string;
  description?: string;
  invoiceUrl?: string;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  RECEIVED: { label: 'Pago', variant: 'default' },
  CONFIRMED: { label: 'Confirmado', variant: 'default' },
  PENDING: { label: 'Pendente', variant: 'secondary' },
  OVERDUE: { label: 'Vencido', variant: 'destructive' },
  REFUNDED: { label: 'Reembolsado', variant: 'outline' },
  REFUND_REQUESTED: { label: 'Reembolso solicitado', variant: 'outline' },
  CHARGEBACK_REQUESTED: { label: 'Disputa', variant: 'destructive' },
  CHARGEBACK_DISPUTE: { label: 'Em disputa', variant: 'destructive' },
  AWAITING_CHARGEBACK_REVERSAL: { label: 'Aguardando reversão', variant: 'secondary' },
  DUNNING_REQUESTED: { label: 'Em negociação', variant: 'secondary' },
  DUNNING_RECEIVED: { label: 'Recuperado', variant: 'default' },
  AWAITING_RISK_ANALYSIS: { label: 'Em análise', variant: 'secondary' },
};

const PaymentHistory: React.FC = () => {
  const { userInfo } = useSimpleAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!userInfo?.email) return;
    setLoading(true);
    try {
      const data = await AsaasPaymentService.getCustomerPaymentsByEmail(userInfo.email);
      setPayments(data as Payment[]);
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      toast.error('Erro ao carregar histórico de pagamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [userInfo?.email]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getStatus = (status: string) => {
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  const downloadReceipt = (payment: Payment) => {
    const pdf = new jsPDF();
    const now = new Date().toLocaleDateString('pt-BR');

    pdf.setFontSize(20);
    pdf.text('Comprovante de Pagamento', 105, 30, { align: 'center' });

    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.text(`Emitido em: ${now}`, 105, 40, { align: 'center' });

    pdf.setDrawColor(200);
    pdf.line(20, 48, 190, 48);

    pdf.setTextColor(0);
    pdf.setFontSize(13);
    let y = 60;
    const items = [
      ['ID', payment.id],
      ['Valor', `R$ ${payment.value.toFixed(2)}`],
      ['Status', getStatus(payment.status).label],
      ['Tipo', payment.billingType || 'PIX'],
      ['Descrição', payment.description || '-'],
      ['Vencimento', formatDate(payment.dueDate)],
      ['Data Pagamento', formatDate(payment.paymentDate || payment.confirmedDate)],
      ['Cliente', userInfo?.email || '-'],
    ];

    items.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, 25, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 80, y);
      y += 10;
    });

    pdf.setDrawColor(200);
    pdf.line(20, y + 5, 190, y + 5);

    pdf.setFontSize(10);
    pdf.setTextColor(130);
    pdf.text('Documento gerado automaticamente.', 105, y + 15, { align: 'center' });

    pdf.save(`comprovante-${payment.id}.pdf`);
    toast.success('Comprovante baixado!');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Carregando histórico...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            Histórico de Pagamentos
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => {
              const status = getStatus(payment.status);
              const isPaid = payment.status === 'RECEIVED' || payment.status === 'CONFIRMED';
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">
                        R$ {payment.value.toFixed(2)}
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {payment.description || 'Pagamento PIX'} • Venc: {formatDate(payment.dueDate)}
                      {(payment.paymentDate || payment.confirmedDate) &&
                        ` • Pago: ${formatDate(payment.paymentDate || payment.confirmedDate)}`}
                    </p>
                  </div>
                  {isPaid && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadReceipt(payment)}
                      title="Baixar comprovante"
                    >
                      <Download className="h-4 w-4" />
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
