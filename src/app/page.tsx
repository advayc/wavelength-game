import GameController from "@/components/GameController";
import ThemeWrapper from "@/components/ThemeWrapper";
import TopNav from "@/components/TopNav";

export default function Home() {
  return (
    <ThemeWrapper>
      <TopNav />
      <main className="min-h-screen max-w-2xl mx-auto pt-12">
        <GameController />
      </main>
    </ThemeWrapper>
  );
}
