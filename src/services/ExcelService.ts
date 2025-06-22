import * as XLSX from 'xlsx';
import { ITeam, IPlayer } from '../models/Team';

export class ExcelService {

  /**
   * Importer les équipes depuis un fichier Excel
   */
  static parseTeamsFromExcel(buffer: Buffer): Partial<ITeam>[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir en JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const teams: Partial<ITeam>[] = [];
      
      for (const row of data as any[]) {
        // Format attendu: Nom_Equipe, Joueur1, Email1, Telephone1, Joueur2, Email2, Telephone2, Joueur3, Email3, Telephone3
        const teamName = row['Nom_Equipe'] || row['Team_Name'] || row['Équipe'];
        
        if (!teamName) continue;
        
        const players: IPlayer[] = [];
        
        // Traiter jusqu'à 3 joueurs
        for (let i = 1; i <= 3; i++) {
          const playerName = row[`Joueur${i}`] || row[`Player${i}`] || row[`Joueur_${i}`];
          
          if (playerName) {
            const player: IPlayer = {
              name: playerName.toString().trim(),
              email: row[`Email${i}`] || row[`Email_${i}`] || undefined,
              phone: row[`Telephone${i}`] || row[`Phone${i}`] || row[`Téléphone${i}`] || undefined
            };
            
            players.push(player);
          }
        }
        
        if (players.length > 0) {
          const team: Partial<ITeam> = {
            name: teamName.toString().trim(),
            players,
            type: players.length === 1 ? 'individual' : players.length === 2 ? 'doubles' : 'triples'
          };
          
          teams.push(team);
        }
      }
      
      return teams;
    } catch (error) {
      console.error('Erreur lors du parsing Excel:', error);
      throw new Error('Erreur lors de la lecture du fichier Excel');
    }
  }

  /**
   * Exporter les équipes vers Excel
   */
  static exportTeamsToExcel(teams: ITeam[]): Buffer {
    try {
      const data = teams.map(team => {
        const row: any = {
          'Nom_Equipe': team.name,
          'Type': team.type,
          'Victoires': team.stats.wins,
          'Défaites': team.stats.losses,
          'Nuls': team.stats.draws,
          'Points': team.stats.points,
          'Différence': team.stats.scoreDifference,
          'Matchs_Joués': team.stats.gamesPlayed
        };
        
        // Ajouter les joueurs
        team.players.forEach((player, index) => {
          row[`Joueur${index + 1}`] = player.name;
          if (player.email) row[`Email${index + 1}`] = player.email;
          if (player.phone) row[`Telephone${index + 1}`] = player.phone;
        });
        
        return row;
      });
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Équipes');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return buffer;
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      throw new Error('Erreur lors de la génération du fichier Excel');
    }
  }

  /**
   * Exporter les résultats d'un tournoi
   */
  static exportTournamentResults(tournament: any, teams: ITeam[], matches: any[]): Buffer {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Feuille classement
      const rankingData = teams
        .sort((a, b) => {
          if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
          if (b.stats.scoreDifference !== a.stats.scoreDifference) return b.stats.scoreDifference - a.stats.scoreDifference;
          return b.stats.wins - a.stats.wins;
        })
        .map((team, index) => ({
          'Position': index + 1,
          'Équipe': team.name,
          'Joueurs': team.players.map(p => p.name).join(', '),
          'Points': team.stats.points,
          'Victoires': team.stats.wins,
          'Défaites': team.stats.losses,
          'Nuls': team.stats.draws,
          'Différence': team.stats.scoreDifference,
          'Matchs_Joués': team.stats.gamesPlayed
        }));
      
      const rankingSheet = XLSX.utils.json_to_sheet(rankingData);
      XLSX.utils.book_append_sheet(workbook, rankingSheet, 'Classement');
      
      // Feuille matchs
      const matchesData = matches.map(match => ({
        'Tour': match.round,
        'Équipe_1': match.team1?.name || 'N/A',
        'Score_1': match.score1,
        'Équipe_2': match.team2?.name || 'N/A',
        'Score_2': match.score2,
        'Statut': match.status,
        'Gagnant': match.winner?.name || (match.isDraw ? 'Nul' : 'N/A'),
        'Points_Équipe_1': match.pointsTeam1,
        'Points_Équipe_2': match.pointsTeam2,
        'Durée': match.startTime && match.endTime ? 
          Math.round((new Date(match.endTime).getTime() - new Date(match.startTime).getTime()) / 60000) + ' min' : 
          'N/A'
      }));
      
      const matchesSheet = XLSX.utils.json_to_sheet(matchesData);
      XLSX.utils.book_append_sheet(workbook, matchesSheet, 'Matchs');
      
      // Informations du tournoi
      const tournamentInfo = [{
        'Nom': tournament.name,
        'Type': tournament.type,
        'Statut': tournament.status,
        'Nombre_Équipes': teams.length,
        'Tour_Actuel': tournament.currentRound,
        'Tours_Max': tournament.maxRounds,
        'Date_Création': new Date(tournament.createdAt).toLocaleDateString('fr-FR'),
        'Date_Début': tournament.startedAt ? new Date(tournament.startedAt).toLocaleDateString('fr-FR') : 'N/A',
        'Date_Fin': tournament.completedAt ? new Date(tournament.completedAt).toLocaleDateString('fr-FR') : 'N/A'
      }];
      
      const infoSheet = XLSX.utils.json_to_sheet(tournamentInfo);
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informations');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return buffer;
    } catch (error) {
      console.error('Erreur lors de l\'export des résultats:', error);
      throw new Error('Erreur lors de la génération du rapport');
    }
  }

  /**
   * Générer un template Excel pour l'import d'équipes
   */
  static generateTeamImportTemplate(): Buffer {
    try {
      const templateData = [
        {
          'Nom_Equipe': 'Exemple Équipe 1',
          'Joueur1': 'Jean Dupont',
          'Email1': 'jean.dupont@email.com',
          'Telephone1': '0123456789',
          'Joueur2': 'Marie Martin',
          'Email2': 'marie.martin@email.com',
          'Telephone2': '0987654321',
          'Joueur3': '',
          'Email3': '',
          'Telephone3': ''
        },
        {
          'Nom_Equipe': 'Exemple Équipe 2',
          'Joueur1': 'Pierre Durand',
          'Email1': 'pierre.durand@email.com',
          'Telephone1': '0147258369',
          'Joueur2': '',
          'Email2': '',
          'Telephone2': '',
          'Joueur3': '',
          'Email3': '',
          'Telephone3': ''
        }
      ];
      
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Ajouter des commentaires/instructions
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!cols'] = [];
      
      for (let col = 0; col <= range.e.c; col++) {
        worksheet['!cols'][col] = { wch: 20 };
      }
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Équipes');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return buffer;
    } catch (error) {
      console.error('Erreur lors de la génération du template:', error);
      throw new Error('Erreur lors de la génération du template');
    }
  }
} 