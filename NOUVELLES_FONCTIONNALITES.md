# Nouvelles Fonctionnalités - Système de Tournoi

## Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités ajoutées au système de tournoi existant pour gérer les demi-finales des qualifiés et les deux finales séparées.

## Fonctionnalités Ajoutées

### 1. Bouton "Afficher Demi-finale des Qualifiés"

**Objectif :** Permettre de lancer un tirage au sort entre les équipes qualifiées pour organiser les demi-finales.

**Conditions d'affichage :**
- Tournoi de type GROUP
- Statut ONGOING
- Phase d'élimination directe terminée (tous les matchs KNOCKOUT sont COMPLETED)
- Aucune demi-finale n'existe encore

**Fonctionnement :**
1. Vérifie que toutes les phases d'élimination directe sont terminées
2. Récupère toutes les équipes qualifiées (minimum 4)
3. Effectue un tirage au sort avec contraintes de groupes
4. Crée les matchs de demi-finale avec le type `FINAL` et `bracketType: 'semi_finals'`

**Interface :**
- Bouton avec gradient violet/rose
- Affichage des équipes qualifiées disponibles
- Messages d'erreur si les conditions ne sont pas remplies
- Confirmation de succès avec détails des matchs créés

### 2. Bouton "Lancer les Deux Finales"

**Objectif :** Créer une finale entre les équipes gagnantes et une finale entre les équipes éliminées.

**Conditions d'affichage :**
- Tournoi de type GROUP
- Statut ONGOING
- Demi-finales existantes et terminées
- Aucune finale n'existe encore

**Fonctionnement :**
1. Vérifie que toutes les demi-finales sont terminées
2. Identifie les gagnants et perdants des demi-finales
3. Crée deux matchs de finale séparés :
   - Finale des Gagnants (`bracketType: 'winners_final'`)
   - Finale des Perdants (`bracketType: 'losers_final'`)

**Interface :**
- Bouton avec gradient jaune/orange
- Affichage des équipes gagnantes et perdantes
- Messages d'erreur si les conditions ne sont pas remplies
- Confirmation de succès avec détails des finales créées

## Architecture Technique

### Nouvelles Méthodes dans TournamentService

#### `canStartSemiFinals(tournamentId: string)`
- Vérifie si les demi-finales peuvent être lancées
- Retourne les équipes qualifiées disponibles
- Valide les conditions préalables

#### `generateSemiFinals(tournamentId: string)`
- Génère les matchs de demi-finale
- Effectue le tirage au sort avec contraintes
- Crée les matchs avec métadonnées appropriées

#### `canStartTwoFinals(tournamentId: string)`
- Vérifie si les deux finales peuvent être lancées
- Identifie les gagnants et perdants des demi-finales
- Valide les conditions préalables

#### `generateTwoFinals(tournamentId: string)`
- Génère les deux matchs de finale
- Crée la finale des gagnants et la finale des perdants
- Assigne les métadonnées appropriées

### Nouveaux Endpoints API

#### `GET/POST /api/tournament/[id]/semi-finals`
- GET : Vérifie si les demi-finales peuvent être lancées
- POST : Génère les demi-finales

#### `GET/POST /api/tournament/[id]/two-finals`
- GET : Vérifie si les deux finales peuvent être lancées
- POST : Génère les deux finales

### Nouveaux Hooks React

#### `useSemiFinals()`
- Hook de mutation pour lancer les demi-finales
- Gestion des états de chargement et d'erreur
- Invalidation automatique des caches

#### `useCanStartSemiFinals(tournamentId)`
- Hook de requête pour vérifier les conditions
- Mise en cache automatique des résultats

#### `useTwoFinals()`
- Hook de mutation pour lancer les deux finales
- Gestion des états de chargement et d'erreur
- Invalidation automatique des caches

#### `useCanStartTwoFinals(tournamentId)`
- Hook de requête pour vérifier les conditions
- Mise en cache automatique des résultats

### Nouveaux Composants React

#### `SemiFinalsButton`
- Composant pour le bouton des demi-finales
- Affichage des équipes qualifiées
- Gestion des états et erreurs
- Interface utilisateur cohérente avec le design existant

