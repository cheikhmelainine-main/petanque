import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';

interface ExtendedNextApiResponse extends NextApiResponse {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
}

export const initSocketIO = (req: NextApiRequest, res: ExtendedNextApiResponse) => {
  if (!res.socket.server.io) {
    console.log('Initialisation Socket.IO...');
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Gestion des connexions
    io.on('connection', (socket) => {
      console.log('Client connecté:', socket.id);

      // Rejoindre une room pour un tournoi spécifique
      socket.on('join-tournament', (tournamentId: string) => {
        socket.join(`tournament-${tournamentId}`);
        console.log(`Client ${socket.id} a rejoint le tournoi ${tournamentId}`);
      });

      // Quitter une room de tournoi
      socket.on('leave-tournament', (tournamentId: string) => {
        socket.leave(`tournament-${tournamentId}`);
        console.log(`Client ${socket.id} a quitté le tournoi ${tournamentId}`);
      });

      // Rejoindre une room pour un match spécifique
      socket.on('join-match', (matchId: string) => {
        socket.join(`match-${matchId}`);
        console.log(`Client ${socket.id} suit le match ${matchId}`);
      });

      // Quitter une room de match
      socket.on('leave-match', (matchId: string) => {
        socket.leave(`match-${matchId}`);
        console.log(`Client ${socket.id} ne suit plus le match ${matchId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client déconnecté:', socket.id);
      });
    });

    res.socket.server.io = io;
  }

  return res.socket.server.io;
};

// Événements WebSocket
export enum WebSocketEvents {
  // Tournoi
  TOURNAMENT_STARTED = 'tournament-started',
  TOURNAMENT_ROUND_COMPLETED = 'tournament-round-completed',
  TOURNAMENT_NEXT_ROUND = 'tournament-next-round',
  TOURNAMENT_COMPLETED = 'tournament-completed',
  
  // Match
  MATCH_STARTED = 'match-started',
  MATCH_SCORE_UPDATED = 'match-score-updated',
  MATCH_COMPLETED = 'match-completed',
  MATCH_TIME_WARNING = 'match-time-warning',
  MATCH_TIME_EXPIRED = 'match-time-expired',
  
  // Équipes
  TEAM_STATS_UPDATED = 'team-stats-updated',
  RANKING_UPDATED = 'ranking-updated',
  
  // Notifications générales
  NOTIFICATION = 'notification'
}

// Fonctions utilitaires pour émettre des événements
export const emitToTournament = (io: SocketIOServer, tournamentId: string, event: string, data: any) => {
  io.to(`tournament-${tournamentId}`).emit(event, data);
};

export const emitToMatch = (io: SocketIOServer, matchId: string, event: string, data: any) => {
  io.to(`match-${matchId}`).emit(event, data);
};

export const emitGlobal = (io: SocketIOServer, event: string, data: any) => {
  io.emit(event, data);
}; 