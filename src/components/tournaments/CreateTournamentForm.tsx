import React, { useState } from 'react';
import { Trophy, Calendar, Users, Target } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useCreateTournament } from '../../hooks/useApi';
import { TournamentType, TeamFormat, CreateTournamentData } from '../../types/api';
import { useSession } from 'next-auth/react';

interface CreateTournamentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTournamentForm: React.FC<CreateTournamentFormProps> = ({ open, onOpenChange }) => {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<Omit<CreateTournamentData, 'createdById'>>({
    name: '',
    type: TournamentType.SWISS,
    format: TeamFormat.DOUBLES,
    rounds: 5,
    startDate: new Date().toISOString().split('T')[0],
    groupSize: 4,
    hasTimedMatches: true,
    matchTimeLimit: 45
  });

  const createTournament = useCreateTournament();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Le nom du tournoi est requis');
      return;
    }

    if (!session?.user?.id) {
      alert('Vous devez être connecté pour créer un tournoi');
      return;
    }

    createTournament.mutate({
      name: formData.name,
      type: formData.type,
      format: formData.format,
      rounds: formData.rounds,
      startDate: new Date(formData.startDate).toISOString(),
      createdById: session.user.id,
      groupSize: formData.groupSize,
      hasTimedMatches: formData.hasTimedMatches,
      matchTimeLimit: formData.matchTimeLimit
    }, {
      onSuccess: () => {
        setFormData({
          name: '',
          type: TournamentType.SWISS,
          format: TeamFormat.DOUBLES,
          rounds: 5,
          startDate: new Date().toISOString().split('T')[0],
          groupSize: 4,
          hasTimedMatches: true,
          matchTimeLimit: 45
        });
        onOpenChange(false);
      }
    });
  };

  const handleChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isGroupTournament = formData.type === TournamentType.GROUP;
  const isTimedTournament = formData.type === TournamentType.SWISS || formData.type === TournamentType.MARATHON;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-blue-600" />
            Nouveau tournoi
          </DialogTitle>
          <DialogDescription className="text-sm">
            Créez un nouveau tournoi de pétanque
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom du tournoi */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nom du tournoi
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: Championnat d'été 2024"
              className="h-9"
              required
            />
          </div>

          {/* Type et Format en ligne */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Target className="h-3 w-3" />
                Type
              </Label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value={TournamentType.SWISS}>Swiss</option>
                <option value={TournamentType.GROUP}>Groupe</option>
                <option value={TournamentType.MARATHON}>Marathon</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                Format
              </Label>
              <select
                value={formData.format}
                onChange={(e) => handleChange('format', e.target.value)}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value={TeamFormat.SINGLES}>Simples</option>
                <option value={TeamFormat.DOUBLES}>Doubles</option>
                <option value={TeamFormat.TRIPLETS}>Triplets</option>
              </select>
            </div>
          </div>

          {/* Configuration spécifique selon le type */}
          <div className="grid grid-cols-2 gap-3">
            {isGroupTournament ? (
              <div className="space-y-2">
                <Label htmlFor="groupSize" className="text-sm font-medium">
                  Taille des groupes
                </Label>
                <select
                  value={formData.groupSize}
                  onChange={(e) => handleChange('groupSize', parseInt(e.target.value))}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value={3}>3 équipes</option>
                  <option value={4}>4 équipes</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rounds" className="text-sm font-medium">
                  Tours
                </Label>
                <Input
                  id="rounds"
                  type="number"
                  value={formData.rounds}
                  onChange={(e) => handleChange('rounds', parseInt(e.target.value) || 5)}
                  min="3"
                  max="10"
                  className="h-9"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="h-9"
                required
              />
            </div>
          </div>

          {/* Configuration des matchs temporisés */}
          {isTimedTournament && (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasTimedMatches"
                  checked={formData.hasTimedMatches}
                  onChange={(e) => handleChange('hasTimedMatches', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="hasTimedMatches" className="text-sm font-medium">
                  Matchs avec limite de temps
                </Label>
              </div>
              
              {formData.hasTimedMatches && (
                <div className="space-y-2">
                  <Label htmlFor="matchTimeLimit" className="text-sm font-medium">
                    Limite de temps (minutes)
                  </Label>
                  <Input
                    id="matchTimeLimit"
                    type="number"
                    value={formData.matchTimeLimit}
                    onChange={(e) => handleChange('matchTimeLimit', parseInt(e.target.value) || 45)}
                    min="15"
                    max="120"
                    className="h-9"
                  />
                  <p className="text-xs text-gray-600">
                    • Gagnant avec 13 points avant temps : 3 points tournoi<br/>
                    • Gagnant dans le temps limite : 2 points tournoi<br/>
                    • Égalité dans le temps : 1 point chacun
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createTournament.isPending}
              className="flex-1 h-9"
            >
              {createTournament.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTournamentForm; 