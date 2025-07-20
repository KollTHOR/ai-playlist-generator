import ModelSelector from "../../ModelSelector";

interface ModelSelectionStepProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const ModelSelectionStep: React.FC<ModelSelectionStepProps> = ({
  selectedModel,
  onModelChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Choose Your AI Model
        </h2>
        <p className="text-gray-400 text-sm">
          Select the AI model that will analyze your music taste and generate
          recommendations.
        </p>
      </div>

      <ModelSelector
        selectedModel={selectedModel}
        onModelChange={onModelChange}
      />

      {selectedModel && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
          <p className="text-green-400 text-sm">
            ✓ Model selected: {selectedModel.split("/")[1] || selectedModel}
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelSelectionStep;
