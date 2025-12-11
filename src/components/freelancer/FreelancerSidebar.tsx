import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { LayoutDashboard, Search, Briefcase, Wallet, LifeBuoy, Home, MessageSquare, DollarSign, HelpCircle, Settings, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useAppSelector } from "@/hooks/redux";
import { FundsService } from "@/services/fundsService";
import { useRecipient } from "@/hooks/useRecipient";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface FreelancerSidebarProps {
  onRequestRecipientSetup?: () => void;
}

export default function FreelancerSidebar({ onRequestRecipientSetup }: FreelancerSidebarProps) {
  const location = useLocation();
  const userProfile = useAppSelector(state => state.auth.userProfile);
  const { hasRecipient } = useRecipient();
  const [balance, setBalance] = useState({
    totalEarnings: 0,
    totalReleased: 0,
    pendingAmount: 0,
    availableBalance: 0,
    pendingWithdrawals: 0,
    releasedBalance: 0,
    processingBalance: 0,
    blockedBalance: 0,
  });
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [planStatus, setPlanStatus] = useState<boolean | null>(null);
  const [isWalletExpanded, setIsWalletExpanded] = useState(true);

  useEffect(() => {
    const fetchPlanStatus = async () => {
      try {
        const docRef = doc(db, "settings", "plans");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const status = !!docSnap.data().status;
          console.log('Plan status from Firestore:', status);
          setPlanStatus(status);
        } else {
          console.log('Plan document does not exist, setting to false');
          setPlanStatus(false);
        }
      } catch (e) {
        console.error('Error fetching plan status:', e);
        setPlanStatus(false);
      }
    };
    fetchPlanStatus();
  }, []);

  useEffect(() => {
    if (!userProfile?.uid) return;
    setLoadingBalance(true);

    const unsubscribe = FundsService.subscribeFreelancerBalance(
      userProfile.uid,
      ({ totalReleased, pendingWithdrawals, availableBalance, releasedBalance, processingBalance, blockedBalance }) => {
        console.log('Sidebar: Saldo atualizado via subscription:', { totalReleased, availableBalance, pendingWithdrawals, releasedBalance, processingBalance, blockedBalance });
        setBalance(prev => ({
          ...prev,
          totalReleased,
          availableBalance,
          pendingWithdrawals,
          releasedBalance: releasedBalance || 0,
          processingBalance: processingBalance || 0,
          blockedBalance: blockedBalance || 0,
        }));
        setLoadingBalance(false);
      }
    );

    const loadInitialBalance = async () => {
      try {
        const summary = await FundsService.getFreelancerBalance(userProfile.uid);
        console.log('Sidebar: Saldo inicial carregado:', summary);
        setBalance(prev => ({
          ...prev,
          totalEarnings: summary.totalEarnings,
          pendingAmount: summary.pendingAmount,
          totalReleased: summary.totalReleased,
          availableBalance: summary.availableBalance,
          pendingWithdrawals: summary.pendingWithdrawals,
          releasedBalance: summary.releasedBalance || 0,
          processingBalance: summary.processingBalance || 0,
          blockedBalance: summary.blockedBalance || 0,
        }));
        setLoadingBalance(false);
      } catch (e) {
        console.error('Erro ao carregar saldo inicial:', e);
        setLoadingBalance(false);
      }
    };

    loadInitialBalance();

    return () => {
      try { unsubscribe(); } catch {}
    };
  }, [userProfile?.uid]);

  // Definir menuItems após planStatus
  const menuItems = [
    {
      title: "Visão Geral",
      url: "/freelancer",
      icon: Home,
    },
    {
      title: "Encontre Trabalho",
      url: "/freelancer/encontre-trabalho",
      icon: Search,
    },
    {
      title: "Meus Projetos",
      url: "/freelancer/meus-projetos",
      icon: Briefcase,
    },
    {
      title: "Mensagens",
      url: "/freelancer/mensagens",
      icon: MessageSquare,
    },
    {
      title: "Minhas Finanças",
      url: "/freelancer/minhas-financas",
      icon: DollarSign,
    },
    // Exibe "Meu Plano" apenas se planStatus for true
    ...(planStatus === true ? [{
      title: "Meu Plano",
      url: "/freelancer/meus-planos",
      icon: Settings,
    }] : []),
    {
      title: "Suporte",
      url: "/freelancer/suporte",
      icon: HelpCircle,
    },
    {
      title: "Como funciona",
      url: "/como-funciona",
      icon: LifeBuoy,
      external: true,
    },
    {
      title: "Termos e condições",
      url: "/termos-condicoes",
      icon: FileText,
      external: true,
    },
  ];

  return (
    <Sidebar className="w-64 border-r border-gray-200 bg-white shadow-sm hidden md:flex" collapsible="none">
      <SidebarHeader className="p-4 md:p-4 h-[64px] border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center justify-center">
          <h2 className="text-xl font-bold text-white">Xjobs</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2 md:p-4">
        <div className="mb-6">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div 
                className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-3 cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                onClick={() => setIsWalletExpanded(!isWalletExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-white" />
                    <h3 className="text-sm font-semibold text-white">Carteira</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!userProfile?.uid) return;
                        setLoadingBalance(true);
                        try {
                          const summary = await FundsService.getFreelancerBalance(userProfile.uid);
                          console.log('Sidebar: Refresh manual do saldo:', summary);
                          setBalance(prev => ({
                            ...prev,
                            totalEarnings: summary.totalEarnings,
                            pendingAmount: summary.pendingAmount,
                            totalReleased: summary.totalReleased,
                            availableBalance: summary.availableBalance,
                            pendingWithdrawals: summary.pendingWithdrawals,
                            releasedBalance: summary.releasedBalance || 0,
                            processingBalance: summary.processingBalance || 0,
                            blockedBalance: summary.blockedBalance || 0,
                          }));
                        } catch (e) {
                          console.error('Erro no refresh manual:', e);
                        } finally {
                          setLoadingBalance(false);
                        }
                      }}
                      title="Atualizar saldo"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    {isWalletExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>
              
              {isWalletExpanded && (loadingBalance ? (
                <div className="p-4 space-y-3">
                  <div className="animate-pulse space-y-3">
                    <div className="h-20 bg-gray-100 rounded-lg"></div>
                    <div className="h-12 bg-gray-100 rounded-lg"></div>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Saldo Disponível - Card Principal */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Disponível</p>
                        <p className="text-2xl font-bold text-gray-900 tracking-tight">
                          {balance.availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-medium py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                      onClick={async () => {
                        try {
                          if (!hasRecipient) {
                            if (onRequestRecipientSetup) {
                              onRequestRecipientSetup();
                            }
                            return;
                          }
                          
                          if (balance.availableBalance <= 2.00) {
                            alert('Saldo insuficiente. É necessário pelo menos R$ 2,00 para cobrir a taxa do PIX.');
                            return;
                          }
                          
                          const netAmount = balance.availableBalance - 2.00;
                          const confirmMessage = `Você receberá R$ ${netAmount.toFixed(2)} (R$ ${balance.availableBalance.toFixed(2)} - R$ 2,00 de taxa PIX). Confirmar saque?`;
                          
                          if (!window.confirm(confirmMessage)) {
                            return;
                          }
                          const { auth } = await import('@/lib/firebase');
                          const token = await auth.currentUser?.getIdToken();
                          if (!token) return;
                          const resp = await fetch('https://us-central1-xjobs-a43d2.cloudfunctions.net/processWithdrawalAsaas', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ amount: balance.availableBalance })
                          });
                          if (!resp.ok) {
                            const t = await resp.text();
                            console.error('Falha no saque:', t);
                            return;
                          }
                          try {
                            const summary = await FundsService.getFreelancerBalance(auth.currentUser!.uid);
                            setBalance(prev => ({ 
                              ...prev, 
                              availableBalance: summary.availableBalance, 
                              totalReleased: summary.totalReleased,
                              processingBalance: summary.processingBalance || 0,
                            }));
                          } catch {}
                        } catch (e) {
                          console.error('Erro ao solicitar saque:', e);
                        }
                      }}
                    >
                      Solicitar Saque
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">Taxa PIX: R$ 2,00 por transação</p>
                  </div>

                  {/* Resumo Financeiro Completo */}
                  <div className="space-y-1.5">
                    {/* Total Liberado */}
                    <div className="flex items-center justify-between py-2 px-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-700">Total Liberado</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-700">
                        {balance.releasedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {/* Processando */}
                    <div className="flex items-center justify-between py-2 px-3 bg-amber-50/50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 bg-amber-500 rounded-full ${balance.processingBalance > 0 ? 'animate-pulse' : ''}`}></div>
                        <span className="text-xs font-medium text-gray-700">Em Processamento</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-700">
                        {balance.processingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {/* Bloqueado */}
                    <div className="flex items-center justify-between py-2 px-3 bg-orange-50/50 rounded-lg border border-orange-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        <span className="text-xs font-medium text-gray-700">Bloqueado Cartão</span>
                      </div>
                      <span className="text-sm font-semibold text-orange-700">
                        {balance.blockedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Link para detalhes */}
                  <button
                    onClick={() => window.location.href = '/freelancer/minhas-financas'}
                    className="w-full text-xs text-gray-500 hover:text-blue-600 font-medium py-2 text-center transition-colors flex items-center justify-center gap-1 group"
                  >
                    <span>Ver detalhes completos</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.external ? (
                      <button
                        onClick={() => window.location.href = item.url}
                        className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300"
                      >
                        <item.icon className="h-5 w-5 transition-colors" />
                        <span className="font-medium">{item.title}</span>
                      </button>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === "/freelancer"}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                            isActive
                              ? "bg-blue-100 text-blue-800 border-l-4 border-blue-500 shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5 transition-colors" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
