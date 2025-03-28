import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck } from "lucide-react";

const OptionCard = ({ icon: Icon, description, actionText, link }) => {
  return (
    <div className="w-full md:w-96">
      <Card className="cursor-pointer hover:shadow-2xl transition-all duration-300 h-full">
        <CardContent className="flex flex-col justify-between h-full p-6 text-center">
          <div>
            <Icon className="mx-auto mb-4 w-12 h-12 text-blue-600" />
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              {description}
            </p>
          </div>
          <Link href={link}>
            <Button className="mt-auto" size="lg">
              {actionText}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default function OptionsCards() {
  return (
    <div className="h-screen overflow-hidden flex items-center justify-center">
      <div className="flex flex-col md:flex-row items-stretch justify-center gap-8">
        <OptionCard 
          icon={FileText}
          description="Déposez votre testament en toute sécurité. Confiez vos volontés et assurez la transmission de votre héritage."
          actionText="Déposer son testament"
          link="/testator"
        />
        <OptionCard 
          icon={ShieldCheck}
          description="Rejoignez notre réseau de validateurs pour sécuriser et authentifier les testaments de nos utilisateurs."
          actionText="Intégrer le réseau de validateur"
          link="/validator"
        />
      </div>
    </div>
  );
}
