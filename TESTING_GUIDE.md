# 🧪 Guide de Test du Backend - Tournois de Pétanque

## 🚀 Prérequis

1. **MongoDB en cours d'exécution** (local ou distant)
2. **Application Next.js démarrée** : `npm run dev` (port 3001)
3. **Outil de test** : Postman, curl, ou Thunder Client (VS Code)

## 📋 Variables d'environnement

Créez/vérifiez votre `.env.local` :
```env
MONGODB_URI=mongodb://localhost:27017/petanque
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
```

---

## 🧪 Tests API - Étape par Étape

### 1️⃣ Créer un Utilisateur (si nécessaire)

```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "role": "admin"
}
```

### 2️⃣ Créer un Tournoi

```bash
POST http://localhost:3001/api/tournaments
Content-Type: application/json

{
  "name": "Championnat Test 2024",
  "type": "SWISS",
  "format": "DOUBLES",
  "rounds": 4,
  "startDate": "2024-01-15T10:00:00.000Z",
  "createdById": "USER_ID_FROM_MONGODB"
}
```

**Réponse attendue :**
```json
{
  "_id": "TOURNAMENT_ID",
  "name": "Championnat Test 2024",
  "type": "SWISS",
  "format": "DOUBLES",
  "status": "UPCOMING",
  "rounds": 4,
  "startDate": "2024-01-15T10:00:00.000Z",
  "createdAt": "...",
  "createdById": "USER_ID"
}
```

### 3️⃣ Lister les Tournois

```bash
GET http://localhost:3001/api/tournaments
```

### 4️⃣ Ajouter des Équipes

```bash
POST http://localhost:3001/api/teams
Content-Type: application/json

{
  "name": "Les Champions",
  "tournamentId": "TOURNAMENT_ID",
  "memberNames": ["Jean Dupont", "Marie Martin"]
}
```

```bash
POST http://localhost:3001/api/teams
Content-Type: application/json

{
  "name": "Les Pros",
  "tournamentId": "TOURNAMENT_ID",
  "memberNames": ["Pierre Durand", "Sophie Leblanc"]
}
```

```bash
POST http://localhost:3001/api/teams
Content-Type: application/json

{
  "name": "Team Alpha",
  "tournamentId": "TOURNAMENT_ID",
  "memberNames": ["Alex Bernard", "Julie Rousseau"]
}
```

```bash
POST http://localhost:3001/api/teams
Content-Type: application/json

{
  "name": "Team Beta",
  "tournamentId": "TOURNAMENT_ID",
  "memberNames": ["Thomas Villa", "Emma Moreau"]
}
```

### 5️⃣ Lister les Équipes

```bash
GET http://localhost:3001/api/teams?tournamentId=TOURNAMENT_ID
```

### 6️⃣ Démarrer le Tournoi

```bash
POST http://localhost:3001/api/tournament/TOURNAMENT_ID/start
```

**Résultat :** Génère automatiquement les matchs du premier tour

### 7️⃣ Lister les Matchs

```bash
GET http://localhost:3001/api/matches?tournamentId=TOURNAMENT_ID
```

```bash
GET http://localhost:3001/api/matches?tournamentId=TOURNAMENT_ID&round=1
```

### 8️⃣ Démarrer un Match

```bash
PUT http://localhost:3001/api/matches
Content-Type: application/json

{
  "action": "start",
  "matchId": "MATCH_ID"
}
```

### 9️⃣ Mettre à Jour le Score

```bash
PUT http://localhost:3001/api/matches
Content-Type: application/json

{
  "action": "update_score",
  "matchId": "MATCH_ID",
  "team1Score": 13,
  "team2Score": 8
}
```

### 🔟 Voir le Classement

```bash
GET http://localhost:3001/api/teams?tournamentId=TOURNAMENT_ID
```

---

## 🧪 Script de Test Complet (Node.js)

Créez `test-backend.js` :

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let tournamentId, userId, teamIds = [], matchIds = [];

