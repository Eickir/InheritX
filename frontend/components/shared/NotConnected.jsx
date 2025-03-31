"use client";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const NotConnected = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Alert className="max-w-md w-full border border-yellow-500 text-yellow-500">
        <AlertTitle className="text-yellow-500">Warning</AlertTitle>
        <AlertDescription className="text-yellow-500">
          Please connect your wallet to our DApp to access your dashboard page.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default NotConnected;
