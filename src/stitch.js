chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "stitch-frames") {
    return false;
  }

  stitchFrames(message.frames, message.captureDetails)
    .then((image) => sendResponse({ ok: true, image }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function stitchFrames(frames, captureDetails) {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("No captured frames were provided for stitching.");
  }

  const firstFrame = frames[0];
  const scaleX = firstFrame.width / captureDetails.viewportWidth;
  const scaleY = firstFrame.height / captureDetails.viewportHeight;
  const capturedDocumentWidth = Math.min(
    captureDetails.documentWidth,
    captureDetails.viewportWidth,
  );
  const outputWidth = Math.round(capturedDocumentWidth * scaleX);
  const outputHeight = Math.round(captureDetails.documentHeight * scaleY);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
    throw new Error(`The page is too large to stitch (${outputWidth} x ${outputHeight}px).`);
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create the image stitching canvas.");
  }

  for (const frame of frames) {
    const image = await loadImage(frame.dataUrl);
    const destinationY = Math.round(frame.scrollY * scaleY);
    const remainingHeight = outputHeight - destinationY;
    const drawHeight = Math.min(frame.height, remainingHeight);

    if (drawHeight > 0) {
      context.drawImage(
        image,
        0,
        0,
        Math.min(frame.width, outputWidth),
        drawHeight,
        0,
        destinationY,
        Math.min(frame.width, outputWidth),
        drawHeight,
      );
    }
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: outputWidth,
    height: outputHeight,
  };
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A captured frame could not be decoded."));
    image.src = dataUrl;
  });
}
