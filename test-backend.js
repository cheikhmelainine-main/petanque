node const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let tournamentId, teamIds = [], matchIds = [];

// Fonction pour attendre un délai
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testBackend() {
  try {
    console.log('🚀 Test du Backend - Début\n');

    // 1. Créer un tournoi
    console.log('1️⃣ Création du tournoi...');
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
    console.log('   ID:', tournamentId);

    // 2. Ajouter des équipes
    console.log('\n2️⃣ Ajout des équipes...');
    const teams = [
      { name: 'Les Champions', members: ['Jean Dupont', 'Marie Martin'] },
      { name: 'Les Pros', members: ['Pierre Durand', 'Sophie Leblanc'] },
      { name: 'Team Alpha', members: ['Alex Bernard', 'Julie Rousseau'] },
      { name: 'Team Beta', members: ['Thomas Villa', 'Emma Moreau'] },
      { name: 'Les Aigles', members: ['Luc Moreau', 'Anna Petit'] },
      { name: 'Team Gamma', members: ['Paul Simon', 'Clara Dubois'] }
    ];

    for (const team of teams) {
      const response = await axios.post(`${BASE_URL}/teams`, {
        name: team.name,
        tournamentId,
        memberNames: team.members
      });
      teamIds.push(response.data._id);
      console.log(`✅ Équipe créée: ${team.name} (${team.members.join(', ')})`);
    }

    // 3. Lister les équipes
    console.log('\n3️⃣ Vérification des équipes...');
    const teamsResponse = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
    console.log(`✅ ${teamsResponse.data.length} équipes trouvées`);

    // 4. Démarrer le tournoi
    console.log('\n4️⃣ Démarrage du tournoi...');
    await axios.post(`${BASE_URL}/tournament/${tournamentId}/start`);
    console.log('✅ Tournoi démarré - Matchs générés automatiquement');

    // 5. Lister les matchs
    console.log('\n5️⃣ Récupération des matchs...');
    const matches = await axios.get(`${BASE_URL}/matches?tournamentId=${tournamentId}`);
    matchIds = matches.data.map(m => m._id);
    console.log(`✅ ${matches.data.length} matchs trouvés pour le premier tour`);
    
    matches.data.forEach((match, index) => {
      console.log(`   Match ${index + 1}: ${match.team1Id?.name || 'Team 1'} vs ${match.team2Id?.name || 'Team 2'}`);
    });

    // 6. Simuler le démarrage des matchs
    console.log('\n6️⃣ Démarrage des matchs...');
    for (let i = 0; i < Math.min(matchIds.length, 3); i++) {
      await axios.put(`${BASE_URL}/matches`, {
        action: 'start',
        matchId: matchIds[i]
      });
      console.log(`✅ Match ${i + 1} démarré`);
      await sleep(500); // Pause de 500ms entre les appels
    }

    // 7. Simuler des résultats
    console.log('\n7️⃣ Simulation des résultats...');
    const results = [
      { team1Score: 13, team2Score: 8 },
      { team1Score: 13, team2Score: 11 },
      { team1Score: 13, team2Score: 5 },
      { team1Score: 13, team2Score: 9 },
      { team1Score: 13, team2Score: 12 },
      { team1Score: 13, team2Score: 7 }
    ];

    for (let i = 0; i < matchIds.length; i++) {
      const result = results[i] || { team1Score: 13, team2Score: Math.floor(Math.random() * 8) + 5 };
      
      await axios.put(`${BASE_URL}/matches`, {
        action: 'update_score',
        matchId: matchIds[i],
        team1Score: result.team1Score,
        team2Score: result.team2Score
      });
      console.log(`✅ Match ${i + 1} terminé: ${result.team1Score}-${result.team2Score}`);
      await sleep(300); // Pause de 300ms entre les appels
    }

    // 8. Afficher le classement
    console.log('\n8️⃣ Classement après le premier tour...');
    const ranking = await axios.get(`${BASE_URL}/teams?tournamentId=${tournamentId}`);
    console.log('\n🏆 CLASSEMENT:');
    console.log('='.repeat(50));
    ranking.data.forEach((team, index) => {
      const sign = team.scoreDiff >= 0 ? '+' : '';
      console.log(`${index + 1}. ${team.name.padEnd(15)} | ${team.points} pts | ${sign}${team.scoreDiff} diff`);
    });

    // 9. Test de validation d'erreurs
    console.log('\n9️⃣ Test des erreurs...');
    try {
      await axios.post(`${BASE_URL}/tournaments`, {
        name: '',
        type: 'INVALID',
        format: 'INVALID'
      });
    } catch (error) {
      console.log('✅ Erreur de validation capturée:', error.response?.data?.message);
    }

    // 10. Statistiques finales
    console.log('\n🔟 Statistiques finales...');
    const finalTournaments = await axios.get(`${BASE_URL}/tournaments`);
    const finalTeams = await axios.get(`${BASE_URL}/teams`);
    const finalMatches = await axios.get(`${BASE_URL}/matches`);

    console.log(`📊 Tournois: ${finalTournaments.data.length}`);
    console.log(`👥 Équipes: ${finalTeams.data.length}`);
    console.log(`⚽ Matchs: ${finalMatches.data.length}`);

    console.log('\n🎉 Test terminé avec succès !');
    console.log('=' .repeat(50));
    console.log('Vous pouvez maintenant tester manuellement les endpoints avec Postman ou curl');

  } catch (error) {
    console.error('\n❌ Erreur durant le test:', error.response?.data || error.message);
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
    console.log('✅ Serveur accessible sur http://localhost:3001\n');
    return true;
  } catch (error) {
    console.error('❌ Serveur non accessible sur http://localhost:3001');
    console.error('   Assurez-vous que "npm run dev" est lancé');
    return false;
  }
}

// Exécuter le test
checkServer().then(isServerRunning => {
  if (isServerRunning) {
    testBackend();
  }
}); 