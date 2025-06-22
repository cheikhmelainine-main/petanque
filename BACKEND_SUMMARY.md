# Backend Simplifié - Tournois de Pétanque

## Structure Créée

### 📁 Modèles MongoDB (`src/models/`)
```
User.ts        - Utilisateurs (email, password, role, createdAt)
Tournament.ts  - Tournois (name, type, format, status, rounds, dates)
Team.ts        - Équipes (name, tournamentId, groupNumber, points, scoreDiff)
TeamMember.ts  - Membres d'équipe (name, teamId)
Match.ts       - Matchs (teams, scores, status, round, roundType)
```

### 🔧 Services (`src/services/`)
```
TournamentService.ts - Logique métier simplifiée
```

### 🌐 API Routes (`src/pages/api/`)
```
tournaments.ts           - CRUD tournois
teams.ts                - CRUD équipes
matches.ts              - CRUD matchs
tournament/[id]/start.ts - Démarrer tournoi
```

## 🏆 Types de Tournois

### GROUP
- Groupes de 3-4 équipes
- Round robin dans chaque groupe
- Qualification selon classement

### SWISS  
- 4-5 tours avec appariement par classement
- 3 points victoire avant temps, 2 points victoire après temps, 1 point nul
- Départage par différence de score

### MARATHON
- Identique au Swiss mais appariement aléatoire
- Même système de points

## 📊 Formats d'Équipe

- **SINGLES** : 1 joueur
- **DOUBLES** : 2 joueurs  
- **TRIPLETS** : 3 joueurs

## 🚀 Usage

### Créer un tournoi
```bash
POST /api/tournaments
{
  "name": "Championnat 2024",
  "type": "SWISS",
  "format": "DOUBLES", 
  "rounds": 5,
  "startDate": "2024-01-01",
  "createdById": "userId"
}
```

### Ajouter une équipe
```bash
POST /api/teams
{
  "name": "Les Champions",
  "tournamentId": "tournamentId",
  "memberNames": ["Jean", "Marie"]
}
```

### Démarrer le tournoi
```bash
POST /api/tournament/{id}/start
```

### Mettre à jour un match
```bash
PUT /api/matches
{
  "action": "update_score",
  "matchId": "matchId",
  "team1Score": 13,
  "team2Score": 8
}
```

## ⚙️ Configuration

Variables d'environnement dans `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/petanque
```

## 📦 Installation

```bash
npm install mongoose react-hot-toast
npm run dev
```

Le backend est maintenant simplifié et suit exactement votre schéma ! 🎯 