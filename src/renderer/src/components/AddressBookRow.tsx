import { twMerge } from 'tailwind-merge';

import { AddressData } from '@renderer/types/FlasherTypes';

import { Checkbox } from './UI/Checkbox';
import { TextInput } from './UI/TextInput';

interface AddressBookRowProps {
  data: AddressData;
  isSelected: boolean;
  checked: boolean | null | undefined;
  onSelect: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  onCheck: () => void;
}
export const AddressBookRow: React.FC<AddressBookRowProps> = (props) => {
  const { data, isSelected, checked, onEdit, onDragStart, onDrop, onSelect, onCheck } = props;
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
    </div>
  );
};
