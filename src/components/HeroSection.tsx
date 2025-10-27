const HeroSection = () => {
  return <section className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 bg-cover bg-center" style={{
      backgroundImage: `url('/lovable-uploads/4fdc570e-8519-4b6e-81e1-58c438fac5f6.png')`
    }}></div>
      
      {/* Blue overlay */}
      <div className="absolute inset-0 bg-blue-500/40"></div>
      
      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 pt-16 md:pt-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh] max-w-7xl mx-auto w-full">
          {/* Left content */}
          <div className="text-white space-y-6 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-800">
              Encontre um freelancer para o seu projeto
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Ou ache, rapidamente, clientes da sua área de trabalho
            </p>
            
            {/* Mobile image - shown below text on mobile */}
            <div className="lg:hidden flex justify-center items-center mt-8">
              <div className="w-[250px] h-[350px] rounded-2xl overflow-hidden shadow-lg">
                <img src="/lovable-uploads/af57e688-b24f-4ece-be90-967fb4ba2c20.png" alt="Profissional usando laptop" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
          
          {/* Right side - Imagens profissionais sobrepostas (Desktop only) */}
          <div className="relative hidden lg:flex justify-center items-center h-[540px] w-full">
            {/* Imagem do fundo */}
            <div className="absolute left-1/2 top-4 -translate-x-1/2 w-[288px] h-[512px] rounded-2xl overflow-hidden shadow-md z-10">
              <img src="/lovable-uploads/af57e688-b24f-4ece-be90-967fb4ba2c20.png" alt="Profissional usando laptop" className="w-full h-full object-cover" />
            </div>
            {/* Imagem do topo, levemente sobreposta e totalmente visível */}
            <div className="absolute left-[66%] top-16 w-[288px] h-[512px] rounded-2xl overflow-hidden shadow-lg">
              <img src="/lovable-uploads/26903308-a87b-46cb-8be6-413ebcea76d8.png" alt="Freelancer trabalhando" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 320" className="w-full h-auto">
          <path fill="#ffffff" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>;
};

export default HeroSection;
