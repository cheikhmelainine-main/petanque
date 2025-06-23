# Système de Couleurs et Bordures pour les Équipes

## Vue d'ensemble

Le système utilise des bordures colorées pour distinguer visuellement le statut des équipes à chaque étape du tournoi :

- **🟢 Vert** : Équipes qualifiées/gagnantes
- **🔴 Rouge** : Équipes éliminées/perdantes
- **⚫ Gris** : Statut indéterminé

## Phase de Groupes

### Équipes dans les Groupes
- **Bordure verte** : Équipes qualifiées (1er et 2e de chaque groupe)
- **Bordure rouge** : Équipes éliminées (3e et 4e de chaque groupe)
- **Badge vert** : "1er" ou "2e" pour les qualifiés
- **Badge rouge** : "3e" ou "4e" pour les éliminés

### Finales de Groupe
- **Finale des gagnants** : Bordure verte pour les 1er et 2e
- **Finale des perdants** : Bordure rouge pour les 3e et 4e

## Phase d'Élimination Directe

### Brackets Séparés
- **Bracket des qualifiés** : Bordures vertes pour toutes les équipes
- **Bracket des éliminés** : Bordures rouges pour toutes les équipes

### Couleurs des Matchs
- **Matchs qualifiés** : Fond vert clair, icônes vertes
- **Matchs éliminés** : Fond rouge clair, icônes rouges

## Demi-finales

### Demi-finale des Qualifiés
- **Bordures vertes** : Pour les équipes gagnantes de l'élimination des qualifiés
- **Bordures rouges** : Pour les équipes perdantes de l'élimination des qualifiés

### Demi-finale des Éliminés
- **Bordures vertes** : Pour les équipes gagnantes de l'élimination des éliminés
- **Bordures rouges** : Pour les équipes perdantes de l'élimination des éliminés

## Finales

### Finale des Gagnants
- **Bordures vertes** : Pour les gagnants des demi-finales des qualifiés
- **Fond vert** : Pour le match de finale

### Finale des Perdants
- **Bordures rouges** : Pour les gagnants des demi-finales des éliminés
- **Fond rouge** : Pour le match de finale

## Implémentation Technique

### Composants Modifiés

1. **EliminationBracket.tsx**
   - Ajout de bordures colorées selon le type de bracket
   - Couleurs distinctes pour les gagnants et perdants

2. **Page principale du tournoi**
   - Bordures colorées dans la liste des équipes
   - Badges colorés selon le statut de qualification

3. **Types API**
   - Ajout des propriétés `isQualified`, `qualificationRank`, `originalGroup`
   - Support des métadonnées pour les brackets

### Logique de Couleurs

```typescript
// Fonction pour déterminer la bordure d'une équipe
const getTeamBorder = (team: Team) => {
  if (team.isQualified) {
    return 'border-l-4 border-green-500'; // Équipe qualifiée
  } else if (team.isQualified === false) {
    return 'border-l-4 border-red-500'; // Équipe éliminée
  } else {
    return 'border-l-4 border-gray-500'; // Statut indéterminé
  }
};
```

### Classes CSS Utilisées

- **Bordures** : `border-l-4 border-green-500`, `border-l-4 border-red-500`
- **Fonds** : `bg-green-50`, `bg-red-50`, `bg-green-100`, `bg-red-100`
- **Textes** : `text-green-700`, `text-red-700`
- **Badges** : `bg-green-100 text-green-800`, `bg-red-100 text-red-800`

## Avantages du Système

1. **Visibilité immédiate** : Distinction claire entre qualifiés et éliminés
2. **Cohérence** : Même système de couleurs dans toute l'application
3. **Accessibilité** : Contraste suffisant pour la lisibilité
4. **Flexibilité** : Support de différents types de brackets et phases

## Utilisation

Le système s'applique automatiquement selon :
- Le statut de qualification de l'équipe (`isQualified`)
- Le type de bracket (`bracketType`)
- La phase du tournoi (groupes, élimination, finales)

Les couleurs sont cohérentes dans toute l'interface et permettent une identification rapide du statut de chaque équipe. 