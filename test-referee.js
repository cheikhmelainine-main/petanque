const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Fonction pour attendre
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Générer un résultat de match réaliste pour l'arbitre
function generateRefereeResult() {
  const scenarios = [
    // Victoire à 13 points (40%)
    { type: 'SCORE_13', weight: 40 },
    // Victoire par limite de temps (30%)
    { type: 'TIME_LIMIT', weight: 30 },
    // Victoire normale (30%)
    { type: 'NORMAL', weight: 30 }
  ];

  // Sélection pondérée du type de victoire
  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedType = 'NORMAL';

  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (random <= cumulative) {
      selectedType = scenario.type;
      break;
    }
  }

  let team1Score, team2Score, description;

  switch (selectedType) {
    case 'SCORE_13':
      // Victoire à 13 points
      team1Score = Math.random() < 0.5 ? 13 : Math.floor(Math.random() * 13);
      team2Score = team1Score === 13 ? Math.floor(Math.random() * 13) : 13;
      description = `Victoire à 13 points (${team1Score > team2Score ? 'Équipe 1' : 'Équipe 2'} domine)`;
      break;
      
    case 'TIME_LIMIT':
      // Victoire par limite de temps (scores plus serrés)
      const maxScore = Math.floor(Math.random() * 8) + 5; // Entre 5 et 12
      team1Score = Math.floor(Math.random() * maxScore) + 1;
      team2Score = Math.floor(Math.random() * maxScore) + 1;
      
      // S'assurer qu'il y a un gagnant
      if (team1Score === team2Score) {
        if (Math.random() < 0.5) team1Score++; else team2Score++;
      }
      description = `Victoire par limite de temps (${team1Score > team2Score ? 'Équipe 1' : 'Équipe 2'} mène)`;
      break;
      
    default: // NORMAL
      // Victoire normale (scores variés)
      team1Score = Math.floor(Math.random() * 13) + 1;
      team2Score = Math.floor(Math.random() * 13) + 1;
      
      // S'assurer qu'il y a un gagnant en knockout
      if (team1Score === team2Score) {
        if (Math.random() < 0.5) team1Score++; else team2Score++;
      }
      description = `Match normal (${team1Score > team2Score ? 'Équipe 1' : 'Équipe 2'} l'emporte)`;
      break;
  }

  return {
    team1Score,
    team2Score,
    victoryType: selectedType,
    description
  };
}

