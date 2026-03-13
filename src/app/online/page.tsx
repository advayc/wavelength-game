"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useOnlineStore } from "@/lib/online-store";
import ThemeWrapper from "@/components/ThemeWrapper";
import TopNav from "@/components/TopNav";
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

  return (
    <ThemeWrapper>
      <TopNav />
      <main className="min-h-screen max-w-2xl mx-auto pt-12">
        {room && room.phase !== "lobby" ? (
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
