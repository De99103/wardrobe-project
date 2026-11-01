import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function chooseClothingPhoto(): Promise<string | null> {
  // Called directly from a button so browsers can open their native file chooser.
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  // Persist image bytes, never the picker's temporary file/blob URL.
  for (const edge of [1000, 700, 450]) {
    const context = ImageManipulator.manipulate(asset.uri);
    context.resize(asset.width >= asset.height ? { width: Math.min(edge, asset.width), height: null } : { height: Math.min(edge, asset.height), width: null });
    const image = await context.renderAsync();
    try {
      const output = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
      if (output.base64 && output.base64.length <= 300000) return `data:image/jpeg;base64,${output.base64}`;
    } finally { image.release(); context.release(); }
  }
  throw new Error('This photo is too large. Please choose a smaller image.');
}
