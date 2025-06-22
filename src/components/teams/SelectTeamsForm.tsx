import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Check, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTeams } from '../../hooks/useApi';
import { Team } from '../../types/api';

interface SelectTeamsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  onTeamsSelected: (teamIds: string[]) => void;
}

export const SelectTeamsForm: React.FC<SelectTeamsFormProps> = ({ 
  open, 
  onOpenChange, 
  tournamentId,
  onTeamsSelected
}) => {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: teams = [], isLoading } = useTeams();

  // Filtrer les équipes qui ne sont pas déjà dans ce tournoi
  const availableTeams = teams.filter(team => {
    const isNotInTournament = (!team.tournamentId || team.tournamentId !== tournamentId) &&
                              (!team.tournament || team.tournament !== tournamentId);
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    return isNotInTournament && matchesSearch;
  });

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSubmit = () => {
    onTeamsSelected(selectedTeamIds);
    setSelectedTeamIds([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedTeamIds([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Sélectionner des équipes
          </DialogTitle>
          <DialogDescription>
            Choisissez les équipes à ajouter au tournoi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher une équipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Équipes sélectionnées */}
          {selectedTeamIds.length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                Équipes sélectionnées ({selectedTeamIds.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTeamIds.map(teamId => {
                  const team = teams.find(t => t._id === teamId);
                  return team ? (
                    <Badge key={teamId} variant="secondary" className="bg-green-100 text-green-800">
                      {team.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Liste des équipes disponibles */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Chargement des équipes...
              </div>
            ) : availableTeams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Aucune équipe trouvée pour cette recherche' : 'Aucune équipe disponible'}
              </div>
            ) : (
              availableTeams.map((team) => (
                <motion.div
                  key={team._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                  onClick={() => toggleTeamSelection(team._id)}
                >
                  <Card className={`transition-all ${
                    selectedTeamIds.includes(team._id)
                      ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'hover:shadow-md'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              selectedTeamIds.includes(team._id)
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedTeamIds.includes(team._id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {team.name}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span>{(team.members?.length || team.players?.length) || 0} joueurs</span>
                                {team.points !== undefined && (
                                  <span>{team.points} pts</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Membres de l'équipe */}
                        {(team.members || team.players) && (team.members || team.players)!.length > 0 && (
                          <div className="text-xs text-gray-400">
                            {(team.members || team.players)!.slice(0, 2).map(member => member.name).join(', ')}
                            {(team.members || team.players)!.length > 2 && ` +${(team.members || team.players)!.length - 2}`}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedTeamIds.length === 0}
          >
            Ajouter {selectedTeamIds.length} équipe{selectedTeamIds.length > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelectTeamsForm; 