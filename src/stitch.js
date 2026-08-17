chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") {
    return false;
  }

  handleStitchMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      const serializedError = serializeError(error);
      console.error("PageSweep offscreen stitching operation failed.", error, serializedError);
      sendResponse({ ok: false, error: serializedError });
    });

  return true;
});

let stitchState = null;
const MAX_CANVAS_DIMENSION = 65000;
const MAX_CANVAS_PIXELS = 64 * 1024 * 1024;

async function handleStitchMessage(message) {
  switch (message.type) {
    case "stitch-start":
      return startStitch(message.firstFrame, message.captureDetails);
    case "stitch-add-frame":
      return addFrame(message.frame);
    case "stitch-finish":
      return finishStitch();
    case "stitch-release":
      return releaseStitch();
    default:
      throw new Error(`Unknown stitching operation: ${message.type}`);
  }
}

function startStitch(firstFrame, captureDetails) {
  if (!firstFrame || !captureDetails) {
    throw new Error("The stitching session is missing capture details.");
  }

  releaseStitch();

  const scaleX = firstFrame.width / captureDetails.viewportWidth;
  const scaleY = firstFrame.height / captureDetails.viewportHeight;
  const capturedDocumentWidth = Math.min(
    captureDetails.documentWidth,
    captureDetails.viewportContentWidth ?? captureDetails.viewportWidth,
  );
  const dimensionScaleLimit = Math.min(
    MAX_CANVAS_DIMENSION / capturedDocumentWidth,
    MAX_CANVAS_DIMENSION / captureDetails.documentHeight,
  );
  const areaScaleLimit = Math.sqrt(
    MAX_CANVAS_PIXELS / (capturedDocumentWidth * captureDetails.documentHeight),
  );
  const outputScale = Math.min(scaleX, scaleY, dimensionScaleLimit, areaScaleLimit);
  const sourceScale = Math.min(scaleX, scaleY);
  const wasDownscaled = outputScale < sourceScale;
  const outputWidth = Math.max(1, Math.floor(capturedDocumentWidth * outputScale));
  const outputHeight = Math.max(1, Math.floor(captureDetails.documentHeight * outputScale));
  const { canvas, context } = runStitchOperation("canvas creation", () => {
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = outputWidth;
    nextCanvas.height = outputHeight;

    if (nextCanvas.width !== outputWidth || nextCanvas.height !== outputHeight) {
      throw new Error(`The page is too large to stitch (${outputWidth} x ${outputHeight}px).`);
    }

    const nextContext = nextCanvas.getContext("2d", { alpha: false });
    if (!nextContext) {
      throw new Error("Could not create the image stitching canvas.");
    }

    return { canvas: nextCanvas, context: nextContext };
  }, { outputWidth, outputHeight });

  stitchState = {
    canvas,
    context,
    inputScaleX: scaleX,
    inputScaleY: scaleY,
    outputScale,
    outputWidth,
    outputHeight,
    frameCount: 0,
    objectUrl: null,
  };

  return {
    width: outputWidth,
    height: outputHeight,
    outputScale,
    sourceScale,
    wasDownscaled,
  };
}

async function addFrame(frame) {
  if (!stitchState) {
    throw new Error("No active stitching session exists.");
  }

  const image = await runAsyncStitchOperation(
    "frame/image decoding",
    () => loadImage(frame.dataUrl),
    { frameIndex: frame.frameIndex },
  );
  const destinationY = Math.round(frame.scrollY * stitchState.outputScale);
  const remainingHeight = stitchState.outputHeight - destinationY;
  const scaledFrameWidth = frame.width * (stitchState.outputScale / stitchState.inputScaleX);
  const uniqueEndY = Math.round(
    (frame.scrollY + frame.uniqueHeight) * stitchState.outputScale,
  );
  const uniqueOutputHeight = uniqueEndY - destinationY;
  const drawWidth = Math.min(scaledFrameWidth, stitchState.outputWidth);
  const drawHeight = Math.min(uniqueOutputHeight, remainingHeight);
  const sourceWidth = drawWidth * (stitchState.inputScaleX / stitchState.outputScale);
  const sourceHeight = Math.min(
    frame.uniqueHeight * stitchState.inputScaleY,
    frame.height,
  );

  if (drawHeight > 0) {
    runStitchOperation("drawing a frame onto the canvas", () => {
      stitchState.context.drawImage(
        image,
        0,
        0,
        sourceWidth,
        sourceHeight,
        0,
        destinationY,
        drawWidth,
        drawHeight,
      );
    }, {
      frameIndex: frame.frameIndex,
      sourceWidth,
      sourceHeight,
      destinationY,
      drawWidth,
      drawHeight,
    });
  }

  stitchState.frameCount += 1;
  return { frameCount: stitchState.frameCount };
}

