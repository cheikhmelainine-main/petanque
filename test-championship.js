const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let tournamentId, teamIds = [], allMatches = [];

// Fonction pour attendre un délai
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Noms d'équipes créatifs
const TEAM_NAMES = [
  // Équipes légendaires
  'Les Légendes de Marseille', 'Champions de Provence', 'Maîtres de la Boule', 'Rois du Carreau',
  'Les Invincibles', 'Titans de la Pétanque', 'Gladiateurs du Sud', 'Virtuoses du Pointage',
  
  // Équipes régionales
  'Aigles Corses', 'Lions de Lyon', 'Ours des Pyrénées', 'Faucons Niçois',
  'Sangliers Cévenols', 'Loups des Alpes', 'Taureaux Camarguais', 'Renards Ardéchois',
  
  // Équipes thématiques
  'Mistral Gagnant', 'Soleil Levant', 'Vents du Sud', 'Orages d\'Été',
  'Tempête de Sable', 'Éclairs Dorés', 'Foudre Rouge', 'Tonnerre Bleu',
  
  // Équipes fun
  'Cochonnets Volants', 'Boules de Feu', 'Pointeurs Fous', 'Tireurs d\'Élite',
  'Carrément Forts', 'Super Tireurs', 'Méga Pointeurs', 'Ultra Champions',
  
  // Équipes internationales
  'Dragons de Shanghai', 'Samouraïs de Tokyo', 'Vikings de Stockholm', 'Gladiateurs de Rome',
  'Pharaons du Caire', 'Cosaques de Moscou', 'Gauchos de Buenos Aires', 'Ninjas de Kyoto'
];

// Générer des noms de joueurs aléatoires
const FIRST_NAMES = ['Jean', 'Pierre', 'Marie', 'Sophie', 'Luc', 'Anna', 'Paul', 'Clara', 'Marc', 'Julie', 'Alex', 'Emma', 'Thomas', 'Sarah', 'David', 'Laura', 'Michel', 'Céline', 'François', 'Nathalie'];
const LAST_NAMES = ['Martin', 'Dupont', 'Durand', 'Moreau', 'Petit', 'Simon', 'Laurent', 'Lefebvre', 'Garcia', 'Roux', 'Fournier', 'Morel', 'Girard', 'Andre', 'Mercier', 'Blanc', 'Robin', 'Guerin', 'Rousseau', 'Gaillard'];

function generatePlayerName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

// Générer différents types de résultats
function generateMatchResult() {
  const scenarios = [
    // Victoires avant temps limite (50%)
    { type: 'quick_win', probability: 0.5 },
    // Victoires après temps limite (30%)
    { type: 'late_win', probability: 0.3 },
    // Matchs nuls (20%)
    { type: 'draw', probability: 0.2 }
  ];
  
  const random = Math.random();
  let cumulative = 0;
  
  for (const scenario of scenarios) {
    cumulative += scenario.probability;
    if (random <= cumulative) {
      switch (scenario.type) {
        case 'quick_win':
          return {
            team1Score: 13,
            team2Score: Math.floor(Math.random() * 8) + 3, // 3-10
            finishedBeforeTimeLimit: true,
            description: 'Victoire rapide'
          };
        case 'late_win':
          return {
            team1Score: 13,
            team2Score: Math.floor(Math.random() * 3) + 10, // 10-12
            finishedBeforeTimeLimit: false,
            description: 'Victoire serrée'
          };
        case 'draw':
          const drawScore = Math.floor(Math.random() * 3) + 11; // 11-13
          return {
            team1Score: drawScore,
            team2Score: drawScore,
            finishedBeforeTimeLimit: false,
            description: 'Match nul'
          };
      }
    }
  }
}

