# Guide de Test - Système de Double Finale

## Objectif
Tester le système de double finale avec deux brackets séparés :
- **Bracket des Gagnants** : Pour les équipes qui gagnent leurs matchs
- **Bracket des Perdants** : Pour les équipes qui perdent leurs matchs

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
- Pas encore de séparation en brackets

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

### 5. Vérifier la génération automatique des brackets
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit maintenant afficher 8 matchs au total
- 4 matchs du round 1 (COMPLETED)
- 2 nouveaux matchs du bracket gagnants (PENDING)
- 2 nouveaux matchs du bracket perdants (PENDING)

### 6. Vérifier les logs du serveur
```
🏆 Round 1 terminé : 4 gagnants, 4 perdants
🏆 Génération du bracket gagnants : Quart de finale avec 4 équipes
✅ Match gagnants créé : [TEAM_ID_1] vs [TEAM_ID_2] (Round 2)
✅ Match gagnants créé : [TEAM_ID_3] vs [TEAM_ID_4] (Round 2)
🏆 Génération du bracket perdants : Premier tour perdants avec 4 équipes
✅ Match perdants créé : [TEAM_ID_5] vs [TEAM_ID_6] (Round 2)
✅ Match perdants créé : [TEAM_ID_7] vs [TEAM_ID_8] (Round 2)
```

### 7. Terminer les matchs du bracket gagnants
```bash
# Terminer les 2 matchs du bracket gagnants
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

### 8. Vérifier la génération de la finale gagnants
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit maintenant afficher 9 matchs au total
- 4 matchs du round 1 (COMPLETED)
- 2 matchs du bracket gagnants (COMPLETED)
- 2 matchs du bracket perdants (PENDING)
- 1 nouveau match de finale gagnants (PENDING)

### 9. Terminer les matchs du bracket perdants
```bash
# Terminer les 2 matchs du bracket perdants
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_7",
  "team1Score": 13,
  "team2Score": 11,
  "finishedBeforeTimeLimit": true
}

PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_8",
  "team1Score": 11,
  "team2Score": 13,
  "finishedBeforeTimeLimit": true
}
```

### 10. Vérifier la génération de la finale perdants
```bash
GET /api/matches?tournamentId=TOURNAMENT_ID
```
- Doit maintenant afficher 10 matchs au total
- 4 matchs du round 1 (COMPLETED)
- 2 matchs du bracket gagnants (COMPLETED)
- 2 matchs du bracket perdants (COMPLETED)
- 1 match de finale gagnants (PENDING)
- 1 nouveau match de finale perdants (PENDING)

### 11. Terminer les finales
```bash
# Terminer la finale gagnants
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_9",
  "team1Score": 13,
  "team2Score": 11,
  "finishedBeforeTimeLimit": true
}

# Terminer la finale perdants
PUT /api/matches
{
  "action": "update_score",
  "matchId": "MATCH_ID_10",
  "team1Score": 11,
  "team2Score": 13,
  "finishedBeforeTimeLimit": true
}
```

## Vérifications Importantes

### Interface utilisateur
- **Bracket des Gagnants** : Affiché avec icône couronne (Crown)
- **Bracket des Perdants** : Affiché avec icône médaille (Medal)
- **Finales** : Mise en évidence avec couleur jaune
- **Séparation visuelle** : Les brackets sont clairement séparés

### Métadonnées des matchs
```json
{
  "metadata": {
    "eliminationRound": "Finale Gagnants",
    "bracketType": "winners",
    "previousRound": 2
  }
}
```

### Logs attendus
```
🏆 Round 1 terminé : 4 gagnants, 4 perdants
🏆 Génération du bracket gagnants : Quart de finale avec 4 équipes
🏆 Génération du bracket perdants : Premier tour perdants avec 4 équipes
🏆 Génération du bracket gagnants : Demi-finale avec 2 équipes
🏆 Génération du bracket perdants : Deuxième tour perdants avec 2 équipes
🏆 Génération du bracket gagnants : Finale Gagnants avec 1 équipe
🏆 Génération du bracket perdants : Finale Perdants avec 1 équipe
```

## Résultat final attendu

### Deux champions distincts
1. **Champion des Gagnants** : Équipe qui a gagné tous ses matchs
2. **Champion des Perdants** : Équipe qui a perdu un match mais gagné le bracket perdants

### Structure des matchs
- **Round 1** : 4 matchs (8ème de finale)
- **Round 2** : 4 matchs (2 gagnants + 2 perdants)
- **Round 3** : 2 matchs (1 finale gagnants + 1 finale perdants)

### Avantages du système
- ✅ Plus d'équipes jouent plus de matchs
- ✅ Deux finales distinctes
- ✅ Système équitable pour les perdants
- ✅ Plus d'engagement des équipes

## Dépannage

### Problème : Brackets non séparés
- Vérifier que les métadonnées `bracketType` sont correctement définies
- Vérifier que l'interface affiche les sections séparées

### Problème : Finales non générées
- Vérifier que tous les matchs des brackets respectifs sont terminés
- Vérifier les logs de génération

### Problème : Interface confuse
- Vérifier que les icônes et couleurs sont distinctes
- Vérifier que les noms des rounds sont clairs 