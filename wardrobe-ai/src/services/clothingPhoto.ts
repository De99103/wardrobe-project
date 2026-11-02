
import { Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ImageManipulator,
  SaveFormat,
} from 'expo-image-manipulator';

export async function chooseClothingPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  // Some browsers return width or height as 0.
  // Read the actual dimensions when that happens.
  let width = asset.width;
  let height = asset.height;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    const dimensions = await Image.getSize(asset.uri);
    width = dimensions.width;
    height = dimensions.height;
  }

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error('Could not read image dimensions.');
  }

  // Resize and convert PNG/JPG images to JPEG.
  for (const edge of [1000, 700, 450]) {
    const context = ImageManipulator.manipulate(asset.uri);

    if (width >= height) {
      context.resize({
        width: Math.min(edge, width),
        height: null,
      });
    } else {
      context.resize({
        width: null,
        height: Math.min(edge, height),
      });
    }

    const image = await context.renderAsync();

    try {
      const output = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.75,
        base64: true,
      });

      if (output.base64 && output.base64.length <= 300000) {
        return `data:image/jpeg;base64,${output.base64}`;
      }
    } finally {
      image.release();
      context.release();
    }
  }

  throw new Error(
    'This photo is too large. Please choose a smaller image.'
  );
}
