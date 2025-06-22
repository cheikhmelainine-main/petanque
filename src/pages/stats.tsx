import React from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const StatsPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
            Statistiques
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analysez les performances
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-lg font-medium text-gray-700 mb-2">
            Statistiques à venir
          </h2>
          <p className="text-sm text-gray-500 text-center">
            Cette fonctionnalité sera bientôt disponible
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default StatsPage; 