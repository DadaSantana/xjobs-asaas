import { NavLink, useLocation } from "react-router-dom";
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

const menuItems = [
  {
    title: "Visão Geral",
    url: "/cliente",
  },
  {
    title: "Publicar Projeto",
    url: "/cliente/publicar-projeto",
  },
  {
    title: "Meus Projetos",
    url: "/cliente/meus-projetos",
  },
  {
    title: "Mensagens",
    url: "/cliente/mensagens",
  },
  {
    title: "Freelancers",
    url: "/cliente/freelancers",
  },
  {
    title: "Pagamentos",
    url: "/cliente/pagamentos",
  },
  {
    title: "Suporte",
    url: "/cliente/suporte",
  },
  {
    title: "Como funciona",
    url: "/como-funciona",
    external: true,
  },
  {
    title: "Termos e condições",
    url: "/termos-condicoes",
    external: true,
  },
];

export default function ClienteSidebar() {
  const location = useLocation();
  
  return (
    <Sidebar className="w-64 border-r border-gray-200 bg-white shadow-sm">
      <SidebarHeader className="p-4 h-[64px] border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700">
        <div className="flex items-center justify-center">
          <h2 className="text-xl font-bold text-white">Xjobs</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
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
                        className="w-full text-left flex items-center px-4 py-3 rounded-lg transition-all duration-200 group text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300"
                      >
                        <span className="font-medium">{item.title}</span>
                      </button>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === "/cliente"}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                            isActive
                              ? "bg-green-100 text-green-800 border-l-4 border-green-500 shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:border-l-4 hover:border-gray-300"
                          }`
                        }
                      >
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
