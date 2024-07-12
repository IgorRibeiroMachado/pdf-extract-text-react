// preprocess.worker.ts

self.onmessage = async function (event) {
  const { blockSize, C, data, width, height } = event.data;

  const newData = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let ky = -blockSize; ky <= blockSize; ky++) {
        for (let kx = -blockSize; kx <= blockSize; kx++) {
          const iy = y + ky;
          const ix = x + kx;
          if (iy >= 0 && iy < height && ix >= 0 && ix < width) {
            const index = (iy * width + ix) * 4;
            sum += data[index]; // R
            sum += data[index + 1]; // G
            sum += data[index + 2]; // B
            count++;
          }
        }
      }
      const mean = sum / count;
      const index = (y * width + x) * 4;
      const newValue = data[index] > mean - C ? 255 : 0;

      // Set new pixel values for each channel
      newData[index] = newData[index + 1] = newData[index + 2] = newValue;
      newData[index + 3] = data[index + 3]; // Alpha channel remains unchanged
    }
  }

  self.postMessage(newData);
};