async function testBackend() {
  try {
    console.log('🚀 Test du Backend - Début');

    // 1. Créer un tournoi
    console.log('\n1️⃣ Création du tournoi...');
    const tournament = await axios.post(`${BASE_URL}/tournaments`, {
      name: 'Test Championship 2024',
      type: 'SWISS',
      format: 'DOUBLES',
      rounds: 3,
      startDate: new Date().toISOString(),
      createdById: '507f1f77bcf86cd799439011' // ID MongoDB fictif
    });
    tournamentId = tournament.data._id;
    console.log('✅ Tournoi créé:', tournament.data.name);

    // 2. Ajouter des équipes
    console.log('\n2️⃣ Ajout des équipes...');
    const teams = [
      { name: 'Les Champions', members: ['Jean', 'Marie'] },
      { name: 'Les Pros', members: ['Pierre', 'Sophie'] },
      { name: 'Team Alpha', members: ['Alex', 'Julie'] },
      { name: 'Team Beta', members: ['Thomas', 'Emma'] }
    ];

    for (const team of teams) {
      const response = await axios.post(`${BASE_URL}/teams`, {
        name: team.name,
        tournamentId,
        memberNames: team.members
      });
      teamIds.push(response.data._id);
      console.log(`✅ Équipe créée: ${team.name}`);
    }

    // 3. Démarrer le tournoi
    console.log('\n3️⃣ Démarrage du tournoi...');
    await axios.post(`${BASE_URL}/tournament/${tournamentId}/start`);
    console.log('✅ Tournoi démarré');

    // 4. Lister les matchs
    console.log('\n4️⃣ Récupération des matchs...');
    const matches = await axios.get(`${BASE_URL}/matches?tournamentId=${tournamentId}`);
    matchIds = matches.data.map(m => m._id);
    console.log(`✅ ${matches.data.length} matchs trouvés`);

    // 5. Simuler des résultats
    console.log('\n5️⃣ Simulation des résultats...');
    for (let i = 0; i < matchIds.length; i++) {
      const score1 = Math.floor(Math.random() * 8) + 10; // 10-17
      const score2 = Math.floor(Math.random() * 8) + 5;  // 5-12
      
      await axios.put(`${BASE_URL}/matches`, {
        action: 'update_score',
        matchId: matchIds[i],
        team1Score: Math.max(score1, score2),
        team2Score: Math.min(score1, score2)
      });
      console.log(`✅ Match ${i+1} terminé`);
    }

    // 6. Afficher le classement
    console.log('\n6️⃣ Classement final...');
    const ranking = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
    console.log('\n🏆 CLASSEMENT:');
    ranking.data.forEach((team, index) => {
      console.log(`${index + 1}. ${team.name} - ${team.points} pts (${team.scoreDiff >= 0 ? '+' : ''}${team.scoreDiff})`);
    });

    console.log('\n🎉 Test terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testBackend();
```

**Exécuter le script :**
```bash
npm install axios
node test-backend.js
```

---

## 🐛 Tests de Validation d'Erreurs

### Données invalides
```bash
POST http://localhost:3001/api/tournaments
Content-Type: application/json

{
  "name": "",
  "type": "INVALID",
  "format": "INVALID"
}
```

### Tournoi inexistant
```bash
GET http://localhost:3001/api/teams?tournamentId=507f1f77bcf86cd799439999
```

### Match inexistant
```bash
PUT http://localhost:3001/api/matches
Content-Type: application/json

{
  "action": "update_score",
  "matchId": "507f1f77bcf86cd799439999",
  "team1Score": 13,
  "team2Score": 8
}
```

---

## 📊 Vérification Base de Données

Si vous avez MongoDB Compass ou mongosh :

```javascript
// Connexion
use petanque

// Vérifier les collections
show collections

// Compter les documents
db.tournaments.countDocuments()
db.teams.countDocuments()
db.matches.countDocuments()
db.teammembers.countDocuments()

// Voir les données
db.tournaments.find().pretty()
db.teams.find().pretty()
db.matches.find().pretty()
```

---

## ✅ Checklist de Test

- [ ] ✅ Créer un tournoi GROUP
- [ ] ✅ Créer un tournoi SWISS  
- [ ] ✅ Créer un tournoi MARATHON
- [ ] ✅ Ajouter des équipes SINGLES
- [ ] ✅ Ajouter des équipes DOUBLES
- [ ] ✅ Ajouter des équipes TRIPLETS
- [ ] ✅ Démarrer un tournoi
- [ ] ✅ Générer des matchs automatiquement
- [ ] ✅ Mettre à jour les scores
- [ ] ✅ Calculer les points correctement
- [ ] ✅ Trier le classement
- [ ] ✅ Gérer les erreurs de validation
- [ ] ✅ Tester les endpoints avec données invalides

Le backend est maintenant entièrement testable ! 🎯 