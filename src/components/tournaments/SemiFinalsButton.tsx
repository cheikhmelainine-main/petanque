import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trophy, Users, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useSemiFinals, useCanStartSemiFinals } from '../../hooks/useApi';

interface SemiFinalsButtonProps {
  tournamentId: string;
  onSemiFinalsGenerated?: () => void;
}

interface QualifiedTeam {
  id: string;
  name: string;
  originalGroup: number;
  qualificationRank: number;
  qualificationType: string;
}

interface SemiFinalsResult {
  semiFinalMatchesCount: number;
  qualifiedTeamsCount: number;
  semiFinalMatches: Array<{
    id: string;
    round: number;
    team1Id: string;
    team2Id: string;
    eliminationRound: string;
  }>;
  qualifiedTeams: QualifiedTeam[];
}

export default function SemiFinalsButton({ 
  tournamentId, 
  onSemiFinalsGenerated
}: SemiFinalsButtonProps) {
  const [result, setResult] = useState<SemiFinalsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: canStartData, isLoading: isLoadingCheck } = useCanStartSemiFinals(tournamentId);
  const semiFinals = useSemiFinals();

  const handleSemiFinals = async () => {
    setError(null);
    setResult(null);

    try {
      const response = await semiFinals.mutateAsync(tournamentId);
      setResult(response.data);
      
      // Appeler le callback si fourni
      if (onSemiFinalsGenerated) {
        onSemiFinalsGenerated();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const canStart = canStartData?.canStart || false;
  const qualifiedTeams = canStartData?.qualifiedTeams || [];
  const message = canStartData?.message;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            Demi-finale des Qualifiés
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Lancez un tirage au sort entre les gagnants de la phase d'élimination directe pour organiser les demi-finales
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCheck ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-sm text-gray-600">Vérification en cours...</span>
            </div>
          ) : (
            <>
              <Button 
                onClick={handleSemiFinals}
                disabled={!canStart || semiFinals.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                {semiFinals.isPending ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Afficher Demi-finale des Qualifiés
                  </>
                )}
              </Button>

              {!canStart && message && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Conditions non remplies</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">{message}</p>
                </div>
              )}

              {qualifiedTeams.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      {qualifiedTeams.length} équipes gagnantes de la phase d'élimination
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {qualifiedTeams.slice(0, 6).map((team: QualifiedTeam) => (
                      <div key={team.id} className="flex items-center justify-between p-2 bg-white rounded border border-l-4 border-green-500">
                        <span className="text-sm font-medium">{team.name}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            G{team.originalGroup}
                          </Badge>
                          <Badge className="text-xs bg-green-100 text-green-800">
                            Gagnant
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {qualifiedTeams.length > 6 && (
                      <div className="col-span-2 text-center text-sm text-gray-500">
                        +{qualifiedTeams.length - 6} autres équipes gagnantes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {result && (
                <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-semibold">Demi-finales générées avec succès !</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">
                        <strong>{result.qualifiedTeamsCount}</strong> équipes qualifiées
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-pink-500" />
                      <span className="text-sm">
                        <strong>{result.semiFinalMatchesCount}</strong> matchs de demi-finale
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Matchs de demi-finale créés :</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {result.semiFinalMatches.map((match) => (
                        <div key={match.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="text-sm font-medium">
                            Match {match.round} - {match.eliminationRound}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Prêt
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 