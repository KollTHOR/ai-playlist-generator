import { PlaylistFlow } from "@/hooks/usePlaylistGenerator";
import {
  PlexTrack,
  AIRecommendation,
  MusicProfile,
  TrackAvailability,
} from "@/types";

import ModelSelectionStep from "./steps/ModelSelectionStep";
import DataLoadingStep from "./steps/DataLoadingStep";
import AnalyzingStep from "./steps/AnalyzingStep";
import SearchingStep from "./steps/SearchingStep";
import GeneratingStep from "./steps/GeneratingStep";
import ReviewStep from "./steps/ReviewStep";

interface StepContentProps {
  currentFlow: PlaylistFlow;
  selectedModel: string;
  onModelChange: (model: string) => void;
  listeningHistory: PlexTrack[];
  userToken: string;
  filteredHistoryCount: number;
  totalLibraryCount: number;
  loading: boolean;
  isProcessing: boolean;
  musicProfile: MusicProfile | null;
  trackAvailability: TrackAvailability | null;
  recommendations: AIRecommendation[];
  onPlaylistUpdate: (playlist: AIRecommendation[]) => void;
}

const StepContent: React.FC<StepContentProps> = (props) => {
  switch (props.currentFlow) {
    case "model":
      return (
        <ModelSelectionStep
          selectedModel={props.selectedModel}
          onModelChange={props.onModelChange}
        />
      );

    case "data":
      return (
        <DataLoadingStep
          listeningHistory={props.listeningHistory}
          userToken={props.userToken}
          totalLibraryCount={props.totalLibraryCount}
          filteredHistoryCount={props.filteredHistoryCount}
          loading={props.loading}
        />
      );

    case "analyzing":
      return (
        <AnalyzingStep
          isProcessing={props.isProcessing}
          musicProfile={props.musicProfile}
        />
      );

    case "searching":
      return (
        <SearchingStep
          isProcessing={props.isProcessing}
          trackAvailability={props.trackAvailability}
        />
      );

    case "generating":
      return <GeneratingStep isProcessing={props.isProcessing} />;

    case "review":
      return (
        <ReviewStep
          recommendations={props.recommendations}
          userToken={props.userToken}
          onPlaylistUpdate={props.onPlaylistUpdate}
        />
      );

    default:
      return <div>Unknown step</div>;
  }
};

export default StepContent;
