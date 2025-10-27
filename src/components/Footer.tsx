import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">FreelanceHub</h3>
            <p className="text-gray-400">
              A plataforma que conecta os melhores freelancers a projetos incríveis.
              Transforme as suas ideias em realidade.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/xjobs/">
                <Facebook className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              {/* <Twitter className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer transition-colors" /> */}
              <a href="https://www.instagram.com/xjobs3lancer/">
                <Instagram className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a>
              {/* <a href="https://www.linkedin.com/in/galvant/">
                <Linkedin className="h-6 w-6 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </a> */}
            </div>
          </div>

          {/* Para Freelancers */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Para Freelancers</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Como Começar</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Criar Perfil</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Encontrar Projetos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Dicas de Sucesso</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Centro de Ajuda</a></li>
            </ul>
          </div>

          {/* Para Clientes */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Para Clientes</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Publicar Projeto</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Encontrar Talentos</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Como Funciona</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Preços</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Suporte</a></li>
            </ul>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400">xjobsfreelancer@yahoo.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400">CNPJ: 36.477.658/0001-36</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-gray-400">São Paulo, SP</span>
              </div>

              {/* Botão Administrativo */}
              <div className="pt-2 border-t border-gray-800">
                <Link
                  to="/manager/login"
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-300 transition-colors text-sm group"
                >
                  <Shield className="h-4 w-4 group-hover:text-blue-400 transition-colors" />
                  <span>Acesso Administrativo</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-6 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            © 2025 FreelanceHub. Todos os direitos reservados.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/termos-condicoes" className="text-gray-400 hover:text-white text-sm transition-colors">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
