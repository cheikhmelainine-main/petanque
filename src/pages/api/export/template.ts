import { NextApiRequest, NextApiResponse } from 'next';
import { ExcelService } from '../../../services/ExcelService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Méthode non autorisée' });
  }

  try {
    const buffer = ExcelService.generateTeamImportTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_equipes.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    
    return res.send(buffer);
  } catch (error: any) {
    console.error('Erreur génération template:', error);
    return res.status(500).json({ 
      message: error.message || 'Erreur lors de la génération du template' 
    });
  }
} 