import { Controller, UseFormReturn } from 'react-hook-form';

import { Modal, Select, TextField } from '@renderer/components/UI';
import { removeNonNumbers } from '@renderer/utils';

import { FormValues } from './types';

type ModuleType = Main['moduleType'];

type optionType = {
  value: ModuleType;
  label: string;
};

interface ServerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void;
  form: UseFormReturn<FormValues>;
  currentServerType: ModuleType;
  modalTitle: string;
  needPortField: boolean;
  onResetRemoteAddress?: () => void;
}

const options: optionType[] = [
  { value: 'remote', label: 'Удалённый' },
  { value: 'local', label: 'Локальный' },
];

export const ServerSelectModal: React.FC<ServerSelectModalProps> = ({
  onClose,
  onSubmit,
  form,
  currentServerType,
  modalTitle,
  needPortField,
  onResetRemoteAddress,
  ...props
}) => {
  const { control, handleSubmit: hookHandleSubmit, register, watch } = form;

  const isLocal = watch('type') === 'local';

  const currentServerLabel = `Текущий тип сервера: ${
    currentServerType === 'local' ? 'локальный' : 'удалённый'
  }`;

  const handleSubmit = hookHandleSubmit((data) => {
    onSubmit(data);
    onClose();
  });

  const hostInput = (key: ModuleType, hidden: boolean) => {
    return (
      <TextField
        className="mb-2 w-[600px] max-w-full disabled:opacity-50"
        maxLength={80}
        {...register(`${key}.host`, { required: true })}
        label="Адрес"
        placeholder="Напишите адрес"
        hidden={hidden}
        disabled={isLocal}
      />
    );
  };

  const portInput = (key: ModuleType, hidden: boolean) => {
    return (
      <TextField
        className="disabled:opacity-50"
        label="Порт:"
        {...register(`${key}.port`, { valueAsNumber: true })}
        placeholder="Напишите порт"
        onInput={(event) => {
          const { target } = event;
          if (target) {
            (target as HTMLInputElement).value = removeNonNumbers(
              (target as HTMLInputElement).value
            );
          }
        }}
        hidden={!needPortField || hidden}
        disabled={isLocal}
      />
    );
  };

  const hostPortInput = (key: ModuleType, hidden: boolean) => {
    return (
      <div className="mb-2 flex gap-2">
        {hostInput(key, hidden)} {portInput(key, hidden)}
      </div>
    );
  };

  const resetRemoteAddress = () => {
    if (!onResetRemoteAddress) return null;
    return (
      <button type="button" className="btn-secondary" onClick={onResetRemoteAddress}>
        Сбросить настройки
      </button>
    );
  };

  return (
    <Modal
      {...props}
      onRequestClose={onClose}
      title={modalTitle}
      submitLabel="Подключиться"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center">
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => {
            return (
              <div>
                Тип
                <Select
                  value={options.find((opt) => opt.value === value)}
                  onChange={onChange}
                  options={options}
                  isSearchable={false}
                />
              </div>
            );
          }}
        />
      </div>
      {hostPortInput('local', isLocal)}
      {hostPortInput('remote', !isLocal)}

      <div>{currentServerLabel}</div>
      {resetRemoteAddress()}
    </Modal>
  );
};
