import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Briefcase, User, Building, MapPin, Star, DollarSign, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GlobalSearchService, SearchResult } from '@/services/globalSearchService';
import { useAppSelector } from '@/hooks/redux';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'freelancer' | 'client';
  userId?: string; // ID do usuário para buscar projetos próprios (clientes)
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, userType, userId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const userProfile = useAppSelector(state => state.auth.userProfile);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      setLoading(true);
      if (userType === 'client') {
        GlobalSearchService.searchForClient(searchTerm, userId || '')
          .then(setResults)
          .finally(() => setLoading(false));
      } else {
        GlobalSearchService.searchForFreelancer(searchTerm)
          .then(setResults)
          .finally(() => setLoading(false));
      }
    } else {
      setResults([]);
    }
  }, [searchTerm, userType, userId]);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      GlobalSearchService.getSuggestions(searchTerm, userType, userId)
        .then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, userType, userId]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setShowSuggestions(false);
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onClose();
    setSearchTerm('');
    setResults([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case 'freelancer':
        return <User className="h-4 w-4 text-green-600" />;
      case 'client':
        return <Building className="h-4 w-4 text-purple-600" />;
      default:
        return <Search className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Projeto';
      case 'freelancer':
        return 'Freelancer';
      case 'client':
        return 'Cliente';
      default:
        return 'Resultado';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDescription = (description: string) => {
    if (description.length > 100) {
      return description.substring(0, 100) + '...';
    }
    return description;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[100dvw] h-[100dvh] max-w-none max-h-none md:max-w-2xl md:max-h-[80dvh] md:rounded-lg overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-4 md:p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca Global
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-4">
            {/* Campo de busca */}
            <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={inputRef}
              placeholder={userType === 'freelancer' 
                ? 'Buscar projetos abertos, clientes...' 
                : 'Buscar freelancers, meus projetos...'
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setResults([]);
                  setSuggestions([]);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sugestões */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Sugestões:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Resultados */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Buscando...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {result.image ? (
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              <img src={result.image} alt={result.title} className="h-full w-full object-cover rounded-full" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {getTypeIcon(result.type)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{result.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(result.type)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {formatDescription(result.description)}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {result.metadata?.price && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatPrice(result.metadata.price)}
                            </div>
                          )}
                          
                          {result.metadata?.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {result.metadata.rating.toFixed(1)}
                            </div>
                          )}
                          
                          {result.metadata?.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {result.metadata.location}
                            </div>
                          )}
                          
                          {result.metadata?.status && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {result.metadata.status}
                            </div>
                          )}
                        </div>
                        
                        {result.metadata?.skills && result.metadata.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.metadata.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {result.metadata.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{result.metadata.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm.trim().length >= 2 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum resultado encontrado para "{searchTerm}"</p>
                <p className="text-sm text-gray-500 mt-1">
                  Tente usar termos diferentes ou verifique a ortografia
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Digite pelo menos 2 caracteres para começar a buscar
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {userType === 'freelancer' 
                    ? 'Busque por projetos abertos, clientes ou habilidades'
                    : 'Busque por freelancers, seus projetos ou habilidades'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchModal;
