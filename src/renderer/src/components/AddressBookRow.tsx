import { twMerge } from 'tailwind-merge';

import { AddressData } from '@renderer/types/FlasherTypes';

import { Select, SelectOption } from './UI';
import { Checkbox } from './UI/Checkbox';
import { TextInput } from './UI/TextInput';

interface AddressBookRowProps {
  data: AddressData;
  isSelected: boolean;
  checked: boolean | null | undefined;
  binaryOptions: SelectOption[];
  selectedBinary: SelectOption | null | undefined;
  onSelect: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onCheck: () => void;
  onBinaryChange: (option: SelectOption) => void;
}
export const AddressBookRow: React.FC<AddressBookRowProps> = (props) => {
  const {
    data,
    isSelected,
    checked,
    binaryOptions,
    selectedBinary,
    onEdit,
    onDragStart,
    onDrop,
    onSelect,
    onCheck,
    onBinaryChange,
  } = props;
  const labelClassName = twMerge('flex w-full', isSelected && 'bg-bg-active');
  return (
    <div
      className="flex items-start"
      draggable
      onClick={onSelect}
      onDoubleClick={onEdit}
      onDragStart={onDragStart}
      onDrop={onDrop}
    >
      <Checkbox
        className={twMerge('ml-1 mr-1 mt-[9px]', checked === null && 'opacity-0')}
        checked={checked ?? false}
        onCheckedChange={onCheck}
        disabled={checked === null}
      ></Checkbox>
      <label className={labelClassName}>
        <TextInput value={data.name ?? ''} disabled={true} placeholder="Название" />
      </label>

      <label className={labelClassName}>
        <TextInput value={data.address} disabled={true} />
      </label>

      <label className={labelClassName}>
        <TextInput
          value={data.type ?? ''}
          placeholder="Тип"
          className="w-full max-w-full"
          disabled={true}
        />
      </label>
      <Select
        className={twMerge('w-56', checked === null && 'opacity-0', isSelected && 'bg-bg-active')}
        isSearchable={false}
        placeholder="Выберите прошивку..."
        options={binaryOptions}
        value={selectedBinary}
        onChange={(opt) => onBinaryChange(opt as SelectOption)}
        isDisabled={checked === null}
      />
    </div>
  );
};
