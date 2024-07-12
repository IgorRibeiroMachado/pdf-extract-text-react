import { recognize } from "tesseract.js";

self.onmessage = async function (event) {
  const { imageDataURL, pageNumber } = event.data;

  const ocrResult = await recognize(imageDataURL, "por");

  const text = ocrResult.data.text.trim();

  self.postMessage({
    pageNumber: pageNumber,
    text: text,
  });
};
