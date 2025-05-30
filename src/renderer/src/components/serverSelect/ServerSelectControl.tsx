import { useForm, UseFormReturn } from 'react-hook-form';

import { useModal, useSettings } from '@renderer/hooks';

import { ServerSelectModal } from './ServerSelectModal';
import { FormValues, SettingsKey, SettingsType } from './types';

type HostPortTypes = SettingsType['compiler'] | SettingsType['flasher'];
// type ModuleParameteres = {
//   modal: {
//     isOpen: boolean;
//     open: () => void;
//     close: () => void;
//   };
//   form: UseFormReturn<FormValues>;
//   settings: {
//     values: keys | null;
//     set: (value: keys) => Promise<any>;
//   };
// };

// const modules = new Map<SettingsKey, ModuleParameteres>([
//     [
//       'compiler',
//       {
//         modal: {
//           open: openCompilerModal,
//           close: closeCompilerModal,
//           isOpen: isCompilerModalOpen,
//         },
//         form: compilerForm,
//         settings: {
//           values: docSetting,
//           set: setCompilerSetting,
//         },
//       },
//     ],
//     [
//       'flasher',
//       {
//         modal: {
//           open: openFlasherModal,
//           close: closeFlasherModal,
//           isOpen: isFlasherModalOpen,
//         },
//         form: flasherForm,
//         settings: flasherSetting,
//       },
//     ],
//     [
//       'doc',
//       {
//         modal: {
//           open: openDocModal,
//           close: closeDocModal,
//           isOpen: isDocModalOpen,
//         },
//         form: docForm,
//         settings: docSetting,
//       },
//     ],
//   ]);

export const ServerSelectControl: React.FC = () => {
  const [isCompilerModalOpen, openCompilerModal, closeCompilerModal] = useModal(false);
  const [isFlasherModalOpen, openFlasherModal, closeFlasherModal] = useModal(false);
  const [isDocModalOpen, openDocModal, closeDocModal] = useModal(false);

  const [flasherSetting, setFlasherSetting] = useSettings('flasher');
  const [compilerSetting, setCompilerSetting] = useSettings('compiler');
  const [docSetting, setDocSetting] = useSettings('doc');

  const compilerForm = useForm<FormValues>();
  const flasherForm = useForm<FormValues>();
  const docForm = useForm<FormValues>();

  if (!flasherSetting || !compilerSetting || !docSetting) return null;

  const hostPortSubmit = (
    data: FormValues,
    setting: HostPortTypes,
    setSetting: (value: HostPortTypes) => Promise<any>
  ) => {
    if (data.type === 'local') {
      setSetting({ ...setting, type: data.type });
    }
  };

  const submitHandle = (key: SettingsKey, data: FormValues) => {
    switch (key) {
      case 'doc': {
        setDocSetting({
          remoteHost: data.remote.host,
          localHost: data.local.host,
          type: data.type,
        });
        return;
      }
      case 'compiler': {
        hostPortSubmit(data, compilerSetting, setCompilerSetting);
        return;
      }
      case 'flasher': {
        hostPortSubmit(data, flasherSetting, setFlasherSetting);
        return;
      }
    }
  };

  const hostPortReset = (form: UseFormReturn<FormValues>, setting: HostPortTypes) => {
    if (setting.type === 'local') {
      form.reset({
        local: { host: setting.host, port: setting.port },
        type: setting.type,
      });
    } else {
      compilerForm.reset({
        remote: { host: setting.host, port: setting.port },
        type: setting.type,
      });
    }
  };

  const handleClose = (key: SettingsKey) => {
    switch (key) {
      case 'doc': {
        docForm.reset({
          local: { host: docSetting?.localHost },
          remote: { host: docSetting?.remoteHost },
          type: docSetting?.type,
        });
        return;
      }
      case 'compiler': {
        hostPortReset(compilerForm, compilerSetting);
        return;
      }
      case 'flasher': {
        hostPortReset(flasherForm, flasherSetting);
        return;
      }
    }
  };

  return (
    <div>
      {/* Компилятор */}
      <ServerSelectModal
        isOpen={isCompilerModalOpen}
        onClose={() => handleClose('compiler')}
      ></ServerSelectModal>
      {/* Загрузчик */}
      <ServerSelectModal
        isOpen={isFlasherModalOpen}
        onClose={() => handleClose('flasher')}
      ></ServerSelectModal>
      {/* Документация */}
      <ServerSelectModal
        isOpen={isDocModalOpen}
        onClose={() => handleClose('doc')}
      ></ServerSelectModal>
    </div>
  );
};
