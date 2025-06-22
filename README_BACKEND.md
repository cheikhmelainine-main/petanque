# Backend - Système de Tournois de Pétanque

## Vue d'ensemble

Backend simplifié pour gérer des tournois de pétanque avec MongoDB et Mongoose selon le schéma fourni :

### 🏆 Types de Tournois Supportés

#### 1. Système de Groupes
- **Organisation** : Groupes de 3 ou 4 joueurs/équipes
- **Déroulement** :
  - Match aléatoire initial dans chaque groupe
  - Les gagnants s'affrontent, les perdants s'affrontent
  - Le gagnant des gagnants se qualifie directement
  - Le perdant des gagnants affronte le gagnant des perdants pour la 2ème place
  - **Alternative** : Tous contre tous dans le groupe, les 2 premiers se qualifient
- **Phase finale** : 
  - 64 premiers dans le bracket des gagnants
  - 64 derniers dans le bracket des perdants
- **Particularité** : Pas de matchs nuls, score final 13 ou 11 points

#### 2. Système Suisse
- **Tours** : 4 ou 5 tours selon configuration
- **Appariement** : 1er contre 2ème, 3ème contre 4ème, etc.
- **Système de points** :
  - **3 points** : Victoire avant la fin du temps imparti
  - **2 points** : Victoire après expiration du temps
  - **1 point** : Match nul
- **Départage** : Différence de score, puis nombre de victoires
- **Phase finale** : Bracket avec 1er contre 64ème, 2ème contre 63ème, etc.

#### 3. Système Marathon
- **Principe** : Comme le système suisse mais **complètement aléatoire**
- **Tours** : 4 ou 5 tours
- **Appariement** : Totalement aléatoire à chaque tour
- **Phase finale** : Même système de bracket que le suisse

### 👥 Gestion des Équipes
- **Types** : Individuelles, doubles, triples
- **Import** : Via fichier Excel avec template fourni
- **Export** : Statistiques complètes en Excel
- **Statistiques** : Victoires, défaites, nuls, points, différence de score

### ⏱️ Gestion du Temps
- **Chrono automatique** : Déclenchement au démarrage du match
- **Notifications** : Avertissements et expiration via WebSocket
- **Limites** : Configurable entre 30 et 120 minutes

## 🛠️ Installation

### Prérequis
```bash
# Installer MongoDB (local ou utiliser MongoDB Atlas)
# Node.js et npm déjà installés avec votre projet Next.js
```

### Dépendances
```bash
npm install mongoose xlsx formidable socket.io @types/formidable @types/node
```

### Configuration
Ajouter dans `.env.local` :
```
MONGODB_URI=mongodb://localhost:27017/petanque-tournaments
```

## 📁 Structure du Backend

```
src/
├── models/
│   ├── Tournament.ts    # Modèle tournoi
│   ├── Team.ts         # Modèle équipe/joueurs
│   ├── Match.ts        # Modèle match
│   └── Group.ts        # Modèle groupe
├── services/
│   ├── TournamentService.ts  # Logique métier
│   └── ExcelService.ts       # Import/export Excel
├── pages/api/
│   ├── tournaments/
│   ├── matches/
│   ├── import/
│   └── export/
├── utils/
│   └── validators.ts    # Validations
└── middleware/
    └── websocket.ts     # WebSocket temps réel
```

## 🚀 API Endpoints

### Tournois
```
GET    /api/tournaments              # Liste des tournois
POST   /api/tournaments              # Créer un tournoi
GET    /api/tournaments/{id}         # Détails d'un tournoi
PUT    /api/tournaments/{id}         # Modifier un tournoi
DELETE /api/tournaments/{id}         # Supprimer un tournoi
POST   /api/tournaments/{id}/start   # Démarrer un tournoi
POST   /api/tournaments/{id}/next-round  # Tour suivant
```

### Équipes
```
GET    /api/tournaments/{id}/teams   # Équipes d'un tournoi
POST   /api/tournaments/{id}/teams   # Ajouter des équipes
```

