"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useOnlineStore } from "@/lib/online-store";
import ThemeWrapper from "@/components/ThemeWrapper";
import OnlineLobbyScreen from "@/components/OnlineLobbyScreen";
import OnlineGameBoard from "@/components/OnlineGameBoard";

function OnlinePageInner() {
  const router = useRouter();
  const room = useOnlineStore((s) => s.room);
  const leaveRoom = useOnlineStore((s) => s.leaveRoom);

  const handleBack = () => {
    leaveRoom();
    router.push("/");
  };

  const inGame = room && room.phase !== "lobby";

  return (
    <ThemeWrapper>
      <main className={`min-h-screen ${inGame ? "" : "max-w-2xl mx-auto"}`}>
        {inGame ? (
          <OnlineGameBoard />
        ) : (
          <OnlineLobbyScreen onBack={handleBack} />
        )}
      </main>
    </ThemeWrapper>
  );
}

export default function OnlinePage() {
  return (
    <Suspense>
      <OnlinePageInner />
    </Suspense>
  );
}
