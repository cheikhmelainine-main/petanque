export const validateTournament = (tournamentData: any) => {
  const errors: string[] = [];

  if (!tournamentData.name || typeof tournamentData.name !== 'string' || tournamentData.name.trim().length === 0) {
    errors.push('Le nom du tournoi est requis');
  }

  if (!tournamentData.type || !['groups', 'swiss', 'marathon'].includes(tournamentData.type)) {
    errors.push('Le type de tournoi doit être: groups, swiss, ou marathon');
  }

  if (!tournamentData.settings) {
    errors.push('Les paramètres du tournoi sont requis');
  } else {
    const { settings } = tournamentData;

    // Validation pour les tournois de groupes
    if (tournamentData.type === 'groups') {
      if (!settings.playersPerGroup || ![3, 4].includes(settings.playersPerGroup)) {
        errors.push('Le nombre de joueurs par groupe doit être 3 ou 4');
      }
    }

    // Validation pour les tournois suisse et marathon
    if (['swiss', 'marathon'].includes(tournamentData.type)) {
      if (!settings.rounds || ![4, 5].includes(settings.rounds)) {
        errors.push('Le nombre de tours doit être 4 ou 5');
      }

      if (!settings.timeLimit || settings.timeLimit < 30 || settings.timeLimit > 120) {
        errors.push('La limite de temps doit être entre 30 et 120 minutes');
      }
    }

    // Validation du score gagnant
    if (settings.winningScore && ![11, 13].includes(settings.winningScore)) {
      errors.push('Le score gagnant doit être 11 ou 13');
    }

    // Validation du type d'équipe
    if (settings.teamType && !['individual', 'doubles', 'triples'].includes(settings.teamType)) {
      errors.push('Le type d\'équipe doit être: individual, doubles, ou triples');
    }

    // Validation du nombre maximum d'équipes
    if (settings.maxTeams && (settings.maxTeams < 4 || settings.maxTeams > 256)) {
      errors.push('Le nombre maximum d\'équipes doit être entre 4 et 256');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateTeam = (teamData: any) => {
  const errors: string[] = [];

  if (!teamData.name || typeof teamData.name !== 'string' || teamData.name.trim().length === 0) {
    errors.push('Le nom de l\'équipe est requis');
  }

  if (!teamData.players || !Array.isArray(teamData.players)) {
    errors.push('La liste des joueurs est requise');
  } else {
    if (teamData.players.length < 1 || teamData.players.length > 3) {
      errors.push('Une équipe doit avoir entre 1 et 3 joueurs');
    }

    teamData.players.forEach((player: any, index: number) => {
      if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
        errors.push(`Le nom du joueur ${index + 1} est requis`);
      }

      if (player.email && !isValidEmail(player.email)) {
        errors.push(`L'email du joueur ${index + 1} n'est pas valide`);
      }

      if (player.phone && !isValidPhone(player.phone)) {
        errors.push(`Le téléphone du joueur ${index + 1} n'est pas valide`);
      }
    });

    // Vérifier les doublons de noms
    const playerNames = teamData.players.map((p: any) => p.name?.toLowerCase());
    const uniqueNames = new Set(playerNames);
    if (uniqueNames.size !== playerNames.length) {
      errors.push('Les noms des joueurs doivent être uniques dans l\'équipe');
    }
  }

  // Validation du type d'équipe si fourni
  if (teamData.type && !['individual', 'doubles', 'triples'].includes(teamData.type)) {
    errors.push('Le type d\'équipe doit être: individual, doubles, ou triples');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMatch = (matchData: any) => {
  const errors: string[] = [];

  if (!matchData.team1 || typeof matchData.team1 !== 'string') {
    errors.push('L\'équipe 1 est requise');
  }

  if (!matchData.team2 || typeof matchData.team2 !== 'string') {
    errors.push('L\'équipe 2 est requise');
  }

  if (matchData.team1 === matchData.team2) {
    errors.push('Une équipe ne peut pas jouer contre elle-même');
  }

  if (matchData.round && (typeof matchData.round !== 'number' || matchData.round < 1)) {
    errors.push('Le numéro de tour doit être un nombre positif');
  }

  if (matchData.timeLimit && (typeof matchData.timeLimit !== 'number' || matchData.timeLimit < 30 || matchData.timeLimit > 120)) {
    errors.push('La limite de temps doit être entre 30 et 120 minutes');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateScore = (score1: any, score2: any, winningScore: number = 13) => {
  const errors: string[] = [];

  if (typeof score1 !== 'number' || score1 < 0) {
    errors.push('Le score de l\'équipe 1 doit être un nombre positif');
  }

  if (typeof score2 !== 'number' || score2 < 0) {
    errors.push('Le score de l\'équipe 2 doit être un nombre positif');
  }

  if (score1 > winningScore && score2 > winningScore) {
    errors.push('Les deux équipes ne peuvent pas dépasser le score gagnant');
  }

  if (score1 === winningScore && score2 === winningScore) {
    errors.push('Les deux équipes ne peuvent pas avoir le score gagnant');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Fonctions utilitaires
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  // Format français: 0123456789 ou +33123456789
  const phoneRegex = /^(?:\+33|0)[1-9](?:[0-9]{8})$/;
  return phoneRegex.test(phone.replace(/[\s\-\.]/g, ''));
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>\"'&]/g, '');
};

export const validateObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
}; 