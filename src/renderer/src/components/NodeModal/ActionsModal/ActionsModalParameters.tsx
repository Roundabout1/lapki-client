import React, { useMemo, useState } from 'react';

import { SingleValue } from 'react-select';

import { ComponentFormFieldLabel } from '@renderer/components/ComponentFormFieldLabel';
import { Checkbox, Select, SelectOption } from '@renderer/components/UI';
import { useEditorContext } from '@renderer/store/EditorContext';
import { ArgList } from '@renderer/types/diagram';
import { ArgType, ArgumentProto } from '@renderer/types/platform';
import { formatArgType, validators } from '@renderer/utils';

enum ParameterType {
  literal = 0,
  attribute,
  operand,
}

type ParameterAttribute = {
  ID: number;
  value: string;
  paramType: ParameterType;
};

const operands = ['+', '-', '*', '/', '%'];
const operansOptions = operands.map((v) => {
  return { label: v, value: v };
});

interface ActionsModalParametersProps {
  protoParameters: ArgumentProto[];
  parameters: ArgList;
  setParameters: (data: ArgList) => void;

  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  selectedComponent: string | null;
  componentOptions: SelectOption[];
}

export const ActionsModalParameters: React.FC<ActionsModalParametersProps> = ({
  protoParameters,
  parameters,
  setParameters,
  errors,
  setErrors,
  selectedComponent,
  componentOptions,
}) => {
  const { controller } = useEditorContext();
  const [parametersAttributes, setParametersAttributes] = useState<ParameterAttribute[]>();
  const [parameterID, setParameterID] = useState<number>(0);
  const filteredComponentOptions = componentOptions?.filter((v) => v.value != selectedComponent);
  const methodOptions = (selectedParameterComponent: string) => {
    if (!selectedParameterComponent || !controller.platform) return [];
    const getAll = controller.platform['getAvailableVariables'];
    const getImg = controller.platform['getVariableIconUrl'];

    return getAll
      .call(controller.platform, selectedParameterComponent)
      .map(({ name, description }) => {
        return {
          value: name,
          label: name,
          hint: description,
          icon: (
            <img
              src={getImg.call(controller.platform, selectedParameterComponent, name, true)}
              className="mr-1 h-7 w-7 object-contain"
            />
          ),
        };
      });
  };
  const handleInputChange = (name: string, type: ArgType | undefined, value: string) => {
    // if (type && typeof type === 'string' && validators[type]) {
    //   if (!validators[type](value)) {
    //     setErrors((p) => ({ ...p, [name]: `Неправильный тип (${formatArgType(type)})` }));
    //   } else {
    //     setErrors((p) => ({ ...p, [name]: '' }));
    //   }
    // }

    parameters[name] = value;
    setParameters({ ...parameters });
  };

  const parseComponentMethod = (value: string) => {
    const split = value.split('.');
    return { component: split[0], method: split[1] };
  };

  const handleParametersAttributesAdd = (newValue: string) => {
    if (!parametersAttributes) return;
    const newID = parameterID + 1;
    setParameterID(newID);
    setParametersAttributes([
      ...parametersAttributes,
      { ID: newID, value: newValue, paramType: ParameterType.attribute },
    ]);
  };

  const handleParameterAttributeDelete = (ID: number) => {
    if (!parametersAttributes) return;
    setParametersAttributes(parametersAttributes.filter((item) => item.ID !== ID));
  };

  const handleMethodChange = (ID: number, newValue: SingleValue<SelectOption>) => {
    if (!parametersAttributes) return;
    const newParametersAttributes = parametersAttributes.map((oldValue) => {
      if (oldValue.ID == ID) {
        const parsed = parseComponentMethod(oldValue.value);
        return {
          ID: ID,
          value: `${parsed.component}.${newValue?.value ?? ''}`,
          paramType: ParameterType.attribute,
        };
      } else {
        return oldValue;
      }
    });
    setParametersAttributes(newParametersAttributes);
  };

  const handleParamtersAttributesChange = (ID: number, newValue: string, type: ParameterType) => {
    if (!parametersAttributes) return;
    const newParametersAttributes = parametersAttributes.map((oldValue) => {
      if (oldValue.ID == ID) {
        return {
          ID: ID,
          value: newValue,
          paramType: type,
        };
      } else {
        return oldValue;
      }
    });
    setParametersAttributes(newParametersAttributes);
  };

  const parseParameterType = (parameter: string) => {
    if (operands.includes(parameter)) {
      return ParameterType.operand;
    } else if (!isNaN(Number(parameter))) {
      return ParameterType.literal;
    } else if (parameter.includes('"')) {
      return ParameterType.literal;
    }
    return ParameterType.attribute;
  };

  if (protoParameters.length === 0) {
    return null;
    // return <div className="flex text-text-inactive">Параметров нет</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="mb-1 text-xl">Параметры:</h3>
      {protoParameters.map((proto) => {
        const { name, description = '', type = '' } = proto;
        const value = parameters[name] ?? '';
        const error = errors[name];
        const hint =
          description + (type && `${description ? '\n' : ''}Тип: ${formatArgType(type)}`);
        const label = name + ':';

        if (Array.isArray(type)) {
          const options = type.map((value) => ({ label: value, value }));
          return (
            <ComponentFormFieldLabel key={name} label={label} hint={hint}>
              <Select
                className="w-[250px]"
                options={options}
                value={options.find((o) => o.value === value)}
                onChange={(opt) => handleInputChange(name, type, opt?.value ?? '')}
              />
            </ComponentFormFieldLabel>
          );
        }

        const parseParameters = value.split(' ').map((parameter, index) => {
          return {
            value: parameter,
            ID: index,
            paramType: parseParameterType(parameter),
          };
        });
        setParameterID(parseParameters.length - 1);
        setParametersAttributes(parseParameters);
        return (
          <div>
            {parseParameters.map((parameter, index) => (
              <div className="flex items-start" key={index}>
                <Checkbox
                  checked={!parameter.isAttribute}
                  onCheckedChange={(v) => setIsChecked(!v)}
                  className="mr-2 mt-[9px]"
                />
                {isChecked ? (
                  <div className="flex w-full gap-2" key={index}>
                    <Select
                      containerClassName="w-full"
                      options={filteredComponentOptions}
                      onChange={(opt) => handleComponentChange(name, type, opt)}
                      value={
                        filteredComponentOptions.find(
                          (o) => o.value === selectedParameterComponent
                        ) ?? null
                      }
                      isSearchable={false}
                      //error={errors.selectedComponentParam1 || ''}
                    />
                    <Select
                      containerClassName="w-full"
                      options={methodOptions}
                      onChange={(opt) => handleMethodChange(name, type, opt)}
                      value={methodOptions.find((o) => o.value === selectedMethod) ?? null}
                      isSearchable={false}
                      //error={errors.selectedMethodParam1 || ''}
                    />
                  </div>
                ) : (
                  <ComponentFormFieldLabel
                    key={index}
                    label={label}
                    hint={hint}
                    error={error}
                    value={value}
                    name={name}
                    onChange={(e) => handleInputChange(name, type, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