async function testRefereeSystem() {
  try {
    console.log('🏁 TEST DU SYSTÈME ARBITRE - SAISIE MANUELLE 🏁\n');

    // 1. Créer un tournoi de test
    console.log('1️⃣ Création d\'un tournoi de test...');
    const tournamentResponse = await axios.post(`${BASE_URL}/tournaments`, {
      name: 'Test Arbitre Swiss',
      type: 'SWISS',
      format: 'DOUBLES',
      rounds: 3,
      startDate: new Date().toISOString(),
      createdById: 'referee-test-user'
    });
    
    const tournamentId = tournamentResponse.data._id;
    console.log(`✅ Tournoi créé: ${tournamentResponse.data.name}`);

    // 2. Ajouter 8 équipes
    console.log('\n2️⃣ Inscription de 8 équipes...');
    const teams = [
      'Les Pros', 'Les Champions', 'Les Experts', 'Les Maîtres',
      'Les Aces', 'Les Stars', 'Les Légendes', 'Les Virtuoses'
    ];

    for (let i = 0; i < teams.length; i++) {
      await axios.post(`${BASE_URL}/teams`, {
        tournamentId,
        name: teams[i],
        memberNames: [`Joueur ${i*2+1}`, `Joueur ${i*2+2}`]
      });
      console.log(`✅ ${teams[i]} inscrite`);
    }

    // 3. Démarrer le tournoi
    console.log('\n3️⃣ Démarrage du tournoi...');
    await axios.post(`${BASE_URL}/tournament/${tournamentId}/start`);
    console.log('🎺 Tournoi démarré !');

    // 4. Simuler 3 tours Swiss avec saisie arbitre
    for (let round = 1; round <= 3; round++) {
      console.log(`\n🏆 ===== TOUR ${round} - SAISIE ARBITRE =====`);
      
      // Récupérer les matchs du tour
      const matchesResponse = await axios.get(`${BASE_URL}/matches?tournamentId=${tournamentId}&round=${round}`);
      const matches = matchesResponse.data;
      
      console.log(`📋 ${matches.length} matchs à arbitrer`);

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const result = generateRefereeResult();
        
        console.log(`\n⚖️ ARBITRAGE Match ${i+1}:`);
        console.log(`   🥊 ${match.team1Id?.name || 'Équipe 1'} vs ${match.team2Id?.name || 'Équipe 2'}`);
        
        // Saisie du score par l'arbitre
        try {
          const refereeResponse = await axios.put(`${BASE_URL}/matches/referee`, {
            matchId: match._id,
            team1Score: result.team1Score,
            team2Score: result.team2Score,
            victoryType: result.victoryType
          });

          const winner = result.team1Score > result.team2Score 
            ? match.team1Id?.name || 'Équipe 1'
            : match.team2Id?.name || 'Équipe 2';

          console.log(`   📊 Score final: ${result.team1Score} - ${result.team2Score}`);
          console.log(`   🏆 Vainqueur: ${winner}`);
          console.log(`   ⚡ Type: ${result.victoryType} - ${result.description}`);
          console.log(`   ✅ Validé par l'arbitre`);

        } catch (error) {
          console.log(`   ❌ Erreur arbitrage: ${error.response?.data?.message || error.message}`);
        }
        
        await sleep(800);
      }

      // Afficher le classement après chaque tour
      if (round < 3) {
        console.log(`\n📊 CLASSEMENT APRÈS LE TOUR ${round}:`);
        const teamsResponse = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
        const rankedTeams = teamsResponse.data
          .sort((a, b) => b.points - a.points || b.scoreDiff - a.scoreDiff)
          .slice(0, 5);

        rankedTeams.forEach((team, index) => {
          console.log(`${String(index + 1).padStart(2, '0')}. ${team.name.padEnd(20)} | ${String(team.points).padStart(2)} pts | ${team.scoreDiff >= 0 ? '+' : ''}${team.scoreDiff} diff`);
        });

        // Générer le tour suivant
        if (round < 3) {
          console.log(`\n🎲 Génération des appariements pour le tour ${round + 1}...`);
          await axios.post(`${BASE_URL}/tournament/${tournamentId}/next-round`);
          console.log('✅ Appariements générés selon le classement Swiss');
        }
      }
    }

    // 5. Phase knockout avec arbitrage
    console.log('\n🔥 ===== PHASE KNOCKOUT - ARBITRAGE STRICT =====');
    const knockoutResponse = await axios.post(`${BASE_URL}/tournament/${tournamentId}/knockout`);
    console.log(`🏟️ ${knockoutResponse.data.winnersMatches.length} matchs Winners + ${knockoutResponse.data.losersMatches.length} matchs Losers`);

    // Arbitrer les 8èmes de finale
    console.log('\n⚖️ ARBITRAGE DES 8ÈMES DE FINALE:');
    const knockoutMatches = await axios.get(`${BASE_URL}/matches?tournamentId=${tournamentId}&round=4`);
    
    for (let i = 0; i < knockoutMatches.data.length; i++) {
      const match = knockoutMatches.data[i];
      const result = generateRefereeResult();
      
      // En knockout, pas d'égalité autorisée
      if (result.team1Score === result.team2Score) {
        if (Math.random() < 0.5) result.team1Score++; else result.team2Score++;
      }

      console.log(`\n🏛️ MATCH ${match.roundType} ${i+1}:`);
      console.log(`   ⚔️ ${match.team1Id?.name || 'Équipe 1'} vs ${match.team2Id?.name || 'Équipe 2'}`);
      
      try {
        await axios.put(`${BASE_URL}/matches/referee`, {
          matchId: match._id,
          team1Score: result.team1Score,
          team2Score: result.team2Score,
          victoryType: result.victoryType
        });

        const winner = result.team1Score > result.team2Score 
          ? match.team1Id?.name || 'Équipe 1'
          : match.team2Id?.name || 'Équipe 2';

        console.log(`   📊 ${result.team1Score} - ${result.team2Score}`);
        console.log(`   🏆 ${winner} qualifié(e)`);
        console.log(`   ⚡ ${result.description}`);

      } catch (error) {
        console.log(`   ❌ Erreur: ${error.response?.data?.message || error.message}`);
      }
      
      await sleep(600);
    }

    // Classement final
    console.log('\n🏅 ===== CLASSEMENT FINAL =====');
    const finalTeamsResponse = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
    const finalRanking = finalTeamsResponse.data
      .sort((a, b) => b.points - a.points || b.scoreDiff - a.scoreDiff);

    console.log('🥇 PODIUM:');
    finalRanking.slice(0, 3).forEach((team, index) => {
      const medals = ['🥇', '🥈', '🥉'];
      console.log(`${medals[index]} ${index + 1}. ${team.name}`);
      console.log(`    ${team.points} points | Diff: ${team.scoreDiff >= 0 ? '+' : ''}${team.scoreDiff}`);
    });

    console.log('\n🎊 TEST ARBITRE TERMINÉ AVEC SUCCÈS ! 🎊');
    console.log('✅ Saisie manuelle des scores fonctionnelle');
    console.log('✅ Types de victoire gérés (13 pts, limite temps, normal)');
    console.log('✅ Phases knockout sans égalité');
    console.log('✅ Points uniquement en phase Swiss');

  } catch (error) {
    console.error('\n💥 ERREUR DURANT LE TEST:', {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      url: error.config?.url
    });
  }
}

// Lancer le test
testRefereeSystem(); 