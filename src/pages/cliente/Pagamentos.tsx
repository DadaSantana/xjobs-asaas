import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppSelector } from '@/hooks/redux';
import { FundsService } from '@/services/fundsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface PaymentRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  freelancerId: string;
  freelancerName: string;
  amount: number;
  percentage: number;
  releaseType: 'partial' | 'full';
  status: string;
  createdAt: any;
}

const Pagamentos = () => {
  const { userProfile } = useAppSelector((s) => s.auth);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  useEffect(() => {
    const loadPayments = async () => {
      if (!userProfile?.uid) return;
      
      try {
        setLoading(true);
        // Buscar liberações onde o cliente é o usuário logado
        const releases = await FundsService.getClientReleases(userProfile.uid);
        setPayments(releases);
      } catch (error) {
        console.error('Erro ao carregar pagamentos:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao carregar histórico de pagamentos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [userProfile?.uid, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
        <p className="text-gray-600">Histórico de pagamentos realizados</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>
            Todos os pagamentos realizados para freelancers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-600">
              Carregando pagamentos...
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum pagamento encontrado</p>
              <p className="text-sm">Os pagamentos aparecerão aqui quando você liberar fundos para freelancers</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Freelancer</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.projectTitle}</div>
                        <div className="text-sm text-gray-500">
                          {payment.releaseType === 'partial' ? `${payment.percentage}%` : '100%'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.freelancerName}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'released' 
                          ? 'bg-green-100 text-green-800' 
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status === 'released' ? 'Liberado' : 
                         payment.status === 'pending' ? 'Pendente' : 
                         payment.status === 'rejected' ? 'Rejeitado' : payment.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Pagamentos;
