import { activityFingerprint, parseActivities } from './activityParser';

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const file = event.data;
    if (file.size > 10 * 1024 * 1024) throw new Error('O limite e 10 MB por arquivo.');
    self.postMessage({ progress: 10 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const fingerprint = activityFingerprint(bytes);
    self.postMessage({ progress: 40 });
    const activities = parseActivities(new TextDecoder().decode(bytes), fingerprint);
    self.postMessage({ progress: 100, activities });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Nao foi possivel ler o arquivo.',
    });
  }
};