#### `TwoFinalsButton`
- Composant pour le bouton des deux finales
- Affichage des équipes gagnantes et perdantes
- Gestion des états et erreurs
- Interface utilisateur cohérente avec le design existant

## Flux de Données

### 1. Phase de Groupes
```
Groupes → Finales de groupe → Équipes qualifiées
```

### 2. Phase d'Élimination Directe
```
Équipes qualifiées → Tirage au sort → Matchs d'élimination
```

### 3. Demi-finales des Qualifiés (NOUVEAU)
```
Matchs d'élimination terminés → Tirage au sort → Demi-finales
```

### 4. Deux Finales (NOUVEAU)
```
Demi-finales terminées → Gagnants/Perdants → Finale des Gagnants + Finale des Perdants
```

## Types de Matchs

### Types existants
- `GROUP` : Matchs de groupe
- `GROUP_QUALIFICATION` : Matchs de qualification de groupe
- `GROUP_WINNERS_FINAL` : Finales des gagnants de groupe
- `GROUP_LOSERS_FINAL` : Finales des perdants de groupe
- `KNOCKOUT` : Matchs d'élimination directe

### Nouveaux types
- `FINAL` : Matchs de demi-finale et finale

### Métadonnées des matchs

#### Demi-finales
```typescript
metadata: {
  bracketType: 'semi_finals',
  bracketName: 'Demi-finale des Qualifiés',
  finalType: 'semi_finals'
}
```

#### Finale des Gagnants
```typescript
metadata: {
  bracketType: 'winners_final',
  bracketName: 'Finale des Gagnants',
  finalType: 'winners'
}
```

#### Finale des Perdants
```typescript
metadata: {
  bracketType: 'losers_final',
  bracketName: 'Finale des Perdants',
  finalType: 'losers'
}
```

## Interface Utilisateur

### Affichage dans EliminationBracket
Le composant `EliminationBracket` a été étendu pour afficher :
- Les demi-finales des qualifiés (section violette)
- Les finales (section jaune)
- Les brackets existants (gagnants/perdants/général)

### Conditions d'affichage des boutons
Les nouveaux boutons s'affichent automatiquement selon l'état du tournoi :
1. Après la fin des phases d'élimination directe → Bouton demi-finales
2. Après la fin des demi-finales → Bouton deux finales

### Design cohérent
- Utilisation des mêmes composants UI que l'existant
- Gradients de couleurs distinctifs pour chaque phase
- Messages d'erreur et de succès standardisés
- Animations et états de chargement cohérents

## Validation et Sécurité

### Vérifications côté serveur
- Validation des conditions préalables
- Vérification des permissions
- Gestion des erreurs robuste

### Vérifications côté client
- États de chargement appropriés
- Messages d'erreur informatifs
- Désactivation des boutons quand nécessaire

## Tests et Validation

### Scénarios de test
1. **Demi-finales :**
   - Vérifier l'affichage du bouton après fin des éliminations
   - Tester avec moins de 4 équipes qualifiées
   - Valider le tirage au sort avec contraintes

2. **Deux finales :**
   - Vérifier l'affichage du bouton après fin des demi-finales
   - Tester avec moins de 2 gagnants/perdants
   - Valider la création des deux finales

### Validation des contraintes
- Séparation des équipes du même groupe
- Respect des conditions préalables
- Intégrité des données

## Compatibilité

### Rétrocompatibilité
- Aucune modification du code existant
- Ajout uniquement de nouvelles fonctionnalités
- Préservation de l'architecture actuelle

### Extensibilité
- Structure modulaire pour ajouter d'autres phases
- Métadonnées extensibles pour les matchs
- Hooks réutilisables pour d'autres fonctionnalités

## Conclusion

Ces nouvelles fonctionnalités enrichissent le système de tournoi existant en ajoutant :
- Une phase de demi-finales avec tirage au sort
- Un système de deux finales séparées
- Une interface utilisateur intuitive et cohérente
- Une architecture robuste et extensible

Le système respecte les contraintes existantes tout en ajoutant de nouvelles possibilités d'organisation de tournois. 