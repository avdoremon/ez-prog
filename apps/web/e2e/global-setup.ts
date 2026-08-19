import { startPreview } from './preview-server.js';

export default async function globalSetup(): Promise<void> {
  await startPreview();
}
