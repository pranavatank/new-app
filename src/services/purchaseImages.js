import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const extensionFor = asset => {
  const source = asset?.fileName || asset?.uri || '';
  const match = String(source).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  if (match) return match[1].toLowerCase();
  if (asset?.mimeType === 'image/png') return 'png';
  if (asset?.mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

const toDataUri = async asset => {
  if (asset.base64) return `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
  if (asset.uri?.startsWith('data:')) return asset.uri;
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('The selected image could not be read.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected image could not be saved.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

/** Stores web photos as serializable data URIs and native photos in app documents. */
export async function persistPurchaseImage(asset) {
  if (!asset?.uri) throw new Error('No image was selected.');
  if (Platform.OS === 'web') return toDataUri(asset);

  const directory = `${FileSystem.documentDirectory}purchase_images/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${extensionFor(asset)}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  return destination;
}
