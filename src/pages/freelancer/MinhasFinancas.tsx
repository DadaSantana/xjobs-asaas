
import { useRecipient } from '@/hooks/useRecipient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertCircle, Banknote, CreditCard, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import BankAccountSetupModal from '@/components/BankAccountSetupModal';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector } from '@/hooks/redux';
import { FundsService } from '@/services/fundsService';
import { processWithdrawalAsaas } from '@/services/withdrawalService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BankAccount } from '@/types/bankAccount';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdvanceRequestDialog } from '@/components/advance/AdvanceRequestDialog';

const MinhasFinancas = () => {
  const { loading: recipientLoading } = useRecipient();
  const { userProfile } = useAppSelector((s) => s.auth);
  
  // Verificar se tem dados bancários configurados (novo sistema simplificado)
  const hasBankAccount = !!userProfile?.bankAccount;
  const bankAccountData = userProfile?.bankAccount;
  
  console.log('[MinhasFinancas] Render - hasBankAccount:', hasBankAccount);
  console.log('[MinhasFinancas] Render - bankAccountData:', bankAccountData ? 'exists' : 'null');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [balanceLoading, setBalanceLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalEarnings: number;
    totalReleased: number;
    pendingAmount: number;
    availableBalance: number; // Saldo disponível para saque
    releasedBalance: number; // Total liberado confirmado pelo Asaas
    processingBalance: number; // Saques em processamento
    blockedBalance: number; // Bloqueado (cartão de crédito - 35 dias)
    pendingWithdrawals?: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawValue, setWithdrawValue] = useState<string>("");
  const [releases, setReleases] = useState<any[]>([]);
  const [pendingReleases, setPendingReleases] = useState<any[]>([]); // Liberações com prazo pendente
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawDialogData, setWithdrawDialogData] = useState<{ amount: number; netAmount: number } | null>(null);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [selectedProjectForAdvance, setSelectedProjectForAdvance] = useState<string | null>(null);
  const [showFinancialInfoDialog, setShowFinancialInfoDialog] = useState(false);

  const handleSubmit = async (data: BankAccount) => {
    if (!userProfile?.uid) {
      console.log('[MinhasFinancas] handleSubmit - userProfile.uid não encontrado');
      return;
    }
    
    console.log('[MinhasFinancas] handleSubmit - Iniciando salvamento dos dados bancários');
    console.log('[MinhasFinancas] Dados recebidos:', data);
    
    setIsSubmitting(true);
    try {
      // Salvar dados bancários no Firestore (campo bankAccount do usuário)
      const userRef = doc(db, 'users', userProfile.uid);
      
      const bankAccountData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        verified: false, // Será verificado posteriormente se necessário
      };
      
      console.log('[MinhasFinancas] Salvando no Firestore:', bankAccountData);
      
      await updateDoc(userRef, {
        bankAccount: bankAccountData,
      });

      console.log('[MinhasFinancas] Dados salvos com sucesso no Firestore');

      toast({
        title: "Sucesso!",
        description: "Dados bancários salvos com sucesso. Atualizando...",
      });

      setShowModal(false);
      
      // Aguardar um pouco antes de recarregar para garantir que o Firestore sincronizou
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[MinhasFinancas] Recarregando página...');
      window.location.reload();
    } catch (err) {
      console.error('[MinhasFinancas] Erro ao salvar dados bancários:', err);
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao salvar dados bancários. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawDialogData || !userProfile?.uid || !summary) return;
    
    setShowWithdrawDialog(false);
    
    try {
      // Saque do valor total disponível
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();
      if (!token) {
        toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
        return;
      }
      
      toast({ title: 'Processando...', description: 'Solicitando transferência via PIX (Asaas). Taxa de R$ 2,00 será descontada.' });
      
      const response = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/processWithdrawalAsaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: withdrawDialogData.amount })
      });
      
      const text = await response.text();
      console.log('Resposta do saque:', response.status, text);
      
      if (!response.ok) {
        let data: any = {};
        try { 
          data = JSON.parse(text);
        } catch {}
        
        // Mensagens de erro mais amigáveis
        const errorMessage = data.error || 'Falha ao processar saque';
        const errorDetails = data.details || data.message || '';
        
        console.error('Erro no saque:', data);
        
        toast({ 
          title: 'Erro ao solicitar saque', 
          description: `${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`,
          variant: 'destructive' 
        });
        return;
      }
      
      let result: any = {};
      try {
        result = JSON.parse(text);
      } catch {}
      
      console.log('Resultado do saque:', result);
      
      // Verificar o status da transferência
      if (result.finalStatus === 'completed') {
        toast({ 
          title: 'Transferência concluída!', 
          description: 'O valor foi transferido para sua conta bancária.',
        });
      } else if (result.finalStatus === 'pending') {
        toast({ 
          title: 'Transferência em processamento', 
          description: 'A transferência está sendo processada pelo Pagar.me. Você receberá o valor em breve.',
        });
      } else {
        toast({ 
          title: 'Saque solicitado', 
          description: result.message || 'Aguarde a confirmação da transferência.',
        });
      }
      
      // Recarregar saldos e transações
      const [sum, txs] = await Promise.all([
        FundsService.getFreelancerBalance(userProfile.uid),
        FundsService.getFreelancerTransactions(userProfile.uid)
      ]);
      setSummary({ ...sum, pendingWithdrawals: sum.pendingWithdrawals || 0 });
      setTransactions(txs);
    } catch (e: any) {
      console.error('Erro no saque imediato:', e);
      toast({ 
        title: 'Erro', 
        description: e?.message || 'Falha ao solicitar saque. Tente novamente.', 
        variant: 'destructive' 
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  useEffect(() => {
    const load = async () => {
      if (!userProfile?.uid) return;
      try {
        setBalanceLoading(true);
        const [sum, txs, rls] = await Promise.all([
          FundsService.getFreelancerBalance(userProfile.uid),
          FundsService.getFreelancerTransactions(userProfile.uid),
          FundsService.getFreelancerReleases(userProfile.uid)
        ]);
        
        setSummary({ ...sum, pendingWithdrawals: sum.pendingWithdrawals || 0, pendingBalance: sum.pendingBalance || 0 });
        setTransactions(txs);
        setReleases(rls);
        
        // Buscar liberações com prazo pendente
        const pending = await FundsService.getPendingReleases(userProfile.uid);
        setPendingReleases(pending);
      } catch (e) {
        toast({ title: 'Erro', description: 'Falha ao carregar saldo/transações', variant: 'destructive' });
      } finally {
        setBalanceLoading(false);
      }
    };
    load();
  }, [userProfile?.uid, toast]);

  const canRequestWithdraw = useMemo(() => {
    const amount = Number(withdrawValue.replace(/\D/g, '')) / 100;
    return summary && amount > 0 && amount <= summary.availableBalance;
  }, [summary, withdrawValue]);

  if (recipientLoading || balanceLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Finanças</h1>
          <p className="text-gray-600">Acompanhe seus ganhos e histórico financeiro</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Minhas Finanças</h1>
        <p className="text-sm md:text-base text-gray-600">Acompanhe seus ganhos e histórico financeiro</p>
      </div>

      {/* Dados Bancários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Dados Bancários para Recebimento
          </CardTitle>
          <CardDescription>
            Gerencie suas informações bancárias para receber pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasBankAccount ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Configurado
                </Badge>
              </div>
              
              {bankAccountData && (
                <div className="space-y-2">
                  <h4 className="text-sm md:text-base font-medium text-gray-900">Dados Bancários</h4>
                  <div className="text-xs md:text-sm text-gray-600 space-y-1 bg-gray-50 p-4 rounded-lg">
                    <p><strong>Banco:</strong> {bankAccountData.bank} - {bankAccountData.bankName}</p>
                    <p><strong>Agência:</strong> {bankAccountData.agency}</p>
                    <p><strong>Conta:</strong> {bankAccountData.account}-{bankAccountData.accountDigit}</p>
                    <p><strong>Tipo:</strong> {bankAccountData.accountType === 'checking' ? 'Conta Corrente' : 'Conta Poupança'}</p>
                    <p><strong>Titular:</strong> {bankAccountData.holderName}</p>
                    <p><strong>CPF:</strong> {bankAccountData.holderDocument}</p>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => setShowModal(true)}
                className="mt-4"
              >
                Atualizar Dados Bancários
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Não Configurado
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Para receber pagamentos pelos seus trabalhos, você precisa configurar seus dados bancários.
              </p>
              <Button onClick={() => setShowModal(true)}>
                Configurar Dados Bancários
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
              <CardDescription>
                Visão geral dos seus ganhos e transações
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFinancialInfoDialog(true)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Info className="h-4 w-4 mr-1" />
              Saiba mais
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-600">Carregando saldo...</div>
          ) : summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Card 1: Saldo Disponível (para saque) */}
              <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="text-xs md:text-sm text-gray-600 font-semibold">Saldo Disponível</div>
                <div className="text-xs text-gray-500 mb-1">✅ Para saque</div>
                <div className="text-lg md:text-2xl font-bold text-green-700">{formatCurrency(summary.availableBalance)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Taxa PIX: R$ 2,00 por transação
                </div>
                <Button
                  size="sm"
                  className="mt-2 md:mt-3 text-xs"
                  onClick={async () => {
                    try {
                      if (!userProfile?.uid) return;
                      if (!summary || summary.availableBalance <= 2.00) {
                        toast({ title: 'Saldo insuficiente', description: 'É necessário pelo menos R$ 2,00 para cobrir a taxa do PIX', variant: 'destructive' });
                        return;
                      }
                      
                      // Verificar se os dados bancários estão configurados
                      if (!bankAccountData) {
                        toast({ 
                          title: 'Configuração necessária', 
                          description: 'Configure seus dados bancários antes de solicitar um saque',
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      // Confirmar saque com aviso sobre a taxa
                      const netAmount = summary.availableBalance - 2.00;
                      setWithdrawDialogData({ amount: summary.availableBalance, netAmount });
                      setShowWithdrawDialog(true);
                    } catch (e:any) {
                      console.error('Erro ao preparar saque:', e);
                      toast({ 
                        title: 'Erro', 
                        description: e?.message || 'Falha ao preparar saque. Tente novamente.', 
                        variant: 'destructive' 
                      });
                    }
                  }}
                >
                  💰 Solicitar Saque
                </Button>
              </div>
              
              {/* Card 2: Total Liberado (confirmado pelo Asaas) */}
              <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-xs md:text-sm text-gray-600 font-semibold">Total Liberado</div>
                <div className="text-xs text-gray-500 mb-1">✓ Confirmado pelo Asaas</div>
                <div className="text-lg md:text-2xl font-bold text-blue-700">{formatCurrency(summary.releasedBalance)}</div>
              </div>
              
              {/* Card 3: Processando (saques em processamento) */}
              <div className="text-center p-3 md:p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <div className="text-xs md:text-sm text-gray-600 font-semibold">Processando</div>
                <div className="text-xs text-gray-500 mb-1">⏳ Adiantamento/Saque solicitado</div>
                <div className="text-lg md:text-2xl font-bold text-yellow-700">{formatCurrency(summary.processingBalance)}</div>
              </div>
              
              {/* Card 4: Pendente (bloqueado por cartão 35 dias) */}
              <div className="text-center p-3 md:p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <div className="text-xs md:text-sm text-gray-600 font-semibold">Pendente</div>
                <div className="text-xs text-gray-500 mb-1">💳 Cartão (35 dias)</div>
                <div className="text-lg md:text-2xl font-bold text-orange-700">{formatCurrency(summary.blockedBalance)}</div>
                {summary.blockedBalance > 0 && pendingReleases.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs border-blue-600 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setSelectedProjectForAdvance(pendingReleases[0].projectId);
                        setShowAdvanceDialog(true);
                      }}
                    >
                      ⚡ Adiantar Agora
                    </Button>
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      <Info className="h-3 w-3 inline mr-1" />
                      Sujeito a aprovação (4-5 dias)
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-gray-600">Sem dados financeiros ainda</div>
          )}
        </CardContent>
      </Card>

      {/* Valores Pendentes - Aguardando Liberação */}
      {pendingReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Valores Bloqueados (Cartão de Crédito)
            </CardTitle>
            <CardDescription>
              Valores já liberados pelo cliente mas aguardando prazo de 35 dias para disponibilização. 
              <span className="font-semibold text-blue-600"> Você pode solicitar adiantamento com taxa de 2%!</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 font-semibold">Importante sobre Adiantamento</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm mt-1">
                O adiantamento de valores no crédito está sujeito a aprovação mediante análise, e o prazo para este processamento é de <strong>4 a 5 dias úteis</strong>.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              {pendingReleases.map((release, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{release.projectTitle || 'Projeto'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Método: <Badge variant="outline" className="bg-blue-50">💳 Cartão de Crédito (35 dias)</Badge>
                    </div>
                    <div className="text-sm text-orange-600 mt-1">
                      Disponível em: <strong>{release.availableDate}</strong>
                    </div>
                    <div className="text-xs text-blue-600 mt-2">
                      💡 <strong>Dica:</strong> Solicite adiantamento para receber agora (taxa de 2%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-700">{formatCurrency(release.amount)}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        setSelectedProjectForAdvance(release.projectId);
                        setShowAdvanceDialog(true);
                      }}
                    >
                      ⚡ Solicitar Adiantamento
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Solicitar Saque */}
      <Card>
        <CardHeader>
          <CardTitle>Agendar Transferência</CardTitle>
          <CardDescription>Solicite a transferência do seu saldo disponível</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="text-xs md:text-sm text-gray-700">Valor do saque</label>
              <Input
                placeholder="R$ 0,00"
                value={withdrawValue}
                className="text-sm"
                onChange={(e) => {
                  const raw = e.target.value;
                  const onlyDigits = raw.replace(/\D/g, '');
                  const withCents = (Number(onlyDigits) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  setWithdrawValue(withCents);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Disponível: {formatCurrency(summary?.availableBalance || 0)}</p>
            </div>
            <div className="sm:w-auto">
              <Button
                className="w-full sm:w-auto text-xs"
                disabled={!canRequestWithdraw || balanceLoading}
                onClick={async () => {
                  try {
                    if (!userProfile?.uid) return;
                    const amount = Number(withdrawValue.replace(/\D/g, '')) / 100;
                    if (!summary || amount <= 0 || amount > summary.availableBalance) {
                      toast({ title: 'Valor inválido', description: 'Verifique o saldo disponível', variant: 'destructive' });
                      return;
                    }
                    await processWithdrawalAsaas(amount);
                    toast({ title: 'Saque Processado', description: 'Seu saque foi enviado via PIX e será processado em até 1 hora.' });
                    setWithdrawValue('');
                    const [sum, txs] = await Promise.all([
                      FundsService.getFreelancerBalance(userProfile.uid),
                      FundsService.getFreelancerTransactions(userProfile.uid)
                    ]);
                    setSummary({ ...sum, pendingWithdrawals: sum.pendingWithdrawals || 0 });
                    setTransactions(txs);
                  } catch (e) {
                    toast({ title: 'Erro', description: 'Falha ao solicitar saque', variant: 'destructive' });
                  }
                }}
              >
                Solicitar Saque
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Entradas e saídas de saldo (liberações, saques e adiantamentos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm md:text-base">Nenhuma transação encontrada</p>
              <p className="text-xs md:text-sm">As transações aparecerão aqui quando você receber pagamentos, fizer saques ou solicitar adiantamentos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isAdvance = tx.type === 'advance_payment';
                const isAdvanceFee = tx.type === 'anticipation_fee';
                const isWithdraw = tx.type === 'withdraw' || tx.type === 'withdrawal_completed' || tx.type === 'withdrawal_reversal';

                let tipoLabel = '';
                if (isAdvance) {
                  tipoLabel = '⚡ Adiantamento (valor antecipado via Asaas)';
                } else if (isAdvanceFee) {
                  tipoLabel = '💳 Taxa de adiantamento (Asaas)';
                } else if (tx.type === 'withdraw') {
                  tipoLabel = '💰 Saque solicitado';
                } else if (tx.type === 'withdrawal_completed') {
                  tipoLabel = '💰 Saque concluído';
                } else if (tx.type === 'withdrawal_reversal') {
                  tipoLabel = '↩ Estorno de saque';
                } else if (tx.type === 'release') {
                  tipoLabel = tx.releaseType === 'partial' ? `Liberação ${tx.percentage || 0}%` : 'Liberação 100%';
                } else if (tx.type === 'refund') {
                  tipoLabel = 'Reembolso ao cliente';
                } else if (tx.type === 'fee') {
                  tipoLabel = 'Taxa da plataforma';
                } else if (tx.type === 'hold') {
                  tipoLabel = 'Bloqueio de valores (aguardando liberação)';
                }

                const isDebit = isAdvanceFee || tx.type === 'withdrawal_reversal' || tx.type === 'refund';

                return (
                  <div key={tx.id} className="border rounded-lg p-3 md:p-4 space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-sm md:text-base">
                          {tx.projectTitle || tx.projectId || 'Movimentação de saldo'}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 mt-1">
                          {tipoLabel || 'Movimentação financeira'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold text-sm md:text-base ${
                          isDebit ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {isDebit && '- '}
                          {formatCurrency(tx.amount || 0)}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          tx.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : tx.status === 'pending' || tx.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status === 'completed' ? 'Concluído' : 
                           tx.status === 'pending' || tx.status === 'processing'
                             ? (isAdvance ? 'Em processamento' : 'Pendente') 
                             : tx.status === 'failed'
                             ? 'Falhou'
                             : tx.status === 'cancelled'
                             ? 'Cancelado'
                             : tx.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                      <span>
                        {tx.gateway === 'asaas' || isAdvance || isAdvanceFee || isWithdraw
                          ? 'Via Asaas'
                          : `Cliente: ${tx.clientName || 'Cliente'}`}
                      </span>
                      <span>
                        {tx.createdAt?.toDate ? format(tx.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Liberações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Liberações</CardTitle>
          <CardDescription>
            Data, valor, projeto e cliente que liberou
          </CardDescription>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm md:text-base">Nenhuma liberação registrada</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-0">
              {/* Mobile Layout */}
              <div className="block md:hidden space-y-3">
                {releases.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{r.projectTitle || r.projectId}</div>
                        <div className="text-xs text-gray-500">
                          {r.releaseType === 'partial' ? `${(r.percentage || 0).toFixed(0)}%` : '100%'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{formatCurrency(r.amount || 0)}</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === 'released' 
                            ? 'bg-green-100 text-green-800' 
                            : r.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {r.status === 'released' ? 'Liberado' : 
                           r.status === 'pending' ? 'Pendente' : 
                           r.status === 'rejected' ? 'Rejeitado' : r.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Cliente: {r.clientName || 'Cliente'}</span>
                      <span>{r.createdAt?.toDate ? format(r.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {releases.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.createdAt?.toDate ? format(r.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{r.projectTitle || r.projectId}</div>
                            <div className="text-sm text-gray-500">
                              {r.releaseType === 'partial' ? `${(r.percentage || 0).toFixed(0)}%` : '100%'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{r.clientName || 'Cliente'}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(r.amount || 0)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            r.status === 'released' 
                              ? 'bg-green-100 text-green-800' 
                              : r.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {r.status === 'released' ? 'Liberado' : 
                             r.status === 'pending' ? 'Pendente' : 
                             r.status === 'rejected' ? 'Rejeitado' : r.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <BankAccountSetupModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        loading={isSubmitting}
        initialData={bankAccountData}
      />

      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Saque via PIX</AlertDialogTitle>
            <AlertDialogDescription>
              {withdrawDialogData && (
                <div className="space-y-2 mt-2">
                  <p>Você está prestes a solicitar um saque do seu saldo disponível.</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1">
                    <p className="text-sm">
                      <strong>Valor bruto:</strong> {formatCurrency(withdrawDialogData.amount)}
                    </p>
                    <p className="text-sm text-red-600">
                      <strong>Taxa PIX:</strong> - R$ 2,00
                    </p>
                    <p className="text-base font-semibold text-green-700 mt-2 pt-2 border-t border-blue-300">
                      <strong>Você receberá:</strong> {formatCurrency(withdrawDialogData.netAmount)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    O valor será transferido via PIX para sua conta bancária cadastrada.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWithdraw}>
              Confirmar Saque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Adiantamento */}
      {userProfile?.uid && selectedProjectForAdvance && (
        <AdvanceRequestDialog
          isOpen={showAdvanceDialog}
          onClose={() => {
            setShowAdvanceDialog(false);
            setSelectedProjectForAdvance(null);
          }}
          projectId={selectedProjectForAdvance}
          freelancerId={userProfile.uid}
        />
      )}

      {/* Dialog de Informações Financeiras */}
      <Dialog open={showFinancialInfoDialog} onOpenChange={setShowFinancialInfoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Info className="h-5 w-5 text-blue-600" />
              Entenda seu Resumo Financeiro
            </DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre cada conceito do seu resumo financeiro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Saldo Disponível */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold">✓</span>
                </div>
                <h3 className="font-semibold text-green-900">Saldo Disponível</h3>
              </div>
              <p className="text-sm text-green-800 mb-2">
                Este é o valor que você pode sacar imediatamente. Representa o total de ganhos já liberados e confirmados, 
                menos os valores que já foram solicitados para saque ou adiantamento.
              </p>
              <div className="bg-white rounded p-3 mt-2">
                <p className="text-xs text-gray-600">
                  <strong>Como usar:</strong> Clique em "Solicitar Saque" para transferir este valor para sua conta bancária. 
                  A transferência é feita via PIX com taxa de <strong>R$ 2,00</strong> por transação.
                </p>
              </div>
            </div>

            {/* Total Liberado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-bold">✓</span>
                </div>
                <h3 className="font-semibold text-blue-900">Total Liberado</h3>
              </div>
              <p className="text-sm text-blue-800 mb-2">
                Este é o valor total que já foi liberado pelo cliente e confirmado pelo sistema de pagamento (Asaas). 
                Inclui todos os pagamentos que foram processados com sucesso.
              </p>
              <div className="bg-white rounded p-3 mt-2">
                <p className="text-xs text-gray-600">
                  <strong>Importante:</strong> Este valor representa o total histórico de liberações confirmadas. 
                  Parte dele pode estar no "Saldo Disponível" (para saque) ou no "Processando" (aguardando confirmação).
                </p>
              </div>
            </div>

            {/* Processando */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">
                  <span className="text-yellow-700 font-bold">⏳</span>
                </div>
                <h3 className="font-semibold text-yellow-900">Processando</h3>
              </div>
              <p className="text-sm text-yellow-800 mb-2">
                Valores que estão em processamento, ou seja, você já solicitou o saque ou adiantamento, mas ainda não foram 
                confirmados e transferidos para sua conta bancária.
              </p>
              <div className="bg-white rounded p-3 mt-2">
                <p className="text-xs text-gray-600">
                  <strong>O que significa:</strong> Estes valores já foram descontados do seu "Saldo Disponível" e estão 
                  sendo processados pelo sistema. Em breve serão transferidos para sua conta bancária.
                </p>
              </div>
            </div>

            {/* Pendente */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-orange-700 font-bold">💳</span>
                </div>
                <h3 className="font-semibold text-orange-900">Pendente</h3>
              </div>
              <p className="text-sm text-orange-800 mb-2">
                Valores que foram liberados pelo cliente, mas estão bloqueados porque o pagamento foi feito com 
                <strong> cartão de crédito</strong>. Por segurança, estes valores ficam bloqueados por <strong>35 dias</strong> 
                antes de ficarem disponíveis para saque.
              </p>
              <div className="bg-white rounded p-3 mt-2 space-y-2">
                <p className="text-xs text-gray-600">
                  <strong>Adiantamento disponível:</strong> Você pode solicitar o adiantamento destes valores antes dos 35 dias, 
                  pagando uma taxa de <strong>2%</strong> sobre o valor solicitado.
                </p>
                <Alert className="border-amber-200 bg-amber-50 mt-2">
                  <Info className="h-3 w-3 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-700">
                    <strong>Importante:</strong> O adiantamento está sujeito a aprovação mediante análise, 
                    e o prazo para processamento é de <strong>4 a 5 dias úteis</strong>.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Saque */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-bold">💰</span>
                </div>
                <h3 className="font-semibold text-gray-900">Saque</h3>
              </div>
              <p className="text-sm text-gray-800 mb-2">
                O saque é a transferência do seu "Saldo Disponível" para sua conta bancária cadastrada.
              </p>
              <div className="bg-white rounded p-3 mt-2 space-y-2">
                <p className="text-xs text-gray-600">
                  <strong>Como funciona:</strong>
                </p>
                <ul className="text-xs text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li>Você precisa ter dados bancários configurados</li>
                  <li>A transferência é feita via <strong>PIX</strong></li>
                  <li>Taxa de <strong>R$ 2,00</strong> é descontada do valor solicitado</li>
                  <li>O valor líquido é transferido para sua conta</li>
                  <li>O processamento geralmente leva até <strong>1 hora</strong></li>
                </ul>
              </div>
            </div>

            {/* Resumo Geral */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900 font-semibold">Resumo Geral</AlertTitle>
              <AlertDescription className="text-sm text-blue-800 mt-1">
                <p className="mb-2">
                  Seu resumo financeiro mostra todos os seus ganhos de forma organizada:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Saldo Disponível:</strong> O que você pode sacar agora</li>
                  <li><strong>Total Liberado:</strong> Tudo que já foi confirmado</li>
                  <li><strong>Processando:</strong> Saques/adiantamentos em andamento</li>
                  <li><strong>Pendente:</strong> Valores bloqueados (cartão - 35 dias)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MinhasFinancas;
