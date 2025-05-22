import { ElectronAPI } from '@electron-toolkit/preload';

import { Settings, ModuleType, SettingsKey } from '../main/settings';

import type { API } from './index';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: API;
  }
  //! Это только тип, значения тут нет
  interface Main {
    settings: Settings;
    settingsKey: SettingsKey;
    moduleType: ModuleType;
  }
}
