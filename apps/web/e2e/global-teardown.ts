import { stopPreview } from './preview-server.js';

export default function globalTeardown(): void {
  stopPreview();
}
