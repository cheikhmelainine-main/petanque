import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Tournament,
  Team,
  Match,
  CreateTournamentData,
  CreateTeamData,
  UpdateMatchData,
  KnockoutResponse
} from '../types/api';

const API_BASE = '/api';

// Configuration axios
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Hook pour les tournois
export const useTournaments = () => {
  return useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const response = await api.get('/tournaments');
      return response.data;
    },
  });
};

export const useTournament = (id: string) => {
  return useQuery<Tournament>({
    queryKey: ['tournament', id],
    queryFn: async () => {
      const response = await api.get(`/tournaments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTournamentData) => {
      const response = await api.post('/tournaments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournoi créé avec succès !');
    },
    onError: (error: unknown) => {
      toast.error('Erreur lors de la création du tournoi');
      console.error('Create tournament error:', error);
    },
  });
};

export const useStartTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api.post(`/tournament/${tournamentId}/start`);
      return response.data;
    },
    onSuccess: (_, tournamentId: string) => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournoi démarré !');
    },
    onError: () => {
      toast.error('Erreur lors du démarrage du tournoi');
    },
  });
};

export const useNextRound = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api.post(`/tournament/${tournamentId}/next-round`);
      return response.data;
    },
    onSuccess: (_, tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Tour suivant généré !');
    },
    onError: () => {
      toast.error('Erreur lors de la génération du tour suivant');
    },
  });
};

export const useKnockoutPhase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api.post(`/tournament/${tournamentId}/knockout`);
      return response.data as KnockoutResponse;
    },
    onSuccess: (_, tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Phase d\'élimination créée !');
    },
    onError: () => {
      toast.error('Erreur lors de la création de la phase d\'élimination');
    },
  });
};

export const useNextGroupRound = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await api.post(`/tournament/${tournamentId}/next-group-round`);
      return response.data;
    },
    onSuccess: (_, tournamentId) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Round suivant démarré !');
    },
    onError: (error: unknown) => {
      const message = (error as any)?.response?.data?.message || 'Erreur lors du démarrage du round suivant';
      toast.error(message);
    },
  });
};

// Hook pour les équipes
export const useTeams = (tournamentId?: string) => {
  return useQuery<Team[]>({
    queryKey: ['teams', tournamentId],
    queryFn: async () => {
      const params = tournamentId ? `?tournamentId=${tournamentId}` : '';
      const response = await api.get(`/teams${params}`);
      return response.data;
    },
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTeamData) => {
      const response = await api.post('/teams', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.tournamentId] });
      toast.success('Équipe créée avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la création de l\'équipe');
    },
  });
};

export const useAddTeamsToTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tournamentId, teamIds }: { tournamentId: string; teamIds: string[] }) => {
      const response = await api.post(`/tournament/${tournamentId}/add-teams`, { teamIds });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament', variables.tournamentId] });
      toast.success('Équipes ajoutées avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout des équipes');
    },
  });
};

// Hook pour les matchs
export const useMatches = (tournamentId?: string, round?: number) => {
  return useQuery<Match[]>({
    queryKey: ['matches', tournamentId, round],
    queryFn: async () => {
      let params = '';
      if (tournamentId && round) {
        params = `?tournamentId=${tournamentId}&round=${round}`;
      } else if (tournamentId) {
        params = `?tournamentId=${tournamentId}`;
      }
      const response = await api.get(`/matches${params}`);
      return response.data;
    },
  });
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateMatchData) => {
      const response = await api.put('/matches', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Match mis à jour !');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du match');
    },
  });
};

// Hook pour mettre à jour le score d'un match
export const useUpdateMatchScore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      matchId: string;
      team1Score: number;
      team2Score: number;
      finishedBeforeTimeLimit: boolean;
    }) => {
      const updateData: UpdateMatchData = {
        action: 'update_score',
        matchId: data.matchId,
        team1Score: data.team1Score,
        team2Score: data.team2Score,
        finishedBeforeTimeLimit: data.finishedBeforeTimeLimit
      };
      const response = await api.put('/matches', updateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Score mis à jour !');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du score');
    },
  });
};

// Nouveau hook pour démarrer le timer d'un match
export const useStartMatchTimer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (matchId: string) => {
      const response = await api.put('/matches', {
        action: 'start_timer',
        matchId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Timer démarré !');
    },
    onError: () => {
      toast.error('Erreur lors du démarrage du timer');
    },
  });
};

// Nouveau hook pour arrêter le timer d'un match
export const useEndMatchTimer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (matchId: string) => {
      const response = await api.put('/matches', {
        action: 'end_timer',
        matchId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Timer arrêté !');
    },
    onError: () => {
      toast.error('Erreur lors de l\'arrêt du timer');
    },
  });
};

// Nouveau hook pour générer le deuxième tour des groupes
export const useGenerateGroupSecondRound = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tournamentId, groupNumber }: { tournamentId: string; groupNumber: number }) => {
      const response = await api.post(`/tournament/${tournamentId}/group-second-round`, { groupNumber });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Deuxième tour du groupe généré !');
    },
    onError: () => {
      toast.error('Erreur lors de la génération du deuxième tour');
    },
  });
};

// Nouveau hook pour générer les matchs de qualification de groupe
export const useGenerateGroupQualification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tournamentId, groupNumber }: { tournamentId: string; groupNumber: number }) => {
      const response = await api.post(`/tournament/${tournamentId}/group-qualification`, { groupNumber });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Match de qualification généré !');
    },
    onError: () => {
      toast.error('Erreur lors de la génération du match de qualification');
    },
  });
};

// Hook pour démarrer la poule suivante (pour les tournois GROUP)
export const useNextPoule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await fetch(`/api/tournament/${tournamentId}/next-poule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors du démarrage de la poule suivante');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Poule suivante démarrée !');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du démarrage de la poule suivante');
    },
  });
};

// Hook pour lancer les qualifications post-poules
export const useQualificationPhase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const response = await fetch(`/api/tournament/${tournamentId}/qualification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors du lancement des qualifications');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(`🏆 Qualifications lancées ! ${data.totalQualified} équipes qualifiées`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du lancement des qualifications');
    },
  });
}; 