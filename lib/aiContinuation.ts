/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ContinuationResult {
  success: boolean;
  data: any;
  attempts: number;
  error?: string;
}

export async function requestWithContinuation(
  endpoint: string,
  payload: any,
  options: {
    maxAttempts?: number;
    expectedLength?: number;
    isArray?: boolean;
  } = {}
): Promise<ContinuationResult> {
  const { maxAttempts = 3, expectedLength = 20, isArray = true } = options;

  let fullResponse = "";
  let attempts = 0;
  let lastValidJson: any = null;

  for (attempts = 1; attempts <= maxAttempts; attempts++) {
    try {
      console.log(`Attempt ${attempts}/${maxAttempts} for ${endpoint}`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const responseText = await response.text();
      console.log(`Raw response length: ${responseText.length}`);

      // If this is a continuation attempt, append to existing response
      if (attempts > 1) {
        fullResponse = mergeResponses(fullResponse, responseText, isArray);
      } else {
        fullResponse = responseText;
      }

      // Try to parse the JSON
      try {
        const parsedData = JSON.parse(fullResponse);

        // Check if we have the expected amount of data
        if (isArray && Array.isArray(parsedData)) {
          console.log(
            `Got ${parsedData.length} items, expected ${expectedLength}`
          );

          if (parsedData.length >= expectedLength) {
            return {
              success: true,
              data: parsedData,
              attempts,
            };
          }

          lastValidJson = parsedData;
        } else if (!isArray && parsedData) {
          return {
            success: true,
            data: parsedData,
            attempts,
          };
        }
      } catch (parseError) {
        console.log("JSON parsing failed, attempting continuation...");

        // If we have a partial response, try to continue
        if (attempts < maxAttempts) {
          const continuationPayload = createContinuationPayload(
            payload,
            fullResponse,
            isArray,
            lastValidJson
          );

          payload = continuationPayload;
          continue;
        }
      }

      // If we reach here and it's not the last attempt, try continuation
      if (attempts < maxAttempts && lastValidJson) {
        const continuationPayload = createContinuationPayload(
          payload,
          fullResponse,
          isArray,
          lastValidJson
        );

        payload = continuationPayload;
      }
    } catch (error) {
      console.error(`Attempt ${attempts} failed:`, error);

      if (attempts === maxAttempts) {
        return {
          success: false,
          data: lastValidJson,
          attempts,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  }

  // Return the last valid JSON if we have it
  if (lastValidJson) {
    return {
      success: true,
      data: lastValidJson,
      attempts,
    };
  }

  return {
    success: false,
    data: null,
    attempts,
    error: "Failed to get complete response after all attempts",
  };
}

function mergeResponses(
  existing: string,
  newResponse: string,
  isArray: boolean
): string {
  if (isArray) {
    // Remove the opening bracket from existing and closing bracket from new
    const existingClean = existing.replace(/^\s*\[/, "").replace(/\]\s*$/, "");
    const newClean = newResponse.replace(/^\s*\[/, "").replace(/\]\s*$/, "");

    // Merge them
    return `[${existingClean}${existingClean ? "," : ""}${newClean}]`;
  } else {
    // For objects, merge the properties
    return newResponse; // Simple approach for now
  }
}

function createContinuationPayload(
  originalPayload: any,
  partialResponse: string,
  isArray: boolean,
  lastValidJson: any
): any {
  const currentCount = lastValidJson ? (isArray ? lastValidJson.length : 1) : 0;

  return {
    ...originalPayload,
    continuationMode: true,
    currentCount,
    partialResponse: partialResponse.substring(0, 500), // Send context
    continueFrom: currentCount,
    instruction: isArray
      ? `Continue the JSON array from item ${
          currentCount + 1
        }. Start with the next item and continue until you reach the required total.`
      : `Continue the JSON object from where it was cut off.`,
  };
}
