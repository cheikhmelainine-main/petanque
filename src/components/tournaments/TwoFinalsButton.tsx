import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trophy, Crown, Medal, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useTwoFinals, useCanStartTwoFinals } from '../../hooks/useApi';

interface TwoFinalsButtonProps {
  tournamentId: string;
  onFinalsGenerated?: () => void;
}

interface Team {
  id: string;
  name: string;
  originalGroup: number;
  qualificationRank: number;
}

interface FinalsResult {
  winnersFinal: {
    id: string;
    round: number;
    team1Id: string;
    team2Id: string;
    eliminationRound: string;
  };
  losersFinal: {
    id: string;
    round: number;
    team1Id: string;
    team2Id: string;
    eliminationRound: string;
  };
}

export default function TwoFinalsButton({ 
  tournamentId, 
  onFinalsGenerated
}: TwoFinalsButtonProps) {
  const [result, setResult] = useState<FinalsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: canStartData, isLoading: isLoadingCheck } = useCanStartTwoFinals(tournamentId);
  const twoFinals = useTwoFinals();

  const handleTwoFinals = async () => {
    setError(null);
    setResult(null);

    try {
      const response = await twoFinals.mutateAsync(tournamentId);
      setResult(response.data);
      
      // Appeler le callback si fourni
      if (onFinalsGenerated) {
        onFinalsGenerated();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const canStart = canStartData?.canStart || false;
  const winnersTeams = canStartData?.winnersTeams || [];
  const losersTeams = canStartData?.losersTeams || [];
  const message = canStartData?.message;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Lancer les Deux Finales
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Créez une finale entre les équipes gagnantes et une finale entre les équipes éliminées
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCheck ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
              <span className="ml-2 text-sm text-gray-600">Vérification en cours...</span>
            </div>
          ) : (
            <>
              <Button 
                onClick={handleTwoFinals}
                disabled={!canStart || twoFinals.isPending}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                size="lg"
              >
                {twoFinals.isPending ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Lancer les Deux Finales
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

              {(winnersTeams.length > 0 || losersTeams.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Finale des gagnants */}
                  {winnersTeams.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">
                          Finale des Gagnants ({winnersTeams.length} équipes)
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {winnersTeams.map((team: Team) => (
                          <div key={team.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm font-medium">{team.name}</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">
                                G{team.originalGroup}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {team.qualificationRank === 1 ? '1er' : '2e'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Finale des perdants */}
                  {losersTeams.length > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Medal className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-800">
                          Finale des Perdants ({losersTeams.length} équipes)
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {losersTeams.map((team: Team) => (
                          <div key={team.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm font-medium">{team.name}</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">
                                G{team.originalGroup}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {team.qualificationRank === 1 ? '1er' : '2e'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <span className="font-semibold">Deux finales générées avec succès !</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Finale des gagnants */}
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Finale des Gagnants</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Match créé - {result.winnersFinal.eliminationRound}
                      </p>
                    </div>

                    {/* Finale des perdants */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Medal className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-800">Finale des Perdants</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        Match créé - {result.losersFinal.eliminationRound}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Badge variant="outline" className="text-sm">
                      🎉 Le tournoi est maintenant terminé !
                    </Badge>
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