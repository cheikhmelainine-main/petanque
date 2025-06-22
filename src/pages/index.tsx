import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Geist, Geist_Mono } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirection vers le dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gradient-to-br from-blue-50 to-green-50`}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Club Pétanque</h1>
            </div>
            <Button 
              onClick={() => router.push('/auth')}
              className="flex items-center gap-2"
            >
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Gérez votre club de pétanque
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Une plateforme complète pour organiser vos tournois, suivre vos statistiques 
              et gérer votre communauté de joueurs de pétanque.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => router.push('/auth')}
                className="flex items-center gap-2"
              >
                Commencer maintenant
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => router.push('/auth')}
              >
                Découvrir les fonctionnalités
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Trophy className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Gestion des tournois</CardTitle>
                <CardDescription>
                  Organisez et suivez vos tournois avec un système de gestion complet
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Communauté de joueurs</CardTitle>
                <CardDescription>
                  Gérez les inscriptions et le profil de tous vos membres
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <Calendar className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Planning des événements</CardTitle>
                <CardDescription>
                  Planifiez vos matchs et événements avec un calendrier intégré
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Prêt à digitaliser votre club ?
            </h3>
            <p className="text-gray-600 mb-6">
              Rejoignez notre plateforme et découvrez comment simplifier la gestion de votre club de pétanque.
            </p>
            <Button 
              size="lg"
              onClick={() => router.push('/auth')}
              className="flex items-center gap-2 mx-auto"
            >
              Créer un compte gratuitement
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Trophy className="h-8 w-8 text-blue-400 mr-3" />
                <h3 className="text-xl font-bold">Club Pétanque</h3>
              </div>
              <p className="text-gray-400">
                La solution complète pour la gestion de votre club de pétanque. 
                Organisez, gérez et développez votre communauté.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Fonctionnalités</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Gestion des tournois</li>
                <li>Suivi des statistiques</li>
                <li>Planning des matchs</li>
                <li>Gestion des membres</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>Contact</li>
                <li>FAQ</li>
                <li>Tutoriels</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Club Pétanque. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
