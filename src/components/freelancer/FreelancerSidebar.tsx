import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { LayoutDashboard, Search, Briefcase, Wallet, LifeBuoy, Home, MessageSquare, DollarSign, HelpCircle, Settings, FileText } from "lucide-react";
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
  });
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [planStatus, setPlanStatus] = useState<boolean | null>(null);

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
      ({ totalReleased, pendingWithdrawals, availableBalance }) => {
        console.log('Sidebar: Saldo atualizado via subscription:', { totalReleased, availableBalance, pendingWithdrawals });
        setBalance(prev => ({
          ...prev,
          totalReleased,
          availableBalance,
          pendingWithdrawals,
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
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Saldo Atual</h3>
                  <p className="text-xs text-gray-500">Disponível para saque</p>
                </div>
              </div>
              
              {loadingBalance ? (
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    R$ {balance.availableBalance.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    Pendente: R$ {balance.pendingAmount.toLocaleString()}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded"
                      onClick={async () => {
                        try {
                          // Verificar se o recipient está configurado antes de permitir o saque
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
                          
                          // Confirmar saque com aviso sobre a taxa
                          const netAmount = balance.availableBalance - 2.00;
                          const confirmMessage = `Você receberá R$ ${netAmount.toFixed(2)} (R$ ${balance.availableBalance.toFixed(2)} - R$ 2,00 de taxa PIX). Confirmar saque?`;
                          
                          if (!window.confirm(confirmMessage)) {
                            return;
                          }
                          const { auth } = await import('@/lib/firebase');
                          const token = await auth.currentUser?.getIdToken();
                          if (!token) return;
                          const resp = await fetch('https://processwithdrawalasaas-bo5fg4zxxq-uc.a.run.app', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ amount: balance.availableBalance })
                          });
                          if (!resp.ok) {
                            const t = await resp.text();
                            console.error('Falha no saque:', t);
                            return;
                          }
                          // Atualizar saldos rapidamente
                          try {
                            const summary = await FundsService.getFreelancerBalance(auth.currentUser!.uid);
                            setBalance(prev => ({ ...prev, availableBalance: summary.availableBalance, totalReleased: summary.totalReleased }));
                          } catch {}
                        } catch (e) {
                          console.error('Erro ao solicitar saque:', e);
                        }
                      }}
                    >
                      Saque
                    </button>
                    <button
                      className="px-3 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded"
                      onClick={async () => {
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
                          }));
                        } catch (e) {
                          console.error('Erro no refresh manual:', e);
                        } finally {
                          setLoadingBalance(false);
                        }
                      }}
                      title="Atualizar saldo"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              )}
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
