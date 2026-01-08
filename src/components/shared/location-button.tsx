import { useState } from "react";
import { Button } from "../ui/button";
import { Crosshair } from "lucide-react";

interface LocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
}

export function LocationButton({ onLocationFound }: LocationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location. Please check your browser settings.");
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      className="h-8 w-8 rounded-lg border border-white/20 bg-white backdrop-blur hover:bg-gray-100"
      aria-label="Get current location"
    >
      <Crosshair className={`h-4 w-4 text-zinc-900 ${isLoading ? "animate-spin" : ""}`} />
    </Button>
  );
}