async function finishStitch() {
  if (!stitchState || stitchState.frameCount === 0) {
    throw new Error("No captured frames were drawn before PNG export.");
  }

  const blob = await runAsyncStitchOperation(
    "canvas/blob/image encoding",
    () => canvasToBlob(stitchState.canvas),
    { frameCount: stitchState.frameCount },
  );

  return runStitchOperation("final PNG generation", () => {
    stitchState.objectUrl = URL.createObjectURL(blob);
    return {
      image: {
        url: stitchState.objectUrl,
        width: stitchState.outputWidth,
        height: stitchState.outputHeight,
      },
    };
  }, { frameCount: stitchState.frameCount });
}

function releaseStitch() {
  if (stitchState?.objectUrl) {
    URL.revokeObjectURL(stitchState.objectUrl);
  }

  if (stitchState?.canvas) {
    stitchState.canvas.width = 0;
    stitchState.canvas.height = 0;
  }

  stitchState = null;
  return {};
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The stitched canvas could not be exported as PNG."));
      }
    }, "image/png");
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A captured frame could not be decoded."));
    image.src = dataUrl;
  });
}

function runStitchOperation(operation, callback, details = {}) {
  try {
    return callback();
  } catch (error) {
    throw createStitchOperationError(operation, error, details);
  }
}

async function runAsyncStitchOperation(operation, callback, details = {}) {
  try {
    return await callback();
  } catch (error) {
    throw createStitchOperationError(operation, error, details);
  }
}

function createStitchOperationError(operation, originalError, details) {
  const originalMessage = originalError instanceof Error
    ? originalError.message
    : safeStringify(originalError);
  const error = new Error(`${operation} failed: ${originalMessage}`, { cause: originalError });
  error.name = "PageSweepStitchError";
  error.operation = operation;
  Object.assign(error, details);
  return error;
}

function serializeError(value, seen = new WeakSet(), depth = 0) {
  if (depth > 12) return "[Maximum serialization depth reached]";
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol" || typeof value === "function") return String(value);
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";

  seen.add(value);
  if (value instanceof Error) {
    const properties = {};
    for (const key of Object.keys(value)) {
      if (key !== "cause") properties[key] = serializeError(value[key], seen, depth + 1);
    }
    const serialized = {
      type: "Error",
      name: value.name || "Error",
      message: value.message || "",
      stack: value.stack || null,
      properties,
    };
    if ("cause" in value) serialized.cause = serializeError(value.cause, seen, depth + 1);
    return serialized;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeError(item, seen, depth + 1));
  }

  const serialized = {};
  for (const key of Object.keys(value)) {
    try {
      serialized[key] = serializeError(value[key], seen, depth + 1);
    } catch (serializationError) {
      serialized[key] = `[Property serialization failed: ${safeStringify(serializationError)}]`;
    }
  }
  return serialized;
}

function safeStringify(value) {
  try {
    const serialized = typeof value === "object" && value !== null
      ? serializeError(value)
      : value;
    const json = JSON.stringify(serialized, null, 2);
    if (json !== undefined) return json;
    return typeof serialized === "string" ? serialized : `[Unserializable ${typeof serialized}]`;
  } catch (error) {
    return `[Serialization failed: ${error instanceof Error ? error.message : "unknown error"}]`;
  }
}
