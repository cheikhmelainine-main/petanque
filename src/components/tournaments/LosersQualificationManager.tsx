import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Shield, Users, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface Team {
  _id: string;
  name: string;
  qualificationRank: number;
  originalGroup: number;
  qualificationType: string;
  isQualified?: boolean;
}

interface LosersQualificationManagerProps {
  tournamentId: string;
  onQualificationGenerated?: () => void;
}

export default function LosersQualificationManager({ 
  tournamentId, 
  onQualificationGenerated 
}: LosersQualificationManagerProps) {
  const [qualifiedTeams, setQualifiedTeams] = useState<Team[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Récupérer les équipes qualifiées perdantes
  const fetchQualifiedTeams = async () => {
    try {
      const response = await axios.get(`/api/teams?tournamentId=${tournamentId}`);
      const teams = response.data;
      const losersTeams = teams.filter((team: Team) => 
        team.qualificationType === 'losers_final' && team.isQualified
      );
      setQualifiedTeams(losersTeams);
    } catch (error) {
      console.error('Erreur lors de la récupération des équipes qualifiées:', error);
    }
  };

  useEffect(() => {
    fetchQualifiedTeams();
  }, [tournamentId]);

  const generateLosersQualification = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`/api/tournament/${tournamentId}/losers-qualification`);
      
      if (response.data.success) {
        setSuccess('Qualifications du bracket des perdants générées avec succès !');
        setQualifiedTeams(response.data.qualifiedTeams);
        onQualificationGenerated?.();
      } else {
        setError(response.data.error || 'Erreur lors de la génération des qualifications');
      }
    } catch (error: unknown) {
      console.error('Erreur lors de la génération des qualifications perdantes:', error);
      const errorMessage = (error as any)?.response?.data?.error || 'Erreur lors de la génération des qualifications perdantes';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const losersTeams = qualifiedTeams.filter(team => team.qualificationType === 'losers_final');

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <Shield className="h-5 w-5" />
          Bracket des Perdants
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Équipes Qualifiées pour le Bracket des Perdants
          </h3>
          
          {losersTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune équipe perdante qualifiée pour le moment</p>
              <p className="text-sm">Terminez les finales de groupe pour qualifier les équipes</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {losersTeams.map((team) => (
                <div 
                  key={team._id} 
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      #{team.qualificationRank}
                    </Badge>
                    <span className="font-medium text-gray-800">{team.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Groupe {team.originalGroup}
                    </Badge>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={generateLosersQualification}
            disabled={isGenerating || losersTeams.length < 4}
            className="bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Génération en cours...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Générer le Bracket des Perdants
              </>
            )}
          </Button>
        </div>

        {losersTeams.length > 0 && losersTeams.length < 4 && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-gray-700 text-sm text-center">
              ⚠️ Il faut au moins 4 équipes perdantes qualifiées pour générer le bracket
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 