async function testChampionship() {
  try {
    console.log('🏆 CHAMPIONNAT EXTRAORDINAIRE DE PÉTANQUE 2024 🏆');
    console.log('=' .repeat(60));

    // 1. Créer un tournoi Swiss avec 5 tours
    console.log('\n1️⃣ Création du tournoi Swiss 5 tours...');
    const tournament = await axios.post(`${BASE_URL}/tournaments`, {
      name: 'Championnat Extraordinaire 2024',
      type: 'SWISS',
      format: 'DOUBLES',
      rounds: 5,
      startDate: new Date().toISOString(),
      createdById: '507f1f77bcf86cd799439011'
    });
    tournamentId = tournament.data._id;
    console.log('✅ Tournoi créé:', tournament.data.name);
    console.log('   Type: Swiss - 5 tours + Phase finale');
    console.log('   Format: Doubles');

    // 2. Ajouter 32 équipes
    console.log('\n2️⃣ Inscription de 32 équipes prestigieuses...');
    const teams = TEAM_NAMES.slice(0, 32).map(name => ({
      name,
      members: [generatePlayerName(), generatePlayerName()]
    }));

    let teamCount = 0;
    for (const team of teams) {
      const response = await axios.post(`${BASE_URL}/teams`, {
        name: team.name,
        tournamentId,
        memberNames: team.members
      });
      teamIds.push(response.data._id);
      teamCount++;
      console.log(`✅ ${teamCount.toString().padStart(2, '0')}/32 - ${team.name} (${team.members.join(' & ')})`);
      
      if (teamCount % 8 === 0) {
        await sleep(200); // Pause tous les 8 teams
      }
    }

    // 3. Démarrer le tournoi
    console.log('\n3️⃣ Cérémonie d\'ouverture et premier tour...');
    await axios.post(`${BASE_URL}/tournament/${tournamentId}/start`);
    console.log('🎺 Tournoi officiellement démarré !');
    await sleep(1000);

    // 4. Simuler les 5 tours Swiss
    for (let round = 1; round <= 5; round++) {
      console.log(`\n${round + 3}️⃣ ===== TOUR ${round} DU CHAMPIONNAT SWISS =====`);
      
      // Récupérer les matchs du tour
      const matches = await axios.get(`${BASE_URL}/matches?tournamentId=${tournamentId}&round=${round}`);
      console.log(`📋 ${matches.data.length} matchs programmés`);
      
      // Simuler tous les matchs du tour
      let matchNumber = 0;
      for (const match of matches.data) {
        matchNumber++;
        const result = generateMatchResult();
        
        // Parfois inverser le résultat pour plus de variété
        const shouldInvert = Math.random() < 0.4;
        const finalResult = shouldInvert ? {
          team1Score: result.team2Score,
          team2Score: result.team1Score,
          finishedBeforeTimeLimit: result.finishedBeforeTimeLimit,
          description: result.description
        } : result;

        await axios.put(`${BASE_URL}/matches`, {
          action: 'update_score',
          matchId: match._id,
          team1Score: finalResult.team1Score,
          team2Score: finalResult.team2Score,
          finishedBeforeTimeLimit: finalResult.finishedBeforeTimeLimit
        });

        const team1Name = match.team1Id?.name || 'Équipe 1';
        const team2Name = match.team2Id?.name || 'Équipe 2';
        
        console.log(`   Match ${matchNumber.toString().padStart(2, '0')}: ${team1Name} ${finalResult.team1Score}-${finalResult.team2Score} ${team2Name} (${finalResult.description})`);
        
        await sleep(100);
      }

      // Afficher le classement après chaque tour
      console.log(`\n📊 CLASSEMENT APRÈS LE TOUR ${round}:`);
      const ranking = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
      ranking.data.slice(0, 10).forEach((team, index) => {
        const sign = team.scoreDiff >= 0 ? '+' : '';
        console.log(`${(index + 1).toString().padStart(2, '0')}. ${team.name.padEnd(25)} | ${team.points.toString().padStart(2, '0')} pts | ${sign}${team.scoreDiff.toString().padStart(3, ' ')} diff`);
      });
      
      if (ranking.data.length > 10) {
        console.log(`    ... et ${ranking.data.length - 10} autres équipes`);
      }

      // Générer le tour suivant (sauf pour le dernier tour)
      if (round < 5) {
        console.log(`\n🎲 Génération des appariements pour le tour ${round + 1}...`);
        await axios.post(`${BASE_URL}/tournament/${tournamentId}/next-round`);
        console.log('✅ Appariements générés selon le classement Swiss');
        await sleep(500);
      }
    }

    // 5. Phase d'élimination avec double bracket
    console.log('\n9️⃣ ===== PHASE D\'ÉLIMINATION - DOUBLE BRACKET =====');
    const knockoutResponse = await axios.post(`${BASE_URL}/tournament/${tournamentId}/knockout`);
    console.log(`🏟️ Bracket des Gagnants: ${knockoutResponse.data.winnersMatches.length} matchs (Top 16)`);
    console.log(`🎭 Bracket des Perdants: ${knockoutResponse.data.losersMatches.length} matchs (Places 17-32)`);

    // Simuler le bracket des gagnants
    const winnersPhases = [
      { name: '8ÈMES WINNERS', roundType: 'WINNERS', teams: 16, matches: 8 },
      { name: 'QUARTS WINNERS', roundType: 'WINNERS', teams: 8, matches: 4 },
      { name: 'DEMI WINNERS', roundType: 'WINNERS', teams: 4, matches: 2 },
      { name: 'FINALE WINNERS', roundType: 'WINNERS', teams: 2, matches: 1 }
    ];

    // Simuler le bracket des perdants
    const losersPhases = [
      { name: '8ÈMES LOSERS', roundType: 'LOSERS', teams: 16, matches: 8 },
      { name: 'QUARTS LOSERS', roundType: 'LOSERS', teams: 8, matches: 4 },
      { name: 'DEMI LOSERS', roundType: 'LOSERS', teams: 4, matches: 2 },
      { name: 'FINALE LOSERS', roundType: 'LOSERS', teams: 2, matches: 1 }
    ];

    let currentKnockoutRound = 6; // Après les 5 tours Swiss

    // Simuler les brackets en parallèle
    for (let phaseIndex = 0; phaseIndex < winnersPhases.length; phaseIndex++) {
      const winnersPhase = winnersPhases[phaseIndex];
      const losersPhase = losersPhases[phaseIndex];

      console.log(`\n🔥 ===== TOUR ${phaseIndex + 1} DES PHASES FINALES =====`);
      
      // BRACKET DES GAGNANTS
      console.log(`\n🏆 ${winnersPhase.name}:`);
      const winnersMatches = await axios.get(`${BASE_URL}/matches?tournamentId=${tournamentId}&round=${currentKnockoutRound}`);
      const winnersMatchesFiltered = winnersMatches.data.filter(m => m.roundType === 'WINNERS');
      
      console.log(`   ⚔️ ${winnersMatchesFiltered.length} match(s) d'élite`);

      for (let i = 0; i < winnersMatchesFiltered.length; i++) {
        const match = winnersMatchesFiltered[i];
        const result = generateMatchResult();
        
        // En finale, éviter les nuls
        const finalResult = winnersPhase.name === 'FINALE WINNERS' && result.team1Score === result.team2Score ? {
          team1Score: 13,
          team2Score: 12,
          finishedBeforeTimeLimit: false,
          description: 'Finale du bracket gagnants !'
        } : result;

        await axios.put(`${BASE_URL}/matches`, {
          action: 'update_score',
          matchId: match._id,
          team1Score: finalResult.team1Score,
          team2Score: finalResult.team2Score,
          finishedBeforeTimeLimit: finalResult.finishedBeforeTimeLimit
        });

        const team1Name = match.team1Id?.name || 'Équipe 1';
        const team2Name = match.team2Id?.name || 'Équipe 2';
        const winner = finalResult.team1Score > finalResult.team2Score ? team1Name : team2Name;
        
        console.log(`   🥊 ${team1Name} ${finalResult.team1Score}-${finalResult.team2Score} ${team2Name}`);
        console.log(`      🏆 Vainqueur: ${winner} (${finalResult.description})`);
        
        await sleep(600);
      }

      // BRACKET DES PERDANTS
      console.log(`\n🎭 ${losersPhase.name}:`);
      const losersMatchesFiltered = winnersMatches.data.filter(m => m.roundType === 'LOSERS');
      
      if (losersMatchesFiltered.length > 0) {
        console.log(`   ⚔️ ${losersMatchesFiltered.length} match(s) de repêchage`);

        for (let i = 0; i < losersMatchesFiltered.length; i++) {
          const match = losersMatchesFiltered[i];
          const result = generateMatchResult();

          await axios.put(`${BASE_URL}/matches`, {
            action: 'update_score',
            matchId: match._id,
            team1Score: result.team1Score,
            team2Score: result.team2Score,
            finishedBeforeTimeLimit: result.finishedBeforeTimeLimit
          });

          const team1Name = match.team1Id?.name || 'Équipe 1';
          const team2Name = match.team2Id?.name || 'Équipe 2';
          const winner = result.team1Score > result.team2Score ? team1Name : team2Name;
          
          console.log(`   🎪 ${team1Name} ${result.team1Score}-${result.team2Score} ${team2Name}`);
          console.log(`      🎭 Qualifié: ${winner} (${result.description})`);
          
          await sleep(400);
        }
      }

      // Générer le tour suivant (sauf pour la finale)
      if (phaseIndex < winnersPhases.length - 1) {
        console.log(`\n⏳ Génération du tour ${phaseIndex + 2}...`);
        
        try {
          // Générer le tour suivant pour le bracket des gagnants
          await axios.post(`${BASE_URL}/tournament/${tournamentId}/next-knockout`, {
            roundType: 'WINNERS'
          });
          
          // Générer le tour suivant pour le bracket des perdants
          await axios.post(`${BASE_URL}/tournament/${tournamentId}/next-knockout`, {
            roundType: 'LOSERS'
          });
          
          console.log('✅ Tours suivants générés pour les deux brackets');
        } catch (error) {
          console.log('⚠️ Fin de génération automatique des tours');
        }
        
        currentKnockoutRound++;
        await sleep(1000);
      }
    }

    // 6. Résultats finaux
    console.log('\n🎉 ===== CÉRÉMONIE DE CLÔTURE =====');
    const finalRanking = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
    
    console.log('\n🥇 PODIUM FINAL:');
    console.log('=' .repeat(50));
    finalRanking.data.slice(0, 3).forEach((team, index) => {
      const medals = ['🥇', '🥈', '🥉'];
      const sign = team.scoreDiff >= 0 ? '+' : '';
      console.log(`${medals[index]} ${(index + 1)}. ${team.name}`);
      console.log(`    ${team.points} points | Diff: ${sign}${team.scoreDiff}`);
    });

    // Statistiques finales
    console.log('\n📈 STATISTIQUES DU CHAMPIONNAT:');
    console.log('=' .repeat(50));
    const finalTournaments = await axios.get(`${BASE_URL}/tournaments`);
    const finalTeams = await axios.get(`${BASE_URL}/teams`);
    const finalMatches = await axios.get(`${BASE_URL}/matches`);

    console.log(`🏆 Tournois: ${finalTournaments.data.length}`);
    console.log(`👥 Équipes participantes: ${finalTeams.data.length}`);
    console.log(`⚽ Matchs disputés: ${finalMatches.data.length}`);
    console.log(`🎯 Tours Swiss: 5`);
    console.log(`🔥 Phases finales: 4 (8èmes → Finale)`);

    console.log('\n🎊 CHAMPIONNAT EXTRAORDINAIRE TERMINÉ ! 🎊');
    console.log('🏟️ Merci aux 32 équipes pour ce spectacle magnifique !');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n💥 ERREUR DURANT LE CHAMPIONNAT:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('   Status:', error.response.status);
    }
    if (error.response?.config?.url) {
      console.error('   URL:', error.response.config.url);
    }
  }
}

// Vérifier que le serveur est accessible
async function checkServer() {
  try {
    console.log('🔍 Vérification du serveur...');
    await axios.get('http://localhost:3001');
    console.log('✅ Serveur accessible - Prêt pour le championnat !\n');
    return true;
  } catch (error) {
    console.error('❌ Serveur non accessible sur http://localhost:3001');
    console.error('   Assurez-vous que "npm run dev" est lancé');
    return false;
  }
}

// Lancer le championnat extraordinaire
checkServer().then(isServerRunning => {
  if (isServerRunning) {
    testChampionship();
  }
}); 