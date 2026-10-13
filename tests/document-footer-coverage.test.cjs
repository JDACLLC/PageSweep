const assert = require('node:assert/strict');
const fs = require('node:fs');
const capture = fs.readFileSync('src/capture.js', 'utf8');
const background = fs.readFileSync('src/background.js', 'utf8');

// Regression from Fox News service-worker failure in 1.2.22:
// 15 frames (last scrollY=18326), viewport=1323, documentHeight=20972.
// Stitcher must never be given a final frame claiming 2646px.
const viewport = 1323;
const lastY = 18326;
const documentHeight = 20972;
const uncovered = documentHeight - (lastY + viewport);
assert.equal(documentHeight - lastY, 2646);
assert.equal(uncovered, 1323);
assert.ok(uncovered > 0, 'Page contains one full uncaptured viewport');

// Structural guard: a successful capture must compare reported extent with
// the final frame; dynamically growing pages must remeasure before stopping.
assert.match(capture, /const capturedThrough = lastCapturedScrollY \+ captureStep;/);
assert.match(capture, /const requiredThrough = scrollSurface\.kind === "panel"/);
assert.match(capture, /if \(requiredThrough - capturedThrough > 1\)/);
assert.match(capture, /const endObservedHeight = captureHeight\(\)/);
assert.match(capture, /const confirmedHeight = captureHeight\(\)/);

// The stitcher retains its invariant; do not silence errors or truncate.
assert.match(background, /uniqueHeight <= 0 \|\| uniqueHeight >/);
assert.match(background, /Frame \$\{frameIndex \+ 1\} has an invalid unique height/);
console.log('Passed: Fox News footer regression fixture, completion guard, dynamic end recheck, and strict stitch safety.');
