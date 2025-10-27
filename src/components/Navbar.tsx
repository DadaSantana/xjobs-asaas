import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Navbar = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <nav className="hidden md:block absolute top-0 left-0 right-0 z-20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/">
              <h1 className="text-2xl font-bold text-gray-800">Xjobs</h1>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Recursos
            </button>
            <button 
              onClick={() => scrollToSection('freelancer-steps')}
              className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Para Freelancers
            </button>
            <button 
              onClick={() => scrollToSection('client-steps')}
              className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Para Clientes
            </button>
            <button 
              onClick={() => scrollToSection('featured-freelancers')}
              className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Freelancers
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Login
            </button>
            <Button 
              onClick={() => window.location.href = '/cadastro'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
            >
              CADASTRE-SE
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
