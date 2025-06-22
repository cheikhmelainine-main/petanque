# Guide de Test - Génération Automatique des Rounds d'Élimination

## Objectif
Tester que le système génère automatiquement les rounds suivants après chaque match d'élimination terminé.

## Prérequis
- Tournoi avec phase de groupes terminée
- Phase de qualification lancée (8 équipes qualifiées)
- Bracket d'élimination créé

## Étapes de Test

### 1. Vérifier l'état initial
```bash
# Vérifier que les matchs du premier round sont créés
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit afficher 4 matchs du round 1 (8ème de finale)
- Statut : PENDING

### 2. Terminer le premier match
```bash
# Mettre à jour le score du premier match
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_1",
  "team1Score": 13,
  "team2Score": 11,
  "finishedBeforeTimeLimit": true
}
```

### 3. Vérifier qu'aucun nouveau match n'est créé
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit toujours afficher 4 matchs du round 1
- Le match terminé doit avoir le statut COMPLETED

### 4. Terminer tous les matchs du round 1
```bash
# Terminer les 3 autres matchs
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_2",
  "team1Score": 13,
  "team2Score": 9,
  "finishedBeforeTimeLimit": true
}

PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_3",
  "team1Score": 11,
  "team2Score": 13,
  "finishedBeforeTimeLimit": true
}

PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_4",
  "team1Score": 13,
  "team2Score": 8,
  "finishedBeforeTimeLimit": true
}
```

### 5. Vérifier la génération automatique du round 2
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit maintenant afficher 8 matchs au total
- 4 matchs du round 1 (COMPLETED)
- 2 nouveaux matchs du round 2 (PENDING) - Quart de finale

### 6. Terminer les matchs du round 2
```bash
# Terminer les 2 matchs du quart de finale
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_5",
  "team1Score": 13,
  "team2Score": 10,
  "finishedBeforeTimeLimit": true
}

PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_6",
  "team1Score": 12,
  "team2Score": 13,
  "finishedBeforeTimeLimit": true
}
```

### 7. Vérifier la génération automatique de la demi-finale
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit maintenant afficher 9 matchs au total
- 4 matchs du round 1 (COMPLETED)
- 2 matchs du round 2 (COMPLETED)
- 1 nouveau match du round 3 (PENDING) - Demi-finale

### 8. Terminer la demi-finale
```bash
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_7",
  "team1Score": 13,
  "team2Score": 11,
  "finishedBeforeTimeLimit": true
}
```

### 9. Vérifier la finale
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit maintenant afficher 10 matchs au total
- 4 matchs du round 1 (COMPLETED)
- 2 matchs du round 2 (COMPLETED)
- 1 match du round 3 (COMPLETED)
- 1 nouveau match du round 4 (PENDING) - Finale

## Vérifications Importantes

### Logs du serveur
Vérifier que les logs suivants apparaissent :
```
🏆 Génération du round suivant : Quart de finale avec 4 équipes
✅ Match créé : [TEAM_ID_1] vs [TEAM_ID_2] (Round 2)

🏆 Génération du round suivant : Demi-finale avec 2 équipes
✅ Match créé : [TEAM_ID_3] vs [TEAM_ID_4] (Round 3)

🏆 Génération du round suivant : Finale avec 1 équipe
```

### Contraintes respectées
- Les équipes du même groupe ne doivent pas se rencontrer avant la finale
- Chaque round doit avoir le bon nombre de matchs
- Les noms des rounds doivent être corrects

### Interface utilisateur
- Le composant `EliminationBracket` doit afficher tous les rounds
- Les matchs terminés doivent être marqués comme terminés
- Les matchs en cours doivent être visibles

## Dépannage

### Problème : Aucun nouveau match généré
- Vérifier que tous les matchs du round actuel sont terminés
- Vérifier les logs du serveur pour les erreurs
- Redémarrer le serveur si nécessaire

### Problème : Matchs dupliqués
- Vérifier que la méthode `generateNextEliminationRound` n'est appelée qu'une fois
- Nettoyer la base de données si nécessaire

### Problème : Contraintes non respectées
- Vérifier que l'algorithme de seeding fonctionne correctement
- Vérifier les logs de validation du seeding

## Résultat attendu
Le système doit automatiquement générer les rounds suivants après chaque match terminé, créant un bracket complet jusqu'à la finale, tout en respectant les contraintes de groupes. 