### Matchs
```
GET    /api/matches                  # Liste des matchs
GET    /api/matches/{id}             # Détails d'un match
PUT    /api/matches/{id}             # Mettre à jour un match
```

### Import/Export
```
POST   /api/import/teams             # Import équipes Excel
GET    /api/export/template          # Template Excel
GET    /api/export/tournament/{id}   # Export résultats
```

## 📊 Utilisation

### 1. Créer un Tournoi
```javascript
const tournoi = {
  name: "Championnat de Pétanque 2024",
  type: "swiss", // "groups", "swiss", "marathon"
  settings: {
    rounds: 5,
    timeLimit: 90, // minutes
    winningScore: 13,
    teamType: "doubles",
    maxTeams: 64
  }
};

fetch('/api/tournaments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(tournoi)
});
```

### 2. Ajouter des Équipes
```javascript
const equipes = [
  {
    name: "Les Champions",
    players: [
      { name: "Jean Dupont", email: "jean@email.com" },
      { name: "Marie Martin", phone: "0123456789" }
    ]
  }
];

fetch(`/api/tournaments/${tournoiId}/teams`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ teams: equipes })
});
```

### 3. Démarrer le Tournoi
```javascript
fetch(`/api/tournaments/${tournoiId}/start`, {
  method: 'POST'
});
```

### 4. Mettre à jour un Match
```javascript
// Démarrer un match
fetch(`/api/matches/${matchId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'start' 
  })
});

// Mettre à jour le score
fetch(`/api/matches/${matchId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'update_score',
    score1: 13,
    score2: 8
  })
});
```

## 🔔 WebSocket - Notifications Temps Réel

### Connexion
```javascript
import io from 'socket.io-client';

const socket = io('/', { path: '/api/socket' });

// Rejoindre un tournoi
socket.emit('join-tournament', tournoiId);

// Écouter les événements
socket.on('match-started', (data) => {
  console.log('Match démarré:', data);
});

socket.on('match-score-updated', (data) => {
  console.log('Score mis à jour:', data);
});

socket.on('tournament-next-round', (data) => {
  console.log('Tour suivant:', data);
});
```

### Événements Disponibles
- `tournament-started` - Tournoi démarré
- `tournament-next-round` - Tour suivant
- `match-started` - Match démarré
- `match-score-updated` - Score mis à jour
- `match-completed` - Match terminé
- `match-time-expired` - Temps écoulé
- `ranking-updated` - Classement mis à jour

## 📋 Import Excel

### Format Attendu
Le fichier Excel doit contenir les colonnes :
- `Nom_Equipe` - Nom de l'équipe
- `Joueur1` - Nom du premier joueur
- `Email1` - Email du premier joueur (optionnel)
- `Telephone1` - Téléphone du premier joueur (optionnel)
- `Joueur2`, `Email2`, `Telephone2` - Pour les doubles/triples
- `Joueur3`, `Email3`, `Telephone3` - Pour les triples

### Télécharger le Template
```
GET /api/export/template
```

## 🏁 Logique des Tournois

### Système de Groupes
1. Création automatique des groupes
2. Génération des matchs selon le type choisi
3. Qualification automatique selon les résultats
4. Génération des brackets finaux

### Système Suisse
1. Premier tour : appariement aléatoire
2. Tours suivants : appariement par classement
3. Calcul automatique des points
4. Génération du bracket final après tous les tours

### Système Marathon
1. Tous les tours : appariement complètement aléatoire
2. Même système de points que le suisse
3. Bracket final identique au suisse

## 🔧 Configuration Avancée

### Personnalisation des Scores
```javascript
const settings = {
  winningScore: 11,        // ou 13
  timeLimit: 60,           // minutes
  maxTeams: 128,          // nombre max d'équipes
  teamType: "individual"   // ou "doubles", "triples"
};
```

### Gestion des Erreurs
Toutes les API retournent des erreurs standardisées :
```json
{
  "message": "Description de l'erreur",
  "errors": ["Détail 1", "Détail 2"]
}
```

Le backend est maintenant complet et prêt pour une utilisation en production ! 🚀 