# Dépendances Backend - Système de Tournois de Pétanque

## Packages à installer

### Dépendances principales
```bash
npm install mongoose
npm install xlsx
npm install formidable
npm install socket.io
npm install @types/formidable
```

### Dépendances de développement (si pas déjà installées)
```bash
npm install --save-dev @types/node
npm install --save-dev typescript
```

## Commande d'installation complète
```bash
npm install mongoose xlsx formidable socket.io @types/formidable @types/node
```

## Structure Backend Créée

### Modèles (`src/models/`)
- `Tournament.ts` - Modèle pour les tournois
- `Team.ts` - Modèle pour les équipes et joueurs
- `Match.ts` - Modèle pour les matchs
- `Group.ts` - Modèle pour les groupes (système de groupes)

### Services (`src/services/`)
- `TournamentService.ts` - Service principal pour la logique métier des tournois
- `ExcelService.ts` - Service pour l'import/export Excel

### API Routes (`src/pages/api/`)
- `tournaments/` - CRUD des tournois
  - `index.ts` - Liste et création
  - `[id].ts` - Détails, mise à jour, suppression
  - `[id]/start.ts` - Démarrage d'un tournoi
  - `[id]/teams.ts` - Gestion des équipes
  - `[id]/next-round.ts` - Passage au tour suivant
- `matches/` - Gestion des matchs
  - `index.ts` - Liste des matchs
  - `[id].ts` - Détails et mise à jour des matchs
- `import/` - Import de données
  - `teams.ts` - Import d'équipes via Excel
- `export/` - Export de données
  - `template.ts` - Téléchargement du template Excel
  - `tournament/[id].ts` - Export des résultats

### Utilitaires (`src/utils/`, `src/middleware/`)
- `validators.ts` - Fonctions de validation
- `websocket.ts` - Middleware WebSocket pour les notifications temps réel

## Fonctionnalités Implémentées

### Types de Tournois
1. **Système de Groupes**
   - Groupes de 3 ou 4 joueurs/équipes
   - Match aléatoire initial puis winners/losers
   - Qualification par groupe
   - Bracket winners/losers pour les 64 premiers et derniers

2. **Système Suisse**
   - 4 ou 5 tours
   - Appariement par classement (1er vs 2ème, etc.)
   - Système de points avec limite de temps
   - Bracket final winners/losers

3. **Système Marathon**
   - 4 ou 5 tours complètement aléatoires
   - Même système de bracket final que le suisse

### Gestion des Équipes
- Équipes individuelles, doubles ou triples
- Import/export Excel
- Statistiques complètes (victoires, défaites, points, différence de score)

### Gestion des Matchs
- Système de scoring automatique
- Déclenchement automatique du chrono
- Gestion des limites de temps
- Notifications WebSocket en temps réel

### Système de Points (Suisse/Marathon)
- 3 points si victoire 13-0 avant limite de temps
- 2 points si victoire après expiration du temps
- 1 point pour match nul
- Départage par différence de score

### Import/Export
- Template Excel pour l'import d'équipes
- Import d'équipes depuis Excel
- Export complet des résultats de tournoi

### Notifications Temps Réel
- WebSocket avec Socket.IO
- Notifications automatiques:
  - Démarrage de tournoi/match
  - Mise à jour des scores
  - Fin de match/tour
  - Classements mis à jour

## Configuration Requise

### Variables d'environnement
Ajouter dans `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/petanque-tournaments
# ou votre URI MongoDB
```

### Base de données
MongoDB avec les collections:
- `tournaments`
- `teams` 
- `matches`
- `groups`
- `users` (existant)

## Utilisation

1. Installer les dépendances
2. Démarrer MongoDB
3. Démarrer l'application Next.js
4. Les API sont disponibles sur `/api/*`

## Endpoints Principaux

- `GET/POST /api/tournaments` - Liste/création de tournois
- `POST /api/tournaments/{id}/start` - Démarrer un tournoi
- `POST /api/tournaments/{id}/teams` - Ajouter des équipes
- `PUT /api/matches/{id}` - Mettre à jour un match
- `POST /api/import/teams` - Import d'équipes Excel
- `GET /api/export/template` - Template Excel
- `GET /api/export/tournament/{id}` - Export résultats

Le backend est maintenant complet et prêt à être utilisé! 