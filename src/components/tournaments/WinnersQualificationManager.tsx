import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Trophy, Users, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

interface Team {
  _id: string;
  name: string;
  qualificationRank: number;
  originalGroup: number;
  qualificationType: string;
  isQualified?: boolean;
}

interface WinnersQualificationManagerProps {
  tournamentId: string;
  onQualificationGenerated?: () => void;
}

export default function WinnersQualificationManager({ 
  tournamentId, 
  onQualificationGenerated 
}: WinnersQualificationManagerProps) {
  const [qualifiedTeams, setQualifiedTeams] = useState<Team[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Récupérer les équipes qualifiées gagnantes
  const fetchQualifiedTeams = async () => {
    try {
      const response = await axios.get(`/api/teams?tournamentId=${tournamentId}`);
      const teams = response.data;
      const winnersTeams = teams.filter((team: Team) => 
        team.qualificationType === 'winners_final' && team.isQualified
      );
      setQualifiedTeams(winnersTeams);
    } catch (error) {
      console.error('Erreur lors de la récupération des équipes qualifiées:', error);
    }
  };

  useEffect(() => {
    fetchQualifiedTeams();
  }, [tournamentId]);

  const generateWinnersQualification = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`/api/tournament/${tournamentId}/winners-qualification`);
      
      if (response.data.success) {
        setSuccess('Qualifications du bracket des gagnants générées avec succès !');
        setQualifiedTeams(response.data.qualifiedTeams);
        onQualificationGenerated?.();
      } else {
        setError(response.data.error || 'Erreur lors de la génération des qualifications');
      }
    } catch (error: any) {
      console.error('Erreur lors de la génération des qualifications gagnantes:', error);
      setError(error.response?.data?.error || 'Erreur lors de la génération des qualifications gagnantes');
    } finally {
      setIsGenerating(false);
    }
  };

  const winnersTeams = qualifiedTeams.filter(team => team.qualificationType === 'winners_final');

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Trophy className="h-5 w-5" />
          Bracket des Gagnants
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
            Équipes Qualifiées pour le Bracket des Gagnants
          </h3>
          
          {winnersTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune équipe gagnante qualifiée pour le moment</p>
              <p className="text-sm">Terminez les finales de groupe pour qualifier les équipes</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {winnersTeams.map((team, index) => (
                <div 
                  key={team._id} 
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
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
            onClick={generateWinnersQualification}
            disabled={isGenerating || winnersTeams.length < 4}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Génération en cours...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Générer le Bracket des Gagnants
              </>
            )}
          </Button>
        </div>

        {winnersTeams.length > 0 && winnersTeams.length < 4 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700 text-sm text-center">
              ⚠️ Il faut au moins 4 équipes gagnantes qualifiées pour générer le bracket
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 