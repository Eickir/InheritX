import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, FileText, Upload, Lock, Unlock, Wallet, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-white via-gray-100 to-gray-50 text-gray-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative text-gray-900 dark:text-white py-24 px-6 text-center overflow-hidden">
        {/* Ajout d'une image d'illustration en fond */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-40"
          style={{ backgroundImage: 'url(/path-to-your-illustration.jpg)' }}
        ></div>
        <div className="relative z-10 max-w-4xl mx-auto bg-white/80 backdrop-blur-lg p-10 rounded-xl shadow-2xl border border-blue-200 dark:bg-zinc-700/40 dark:border-zinc-600 transition-all duration-300">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 drop-shadow-xl">
            L’héritage, version Web3.
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-gray-700 dark:text-zinc-200 font-sans">
            Créez, chiffrez et ancrez votre testament sur la blockchain. Sûr, infalsifiable.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/testator">
              <Button
                size="lg"
                className="rounded-2xl shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-transform duration-300 hover:scale-105"
              >
                Espace Testateur
              </Button>
            </Link>
            <Link href="/validator">
              <Button
                size="lg"
                className="rounded-2xl shadow-lg bg-green-600 hover:bg-green-700 text-white transition-transform duration-300 hover:scale-105"
              >
                Espace Validateur
              </Button>
          </Link>
        </div>

        </div>
      </section>

      {/* Section Web3 Friendly */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-800">
        <h2 className="text-3xl font-semibold text-center mb-12 font-serif">Pourquoi Web3 ?</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto text-center">
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-md dark:bg-zinc-700 dark:border-zinc-600 transition-shadow duration-300 hover:shadow-xl">
            <Wallet className="mx-auto text-blue-600 w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">Contrôle absolu</h3>
            <p className="text-sm text-gray-700 dark:text-zinc-300 font-sans">
              Vous seul pouvez écrire ou modifier votre testament via votre wallet.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-md dark:bg-zinc-700 dark:border-zinc-600 transition-shadow duration-300 hover:shadow-xl">
            <Globe className="mx-auto text-blue-600 w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">Immuabilité</h3>
            <p className="text-sm text-gray-700 dark:text-zinc-300 font-sans">
              Le testament est stocké sur la blockchain, sans risque d’altération ou perte.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl shadow-md dark:bg-zinc-700 dark:border-zinc-600 transition-shadow duration-300 hover:shadow-xl">
            <ShieldCheck className="mx-auto text-blue-600 w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">Validation décentralisée</h3>
            <p className="text-sm text-gray-700 dark:text-zinc-300 font-sans">
              Notaires, professionnels et membres du réseau stake pour valider votre document.
            </p>
          </div>
        </div>
      </section>

      {/* Section Fonctionnement */}
      <section className="relative py-20 px-6 bg-gray-50 dark:bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-white to-white opacity-40 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800" />
        <h2 className="relative text-3xl font-semibold text-center mb-12 font-serif text-gray-900 dark:text-white">
          Comment ça fonctionne ?
        </h2>
        <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-6xl mx-auto text-center">
          {[
            { icon: <FileText className="mx-auto text-blue-600 w-6 h-6 mb-2" />, label: "Écriture et chiffrement du testament" },
            { icon: <Upload className="mx-auto text-blue-500 w-6 h-6 mb-2" />, label: "Dépôt IPFS + Mint en SBT" },
            { icon: <ShieldCheck className="mx-auto text-blue-600 w-6 h-6 mb-2" />, label: "Validation notariale via staking" },
            { icon: <Lock className="mx-auto text-blue-700 w-6 h-6 mb-2" />, label: "Stockage sécurisé et traçable" },
            { icon: <Unlock className="mx-auto text-blue-800 w-6 h-6 mb-2" />, label: "Déblocage post-mortem aux ayants droit" },
          ].map((step, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              {step.icon}
              <p className="font-medium text-sm md:text-base text-gray-800 dark:text-zinc-200 font-sans">
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
