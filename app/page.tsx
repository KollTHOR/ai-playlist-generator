import ErrorBoundary from "@/components/ErrorBoundary";
import PlaylistGenerator from "@/components/PlaylistGenerator";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <ErrorBoundary>
        <PlaylistGenerator />
      </ErrorBoundary>
    </div>
  );
}
