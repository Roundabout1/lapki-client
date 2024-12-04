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
  const isHeader = checked === null;
  return (
    <div className="flex items-start">
      <Checkbox
        className={twMerge('ml-1 mr-1 mt-[9px]', isHeader && 'opacity-0')}
        checked={checked ?? false}
        onCheckedChange={onCheck}
        disabled={isHeader}
      ></Checkbox>
      <div
        className={twMerge('flex w-full items-start', isSelected && 'bg-bg-active')}
        draggable
        onClick={onSelect}
        onDoubleClick={onEdit}
        onDragStart={onDragStart}
        onDrop={onDrop}
      >
        <label>
          <TextInput
            value={isHeader ? 'Имя' : data.name ?? ''}
            disabled={true}
            placeholder="Название"
          />
        </label>

        <label>
          <TextInput value={isHeader ? 'Адрес' : data.address} disabled={true} />
        </label>
        <label>
          <TextInput
            value={isHeader ? 'Тип' : data.type ?? ''}
            placeholder="Тип"
            className="w-full max-w-full"
            disabled={true}
          />
        </label>
      </div>
      {isHeader ? (
        <label>
          <TextInput value={'Прошивка'} className="w-48" disabled={true} />
        </label>
      ) : (
        <Select
          className={twMerge('w-48', isHeader && 'opacity-0', isSelected && 'bg-bg-active')}
          isSearchable={false}
          options={binaryOptions}
          value={selectedBinary}
          onChange={(opt) => onBinaryChange(opt as SelectOption)}
          isDisabled={isHeader}
        />
      )}
    </div>
  );
};
