import { ElectronAPI } from '@electron-toolkit/preload';

import { Settings } from '../main/settings';
import { basePath } from '../main/utils';

import type { API } from './index';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
  //! Это только тип, значения тут нет
  interface Main {
    settings: Settings;
  }
  const mainBasePath = basePath;
}
