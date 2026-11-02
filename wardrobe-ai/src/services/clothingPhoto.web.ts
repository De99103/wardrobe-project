
import * as ImagePicker from 'expo-image-picker';

const MAX_IMAGE_LENGTH = 300023;

function loadBrowserImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        resolve(image);
      } else {
        reject(new Error('Invalid image dimensions.'));
      }
    };

    image.onerror = () => {
      reject(new Error('Could not read this image.'));
    };

    image.src = uri;
  });
}

export async function chooseClothingPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const image = await loadBrowserImage(asset.uri);

  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;
  const longestSide = Math.max(originalWidth, originalHeight);

  for (const edge of [1000, 700, 450, 320, 240]) {
    const scale = Math.min(1, edge / longestSide);

    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas is unavailable in this browser.');
    }

    // Give transparent PNGs a white background.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.8, 0.65, 0.5]) {
      const jpeg = canvas.toDataURL('image/jpeg', quality);

      if (
        jpeg.startsWith('data:image/jpeg;base64,') &&
        jpeg.length <= MAX_IMAGE_LENGTH
      ) {
        return jpeg;
      }
    }
  }

  throw new Error(
    'This image is too large to save. Please choose a smaller image.'
  );
}
