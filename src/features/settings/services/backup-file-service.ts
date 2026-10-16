import { Directory, File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

export async function saveAndShareTextFile(contents: string, filename: string, mimeType: string): Promise<void> {
  const directory = await Directory.pickDirectoryAsync();
  const file = directory.createFile(filename, mimeType);
  await file.write(contents);
  await Share.share({ title: filename, url: file.uri, message: filename });
}

export async function pickTextFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/json', '*/*'] });
  if (picked.canceled || !picked.result) return null;
  return picked.result.text();
}

export async function writeTemporaryTextFile(contents: string, filename: string): Promise<File> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  await file.write(contents);
  return file;
}
