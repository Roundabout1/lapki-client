import { useLayoutEffect } from 'react';

import { useForm } from 'react-hook-form';

import { Modal, TextField } from '@renderer/components/UI';
import { useSettings } from '@renderer/hooks';
import { removeNonNumbers } from '@renderer/utils';

type FormValues = Main['settings']['compiler'];

interface CompilerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompilerSelectModal: React.FC<CompilerSelectModalProps> = ({ onClose, ...props }) => {
  const [compilerSetting, setCompilerSetting, resetCompilerSetting] = useSettings('compiler');

  const { handleSubmit: hookHandleSubmit, reset, register } = useForm<FormValues>();

  const handleSubmit = hookHandleSubmit((data) => {
    setCompilerSetting(data);
    onClose();
  });

  const handleAfterClose = () => {
    if (!compilerSetting) return;

    reset(compilerSetting);
  };

  useLayoutEffect(() => {
    if (!compilerSetting) return;

    reset(compilerSetting);
  }, [reset, compilerSetting]);

  return (
    <Modal
      {...props}
      onRequestClose={onClose}
      title="Укажите адрес компилятора"
      submitLabel="Подключиться"
      onSubmit={handleSubmit}
      onAfterClose={handleAfterClose}
    >
      <div className={'mb-2 flex gap-2'}>
        <TextField
          maxLength={80}
          {...register('host', { required: true })}
          label="Хост:"
          placeholder="Напишите адрес хоста"
        />
        <TextField
          {...register('port', { required: true })}
          label="Порт:"
          placeholder="Напишите порт"
          onInput={(event) => {
            const { target } = event;
            if (target) {
              (target as HTMLInputElement).value = removeNonNumbers(
                (target as HTMLInputElement).value
              );
            }
          }}
        />
      </div>
      <button type="button" className="btn-secondary" onClick={resetCompilerSetting}>
        Сбросить настройки
      </button>
    </Modal>
  );
};
