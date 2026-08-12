chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") {
    return false;
  }

  handleStitchMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

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
    captureDetails.viewportWidth,
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
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
    throw new Error(`The page is too large to stitch (${outputWidth} x ${outputHeight}px).`);
  }

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Could not create the image stitching canvas.");
  }

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

  const image = await loadImage(frame.dataUrl);
  const destinationY = Math.round(frame.scrollY * stitchState.outputScale);
  const remainingHeight = stitchState.outputHeight - destinationY;
  const scaledFrameWidth = frame.width * (stitchState.outputScale / stitchState.inputScaleX);
  const scaledFrameHeight = frame.height * (stitchState.outputScale / stitchState.inputScaleY);
  const drawWidth = Math.min(scaledFrameWidth, stitchState.outputWidth);
  const drawHeight = Math.min(scaledFrameHeight, remainingHeight);
  const sourceWidth = drawWidth * (stitchState.inputScaleX / stitchState.outputScale);
  const sourceHeight = drawHeight * (stitchState.inputScaleY / stitchState.outputScale);

  if (drawHeight > 0) {
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
  }

  stitchState.frameCount += 1;
  return { frameCount: stitchState.frameCount };
}

async function finishStitch() {
  if (!stitchState || stitchState.frameCount === 0) {
    throw new Error("No captured frames were drawn before PNG export.");
  }

  const blob = await canvasToBlob(stitchState.canvas);
  stitchState.objectUrl = URL.createObjectURL(blob);

  return {
    image: {
      url: stitchState.objectUrl,
      width: stitchState.outputWidth,
      height: stitchState.outputHeight,
    },
  };
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
