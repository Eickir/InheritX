import Image from "next/image";
import Link from "next/link";

// Composant pour chaque carte de fonctionnalité
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-blue-400 mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
};


export default function Home() {
  return (
    <>
    <div className="min-h-screen bg-gray-900 text-gray-200">

      {/* Main Content */}
      <main className="pt-20">
        {/* Section Hero */}
        <section className="text-center bg-gray-800 p-8 rounded-lg mb-8">
          <h1 className="text-4xl font-bold mb-4 text-white">InheritX</h1>
          <p className="text-lg mb-6 text-gray-300">
            Gérez et tracez vos testaments en toute transparence grâce à la blockchain.
          </p>
          <Link href="/testament" passHref>
            <button className="px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition">
            Envoyer votre testament
            </button>
          </Link>
        </section>

        {/* Section Fonctionnalités */}
        <section id="features" className="mb-8">
          <h2 className="text-3xl font-semibold text-center mb-6 text-white">Fonctionnalités</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon="🔒" 
              title="Sécurité" 
              description="Stockage décentralisé et sécurisé via IPFS et blockchain."
            />
            <FeatureCard 
              icon="🔍" 
              title="Traçabilité" 
              description="Suivez chaque étape de votre testament en temps réel grâce à des données immuables."
            />
            <FeatureCard 
              icon="⚙️" 
              title="Simplicité" 
              description="Interface intuitive pour une gestion facile de vos testaments."
            />
          </div>
        </section>
      </main>
      </div>
    </>
  );
}
