import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { useCreateTeam } from '../../hooks/useApi';
import { CreateTeamData } from '../../types/api';

interface CreateTeamFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  maxPlayers?: number;
}

export const CreateTeamForm: React.FC<CreateTeamFormProps> = ({ 
  open, 
  onOpenChange, 
  tournamentId,
  maxPlayers = 3
}) => {
  const [teamName, setTeamName] = useState('');
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);

  const createTeam = useCreateTeam();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validPlayerNames = playerNames.filter(name => name.trim());
    
    if (!teamName.trim() || validPlayerNames.length === 0) {
      return;
    }

    const teamData: CreateTeamData = {
      name: teamName.trim(),
      tournamentId,
      memberNames: validPlayerNames
    };

    createTeam.mutate(teamData, {
      onSuccess: () => {
        setTeamName('');
        setPlayerNames(['', '']);
        onOpenChange(false);
      }
    });
  };

  const addPlayer = () => {
    if (playerNames.length < maxPlayers) {
      setPlayerNames([...playerNames, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (playerNames.length > 1) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const validPlayerCount = playerNames.filter(name => name.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Ajouter une équipe
          </DialogTitle>
          <DialogDescription>
            Inscrivez une nouvelle équipe au tournoi
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom de l'équipe */}
          <div>
            <Label htmlFor="teamName">Nom de l&apos;équipe *</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Les Champions"
              required
            />
          </div>

          {/* Joueurs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Joueurs ({validPlayerCount}/{maxPlayers})</Label>
              {playerNames.length < maxPlayers && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPlayer}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {playerNames.map((name, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={name}
                    onChange={(e) => updatePlayerName(index, e.target.value)}
                    placeholder={`Joueur ${index + 1}`}
                    className="flex-1"
                  />
                  {playerNames.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlayer(index)}
                      className="shrink-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Au moins 1 joueur requis. Maximum {maxPlayers} joueurs par équipe.
            </p>
          </div>

          {/* Aperçu de l'équipe */}
          {teamName.trim() && validPlayerCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Aperçu de l&apos;équipe
              </h5>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="font-medium">{teamName}</div>
                <div className="text-xs mt-1">
                  Joueurs : {playerNames.filter(name => name.trim()).join(', ')}
                </div>
              </div>
            </motion.div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTeam.isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                createTeam.isPending || 
                !teamName.trim() || 
                validPlayerCount === 0
              }
            >
              {createTeam.isPending ? 'Ajout...' : 'Ajouter l&apos;équipe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamForm; 