export type ModuleType = Main['moduleType'];
export type SettingsKey = Main['settingsKey'];
export type SettingsType = Main['settings'];

export type Address = {
  host: string;
  port?: number;
};

export type FormValues = {
  local: Address;
  remote: Address;
  type: ModuleType;
};
