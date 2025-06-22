# 🏁 GUIDE DE L'ARBITRE - SYSTÈME DE SAISIE MANUELLE

## 📋 VUE D'ENSEMBLE

Le système arbitre permet la saisie manuelle des scores avec une gestion différenciée entre les phases Swiss et les phases d'élimination.

## ⚖️ TYPES DE PHASES

### 🔄 Phase Swiss
- **Points attribués** selon le système temporisé
- **Égalités autorisées** (1 point chacun)
- **Système de points** :
  - 🏃 **3 points** : Victoire avant limite de temps
  - 🕐 **2 points** : Victoire après limite de temps (13 points)
  - 🤝 **1 point** : Match nul

### 🔥 Phase Knockout (Élimination)
- **Aucun point attribué** (seule la qualification compte)
- **Égalités interdites** (un gagnant obligatoire)
- **Types de rounds** : WINNERS, LOSERS, KNOCKOUT

## 🎯 TYPES DE VICTOIRE

### 🏃 TIME_LIMIT - Victoire par Limite de Temps
```json
{
  "victoryType": "TIME_LIMIT",
  "team1Score": 8,
  "team2Score": 6
}
```
- Utilisé quand le temps imparti est écoulé
- Le score peut être inférieur à 13
- **Phase Swiss** : 3 points au gagnant
- **Phase Knockout** : Qualification directe

### 🎯 SCORE_13 - Victoire à 13 Points
```json
{
  "victoryType": "SCORE_13",
  "team1Score": 13,
  "team2Score": 9
}
```
- Une équipe atteint exactement 13 points
- **Phase Swiss** : 2 points au gagnant
- **Phase Knockout** : Qualification directe

### ⚡ NORMAL - Victoire Normale
```json
{
  "victoryType": "NORMAL",
  "team1Score": 11,
  "team2Score": 8
}
```
- Match terminé dans les conditions normales
- **Phase Swiss** : 2 points au gagnant
- **Phase Knockout** : Qualification directe

## 🔧 API ARBITRE

### Endpoint Principal
```
PUT /api/matches/referee
```

### Paramètres Requis
```json
{
  "matchId": "string",           // ID du match
  "team1Score": number,          // Score équipe 1 (≥ 0)
  "team2Score": number,          // Score équipe 2 (≥ 0)
  "victoryType": "TIME_LIMIT" | "SCORE_13" | "NORMAL"
}
```

### Réponse Succès
```json
{
  "message": "Score mis à jour par l'arbitre",
  "match": { /* objet match complet */ },
  "victoryInfo": {
    "type": "TIME_LIMIT",
    "finishedBeforeTimeLimit": true,
    "isKnockout": false
  }
}
```

## ✅ VALIDATIONS AUTOMATIQUES

### Scores
- ❌ Scores négatifs interdits
- ❌ Égalités en phase knockout interdites
- ✅ Scores libres en phase Swiss

### Types de Victoire
- **SCORE_13** : Un des scores doit être exactement 13
- **TIME_LIMIT** : Scores libres (gagnant déterminé)
- **NORMAL** : Scores libres (gagnant déterminé)

### Phases
- **Swiss** : Égalités autorisées, points attribués
- **Knockout** : Égalités interdites, pas de points

## 🎮 EXEMPLES D'UTILISATION

### Exemple 1 : Match Swiss avec Limite de Temps
```bash
curl -X PUT http://localhost:3001/api/matches/referee \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "64f7a8b2c1d2e3f4a5b6c7d8",
    "team1Score": 9,
    "team2Score": 7,
    "victoryType": "TIME_LIMIT"
  }'
```
**Résultat** : Équipe 1 gagne, 3 points attribués

### Exemple 2 : Match Swiss à 13 Points
```bash
curl -X PUT http://localhost:3001/api/matches/referee \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "64f7a8b2c1d2e3f4a5b6c7d8",
    "team1Score": 13,
    "team2Score": 11,
    "victoryType": "SCORE_13"
  }'
```
**Résultat** : Équipe 1 gagne, 2 points attribués

### Exemple 3 : Match Knockout
```bash
curl -X PUT http://localhost:3001/api/matches/referee \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "64f7a8b2c1d2e3f4a5b6c7d8",
    "team1Score": 13,
    "team2Score": 8,
    "victoryType": "NORMAL"
  }'
```
**Résultat** : Équipe 1 qualifiée, aucun point attribué

## ❌ ERREURS COURANTES

### Égalité en Knockout
```json
{
  "error": "Pas d'égalité autorisée en phase d'élimination"
}
```
**Solution** : Désigner un gagnant obligatoirement

### Score 13 Invalide
```json
{
  "error": "Pour une victoire à 13, un des scores doit être 13"
}
```
**Solution** : Vérifier qu'un score est exactement 13

### Scores Négatifs
```json
{
  "error": "Les scores ne peuvent pas être négatifs"
}
```
**Solution** : Utiliser des scores ≥ 0

## 🧪 SCRIPT DE TEST

Lancer le test complet du système arbitre :
```bash
node test-referee.js
```

**Fonctionnalités testées** :
- ✅ Saisie manuelle des scores
- ✅ 3 types de victoire (TIME_LIMIT, SCORE_13, NORMAL)
- ✅ Phases Swiss avec points temporisés
- ✅ Phases knockout sans égalité
- ✅ Validation automatique des scores
- ✅ Progression des tournois

## 📊 STATISTIQUES ARBITRE

Le système track automatiquement :
- **Nombre de matchs arbitrés**
- **Types de victoire utilisés**
- **Répartition Swiss vs Knockout**
- **Temps moyen de saisie**

## 🏆 BONNES PRATIQUES

1. **Vérifier le type de phase** avant la saisie
2. **Confirmer les scores** avec les équipes
3. **Choisir le bon type de victoire** selon les circonstances
4. **Éviter les égalités** en phase knockout
5. **Valider immédiatement** après chaque match

---

*Système développé pour une gestion professionnelle des tournois de pétanque* 🎯 