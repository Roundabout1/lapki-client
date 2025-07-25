import { useSyncExternalStore } from 'react';

import { EventSelection } from '@renderer/lib/drawable';
import {
  emptyEditorData,
  emptyDataListeners,
  CreateStateParams,
  EditorData,
  EditorDataPropertyName,
  EditorDataReturn,
  CreateTransitionParams,
  ChangeTransitionParams,
  CreateComponentParams,
  ChangeStateParams,
  CreateNoteParams,
  Point,
  CreateInitialStateParams,
  CreateFinalStateParams,
  CreateChoiceStateParams,
  SwapComponentsParams,
  StateMachineData,
} from '@renderer/lib/types';
import { generateId, isVariable } from '@renderer/lib/utils';
import {
  Event,
  Action,
  Transition as TransitionData,
  Component,
  Elements,
  EventData,
  Meta,
  StateMachine,
  emptyStateMachine,
  Condition,
  Variable,
} from '@renderer/types/diagram';

import { Serializer } from './Serializer';

import { operatorSet } from '../PlatformManager';

/**
 * Класс-прослойка, обеспечивающий взаимодействие с React.
 */
export class EditorModel {
  data = emptyEditorData();
  dataListeners = emptyDataListeners; //! Подписчиков обнулять нельзя, react сам разбирается
  serializer = new Serializer(this);

  constructor(private initPlatform: () => void) {}

  createStateMachine(smId: string, data: StateMachine) {
    if (this.data.elements.stateMachines[smId]) return;

    this.data.elements.stateMachines[smId] = data;

    this.triggerDataUpdate('elements.stateMachinesId');
  }

  changeHeadControllerId(id: string) {
    this.data.headControllerId = id;
    this.triggerDataUpdate('headControllerId');
  }

  deleteStateMachine(smId: string) {
    if (!this.data.elements.stateMachines[smId]) return;

    delete this.data.elements.stateMachines[smId];

    this.triggerDataUpdate('elements.stateMachinesId');
  }

  init(basename: string | null, name: string, elements: Elements) {
    this.data = emptyEditorData();
    this.data.basename = basename;
    this.data.name = name;
    this.data.elements = elements;
    this.data.headControllerId = '';
    this.data.elements.stateMachines[''] = emptyStateMachine();
    this.data.isInitialized = true;
    this.initPlatform(); // TODO(bryzZz) Платформа непонятно где вообще в архитектуре, судя по всему ее нужно переносить в данные
  }

  triggerSave(basename: string | null, name: string | null) {
    this.data.basename = basename;
    this.data.name = name ?? 'Без названия';
    this.data.isStale = false;
    this.triggerDataUpdate('basename', 'name', 'isStale');
  }

  makeStale() {
    this.data.isStale = true;
    this.triggerDataUpdate('isStale');
  }

  private subscribe = (propertyName: EditorDataPropertyName) => (listener: () => void) => {
    if (!this.dataListeners[propertyName]) {
      this.dataListeners[propertyName] = [];
    }
    this.dataListeners[propertyName].push(listener);

    return () => {
      this.dataListeners[propertyName] = this.dataListeners[propertyName].filter(
        (l) => l !== listener
      );
    };
  };

  private renameCondition(ac: Condition, oldName: string, newName: string) {
    if (ac.type == 'value') {
      return;
    }
    if (ac.type == 'component') {
      if ((ac.value as Variable).component === oldName) {
        (ac.value as Variable).component = newName;
      }
      return;
    }
    if (operatorSet.has(ac.type)) {
      if (Array.isArray(ac.value)) {
        for (const x of ac.value) {
          this.renameCondition(x, oldName, newName);
        }
        return;
      }
      return;
    }
  }

  renameComponentInEvents(sm: StateMachine, oldComponentId: string, newComponentId: string) {
    for (const stateId in sm.states) {
      const state = sm.states[stateId];
      for (const ev of state.events) {
        if (typeof ev.trigger !== 'string')
          if (ev.trigger.component === oldComponentId) {
            ev.trigger.component = newComponentId;
          }

        for (const act of ev.do) {
          if (typeof act !== 'string') {
            if (act.component === oldComponentId) {
              act.component = newComponentId;
            }
            for (const argId in act.args) {
              const arg = act.args[argId].value;
              if (typeof arg === 'string') {
                arg.replace(oldComponentId, newComponentId);
              } else if (isVariable(arg)) {
                if ((arg as Variable).component === oldComponentId) {
                  (arg as Variable).component = newComponentId;
                }
              }
            }
          }
        }
        if (typeof ev.condition !== 'string' && ev.condition) {
          this.renameCondition(ev.condition, oldComponentId, newComponentId);
        }
      }
    }

    for (const transitionId in sm.transitions) {
      const transition = sm.transitions[transitionId];

      if (!transition.label) continue;

      if (
        typeof transition.label.trigger !== 'string' &&
        transition.label.trigger?.component === oldComponentId
      ) {
        transition.label.trigger.component = newComponentId;
      }

      if (transition.label.do) {
        for (const act of transition.label.do) {
          if (typeof act !== 'string') {
            if (act.component === oldComponentId) {
              act.component = newComponentId;
            }
            for (const argId in act.args) {
              const arg = act.args[argId].value;
              if (typeof arg === 'string') {
                arg.replace(oldComponentId, newComponentId);
              } else if (isVariable(arg)) {
                if ((arg as Variable).component === oldComponentId) {
                  (arg as Variable).component = newComponentId;
                }
              }
            }
          }
        }
      }

      if (typeof transition.label.condition !== 'string' && transition.label.condition) {
        this.renameCondition(transition.label.condition, oldComponentId, newComponentId);
      }
    }
  }

  editStateMachine(smId: string, data: StateMachineData) {
    const sm = this.data.elements.stateMachines[smId];

    if (!sm) return;

    sm.name = data.name;
    sm.platform = data.platform;

    this.triggerDataUpdate('elements.name');
  }

  // TODO (L140-beep): разобраться с возвращаемым never
  // TODO (L140-beep): сделать stateId необязательным
  useData<T extends EditorDataPropertyName>(smId: string, propertyName: T): EditorDataReturn<T> {
    const isShallow = (propertyName: string): propertyName is keyof EditorData => {
      return !propertyName.startsWith('elements');
    };

    const getSnapshot = () => {
      if (isShallow(propertyName)) {
        return this.data[propertyName];
      }

      if (propertyName === 'elements.stateMachinesId') {
        return this.data['elements'].stateMachines;
      }
      if (!this.data['elements'].stateMachines[smId]) return '';
      return this.data['elements'].stateMachines[smId][propertyName.split('.')[1]];
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSyncExternalStore(this.subscribe(propertyName), getSnapshot);
  }

  triggerDataUpdate<T extends EditorDataPropertyName>(...propertyNames: T[]) {
    const isShallow = (propertyName: string): propertyName is keyof EditorData => {
      return !propertyName.startsWith('elements.');
    };

    for (const name of propertyNames) {
      if (!isShallow(name)) {
        const subName = name.split('.')[1];

        // Ссылку нужно обновлять только у объектов
        if (name === 'elements.stateMachinesId') {
          this.data.elements.stateMachines = {
            ...this.data.elements.stateMachines,
          };
        } else {
          for (const smId in this.data.elements.stateMachines) {
            const prevValue = this.data.elements.stateMachines[smId][subName];
            if (typeof prevValue !== 'object') break;
            if (prevValue !== null) {
              this.data.elements.stateMachines[smId][subName] = {
                ...prevValue,
              };
            }
          }
        }
        this.data.isStale = true;
        this.dataListeners['isStale'].forEach((listener) => listener());
      }

      (this.dataListeners[name] ?? []).forEach((listener) => listener());
    }
  }

  private getNodeIds() {
    const ids: string[] = [];
    for (const smId in this.data.elements.stateMachines) {
      const sm = this.data.elements.stateMachines[smId];
      ids.push(...Object.keys(sm.states));
      ids.push(...Object.keys(sm.initialStates));
    }

    return ids;
  }

  createState(args: CreateStateParams) {
    const {
      name,
      parentId,
      id = generateId(this.getNodeIds()),
      events = args.events,
      placeInCenter = false,
      color,
      smId,
      dimensions,
    } = args;

    let position = args.position;

    const centerPosition = () => {
      return {
        x: position.x - dimensions.width / 2,
        y: position.y - dimensions.height / 2,
      };
    };

    position = placeInCenter ? centerPosition() : position;

    this.data.elements.stateMachines[smId].states[id] = {
      position,
      dimensions: { ...dimensions },
      events: events,
      name,
      parentId,
      color,
    };

    this.triggerDataUpdate('elements.states');

    return id;
  }

  changeState(args: ChangeStateParams) {
    const { smId, id, events, color } = args;

    const state = this.data.elements.stateMachines[smId].states[id];
    if (!state) return false;

    state.events = events;
    state.color = color;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  changeStateName(smId: string, id: string, name: string) {
    const state = this.data.elements.stateMachines[smId].states[id];
    if (!state) return false;

    state.name = name;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  changeStateSelection(smId: string, id: string, selection: boolean) {
    const state = this.data.elements.stateMachines[smId].states[id];
    if (!state) return false;

    state.selection = selection;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  changeStatePosition(smId: string, id: string, position: Point) {
    const state = this.data.elements.stateMachines[smId].states[id];
    if (!state) return false;

    state.position = position;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  linkState(smId: string, parentId: string, childId: string) {
    const parent = this.data.elements.stateMachines[smId].states[parentId];
    const child = this.data.elements.stateMachines[smId].states[childId];

    if (!parent || !child) return false;

    child.parentId = parentId;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  unlinkState(smId: string, id: string) {
    const state = this.data.elements.stateMachines[smId].states[id];

    if (!state || !state.parentId) return false;

    const parent = this.data.elements.stateMachines[smId].states[state.parentId];

    if (!parent) return false;

    delete state.parentId;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  deleteState(smId: string, id: string) {
    const state = this.data.elements.stateMachines[smId].states[id];
    if (!state) return false;

    delete this.data.elements.stateMachines[smId].states[id];

    this.triggerDataUpdate('elements.states');

    return true;
  }

  createInitialState(args: CreateInitialStateParams) {
    const { id = generateId(this.getNodeIds()), smId, ...other } = args;

    this.data.elements.stateMachines[smId].initialStates[id] = other;

    this.triggerDataUpdate('elements.initialStates');

    return id;
  }

  deleteInitialState(smId: string, id: string) {
    const state = this.data.elements.stateMachines[smId].initialStates[id];
    if (!state) return false;

    delete this.data.elements.stateMachines[smId].initialStates[id];

    this.triggerDataUpdate('elements.initialStates');

    return true;
  }

  changeInitialStatePosition(smId: string, id: string, position: Point) {
    const state = this.data.elements.stateMachines[smId].initialStates[id];
    if (!state) return false;

    state.position = position;

    this.triggerDataUpdate('elements.initialStates');

    return true;
  }

  createFinalState(args: CreateFinalStateParams) {
    const {
      smId,
      id = generateId(this.getNodeIds()),
      placeInCenter = false,
      position,
      ...other
    } = args;

    const centerPosition = () => {
      const size = 50;
      return {
        x: position.x - size / 2,
        y: position.y - size / 2,
      };
    };

    this.data.elements.stateMachines[smId].finalStates[id] = {
      ...other,
      position: placeInCenter ? centerPosition() : position,
    };

    this.triggerDataUpdate('elements.finalStates');

    return id;
  }

  deleteFinalState(smId: string, id: string) {
    const state = this.data.elements.stateMachines[smId].finalStates[id];
    if (!state) return false;

    delete this.data.elements.stateMachines[smId].finalStates[id];

    this.triggerDataUpdate('elements.finalStates');

    return true;
  }

  changeFinalStatePosition(smId: string, id: string, position: Point) {
    const state = this.data.elements.stateMachines[smId].finalStates[id];
    if (!state) return false;

    state.position = position;

    this.triggerDataUpdate('elements.finalStates');

    return true;
  }

  linkFinalState(smId: string, stateId: string, parentId: string) {
    const state = this.data.elements.stateMachines[smId].finalStates[stateId];
    const parent = this.data.elements.stateMachines[smId].states[parentId];

    if (!state || !parent) return false;

    state.parentId = parentId;

    this.triggerDataUpdate('elements.finalStates');

    return true;
  }

  createChoiceState(args: CreateChoiceStateParams) {
    const {
      smId,
      id = generateId(this.getNodeIds()),
      placeInCenter = false,
      position,
      ...other
    } = args;

    const centerPosition = () => {
      const size = 50;
      return {
        x: position.x - size / 2,
        y: position.y - size / 2,
      };
    };

    this.data.elements.stateMachines[smId].choiceStates[id] = {
      ...other,
      position: placeInCenter ? centerPosition() : position,
    };

    this.triggerDataUpdate('elements.choiceStates');

    return id;
  }

  deleteChoiceState(smId: string, id: string) {
    const state = this.data.elements.stateMachines[smId].choiceStates[id];
    if (!state) return false;

    delete this.data.elements.stateMachines[smId].choiceStates[id];

    this.triggerDataUpdate('elements.choiceStates');

    return true;
  }

  changeChoiceStatePosition(smId: string, id: string, position: Point) {
    const state = this.data.elements.stateMachines[smId].choiceStates[id];
    if (!state) return false;

    state.position = position;

    this.triggerDataUpdate('elements.choiceStates');

    return true;
  }

  linkChoiceState(smId: string, stateId: string, parentId: string) {
    const state = this.data.elements.stateMachines[smId].choiceStates[stateId];
    const parent = this.data.elements.stateMachines[smId].states[parentId];

    if (!state || !parent) return false;

    state.parentId = parentId;

    this.triggerDataUpdate('elements.choiceStates');

    return true;
  }

  changeChoiceStateSelection(smId: string, id: string, selection: boolean) {
    const state = this.data.elements.stateMachines[smId].choiceStates[id];
    if (!state) return false;

    state.selection = selection;

    this.triggerDataUpdate('elements.choiceStates');

    return true;
  }

  createEvent(smId: string, stateId: string, eventData: EventData, eventIdx?: number) {
    const state = this.data.elements.stateMachines[smId].states[stateId];
    if (!state) return false;

    if (eventIdx !== undefined) {
      state.events.splice(eventIdx, 0, eventData);
    } else {
      state.events.push(eventData);
    }

    this.triggerDataUpdate('elements.states');

    return true;
  }

  changeEventSelection(
    smId: string,
    stateId: string,
    eventSelection: EventSelection,
    selection: boolean
  ) {
    const state = this.data.elements.stateMachines[smId].states[stateId];

    if (!state) return false;

    const { eventIdx, actionIdx } = eventSelection;
    const event = state.events[eventIdx];

    if (!event) return false;

    if (actionIdx === null || actionIdx === undefined) {
      event.selection = selection;
      return true;
    }

    const action = event.do[actionIdx];
    if (!action) return false;
    if (typeof action === 'string') return false;

    action.selection = selection;

    return true;
  }

  createEventAction(smId: string, stateId: string, event: EventSelection, value: Action) {
    const state = this.data.elements.stateMachines[smId].states[stateId];
    if (!state) return false;

    const { eventIdx, actionIdx } = event;

    (state.events[eventIdx].do as Action[]).splice(
      actionIdx ?? state.events[eventIdx].do.length - 1,
      0,
      value
    );

    this.triggerDataUpdate('elements.states');

    return true;
  }

  changeEvent(smId: string, stateId: string, eventIdx: number, newValue: Event) {
    const state = this.data.elements.stateMachines[smId].states[stateId];
    if (!state) return false;

    const event = state.events[eventIdx];

    if (!event) return false;

    event.trigger = newValue;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  changeEventAction(
    smId: string,
    stateId: string,
    event: EventSelection,
    newValue: Event | Action
  ) {
    const state = this.data.elements.stateMachines[smId].states[stateId];
    if (!state) return false;

    const { eventIdx, actionIdx } = event;

    (state.events[eventIdx].do as Action[])[actionIdx as number] = newValue;

    this.triggerDataUpdate('elements.states');

    return true;
  }

  deleteEvent(smId: string, stateId: string, eventIdx: number) {
    const state = this.data.elements.stateMachines[smId].states[stateId];
    if (!state) return false;

    state.events.splice(eventIdx, 1);

    this.triggerDataUpdate('elements.states');

    return true;
  }

  deleteEventAction(smId: string, stateId: string, event: EventSelection) {
    const state = this.data.elements.stateMachines[smId].states[stateId];
    if (!state) return false;

    const { eventIdx, actionIdx } = event;

    (state.events[eventIdx].do as Action[]).splice(actionIdx as number, 1);

    this.triggerDataUpdate('elements.states');

    return true;
  }

  createTransition(args: CreateTransitionParams) {
    const {
      smId,
      id = generateId(Object.keys(this.data.elements.stateMachines[smId].transitions)),
      ...other
    } = args;

    this.data.elements.stateMachines[smId].transitions[id] = other;

    this.triggerDataUpdate('elements.transitions');

    return id;
  }

  changeTransition(args: ChangeTransitionParams) {
    const { id, smId, label, targetId, sourceId, ...other } = args;

    const transition = this.data.elements.stateMachines[smId].transitions[id] as TransitionData;
    if (!transition) return false;

    //* Для чего это сделано? ChangeTransitionParams не предполагает что у label будет position и при обновлении данных позиция слетает
    // Поэтому данные label нужно не просто перезаписать, а соединять с предыдущими
    const getNewLabel = () => {
      if (!label) return undefined;

      return { ...(transition.label ?? {}), ...label };
    };

    // Validation checks
    const sm = this.data.elements.stateMachines[smId];

    if (sm.initialStates[targetId]) {
      console.log('Cannot transition to initial state');
      return false;
    }

    const isChoiceState = sm.choiceStates[sourceId] !== undefined;
    const isInitialState = sm.initialStates[sourceId] !== undefined;
    const isEmptyTransition =
      !label?.trigger ||
      (typeof label.trigger === 'object' &&
        label.trigger.component === '' &&
        label.trigger.component === '');

    if (isEmptyTransition && !isChoiceState && !isInitialState) {
      console.log('Cannot have empty transition except from choice states and initial states');
      return false;
    }

    if (!isEmptyTransition && isChoiceState) {
      console.log('Cannot have transition with trigger from choice states');
      return false;
    }

    const isTargetNote = sm.notes[targetId] !== undefined;
    const isSourceNote = sm.notes[sourceId] !== undefined;

    if (isTargetNote && !isSourceNote) {
      console.log('Cannot transition to note unless source is also a note');
      return false;
    }

    const isFinalState = sm.finalStates[sourceId] !== undefined;

    if (isFinalState) {
      console.log('Cannot transition from final state');
      return false;
    }

    this.data.elements.stateMachines[smId].transitions[id] = {
      ...other,
      sourceId,
      targetId,
      label: getNewLabel(),
    };

    return true;
  }

  //TODO: Выделение пока будет так работать, в дальнейшем требуется доработка
  changeTransitionSelection(smId: string, id: string, selection: boolean) {
    const transition = this.data.elements.stateMachines[smId].transitions[id];
    if (!transition || this.data.elements.stateMachines[smId].initialStates[transition.sourceId])
      return false;

    transition.selection = selection;

    this.triggerDataUpdate('elements.transitions');
    return true;
  }

  changeStateMachinePosition(id: string, position: Point) {
    const sm = this.data.elements.stateMachines[id];
    if (!sm) return false;
    sm.position = position;

    return true;
  }

  changeTransitionPosition(smId: string, id: string, position: Point) {
    const transition = this.data.elements.stateMachines[smId].transitions[id];
    if (!transition || !transition.label) return false;

    transition.label.position = position;

    this.triggerDataUpdate('elements.transitions');

    return true;
  }

  deleteTransition(smId: string, id: string) {
    const transition = this.data.elements.stateMachines[smId].transitions[id];
    if (!transition) return false;

    delete this.data.elements.stateMachines[smId].transitions[id];

    this.triggerDataUpdate('elements.transitions');

    return true;
  }

  createComponent(args: CreateComponentParams) {
    const { smId, name, type, id, placeInCenter = false, position, parameters } = args;

    const centerPosition = () => {
      const size = 50;
      return {
        x: position.x - size / 2,
        y: position.y - size / 2,
      };
    };

    if (this.data.elements.stateMachines[smId].components.hasOwnProperty(id)) {
      console.error(['bad new component', id, name, type]);
      return name;
    }

    const getOrder = () => {
      const orders = Object.values(this.data.elements.stateMachines[smId].components).map(
        (c) => c.order
      );

      if (orders.length === 0) return 0;

      return Math.max(...orders) + 1;
    };

    this.data.elements.stateMachines[smId].components[id] = {
      type,
      name: name,
      position: placeInCenter ? centerPosition() : position,
      parameters,
      order: getOrder(),
    };
    this.triggerDataUpdate('elements.components');

    return name;
  }

  editComponent(smId: string, id: string, parameters: Component['parameters'], name?: string) {
    const component = this.data.elements.stateMachines[smId].components[id];
    if (!component) return false;

    component.parameters = parameters;
    component.name = name;
    this.triggerDataUpdate('elements.components');

    return true;
  }

  changeComponentName(smId: string, id: string, newId: string) {
    const component = this.data.elements.stateMachines[smId].components[id];
    if (!component) return false;

    this.data.elements.stateMachines[smId].components[newId] = component;

    delete this.data.elements.stateMachines[smId].components[id];
    this.renameComponentInEvents(this.data.elements.stateMachines[smId], id, newId);
    this.triggerDataUpdate('elements.components');

    return true;
  }

  deleteComponent(smId: string, name: string) {
    const component = this.data.elements.stateMachines[smId].components[name];
    if (!component) return false;

    delete this.data.elements.stateMachines[smId].components[name];

    this.triggerDataUpdate('elements.components');

    return true;
  }

  swapComponents(smId: string, args: SwapComponentsParams) {
    const { name1, name2 } = args;

    const component1 = this.data.elements.stateMachines[smId].components[name1];
    const component2 = this.data.elements.stateMachines[smId].components[name2];
    if (!component1 || !component2) return false;

    [component1.order, component2.order] = [component2.order, component1.order];

    this.triggerDataUpdate('elements.components');

    return true;
  }

  changeComponentPosition(smId: string, id: string, position: Point) {
    const component = this.data.elements.stateMachines[smId].components[id];
    if (!component) return false;

    component.position = position;

    this.triggerDataUpdate('elements.components');

    return true;
  }

  changeComponentSelection(smId: string, name: string, selection: boolean) {
    const component = this.data.elements.stateMachines[smId].components[name];
    if (!component) return false;

    component.selection = selection;

    this.triggerDataUpdate('elements.components');

    return true;
  }

  createNote(params: CreateNoteParams) {
    const {
      smId,
      id = generateId(Object.keys(this.data.elements.stateMachines[smId].notes)),
      text,
      placeInCenter = false,
      fontSize,
      backgroundColor,
      textColor,
    } = params;
    let position = params.position;

    const centerPosition = () => {
      return {
        x: position.x - 200 / 2,
        y: position.y - 36 / 2,
      };
    };

    position = placeInCenter ? centerPosition() : position;

    this.data.elements.stateMachines[smId].notes[id] = {
      text,
      position,
      fontSize,
      backgroundColor,
      textColor,
    };

    this.triggerDataUpdate('elements.notes');

    return id;
  }

  changeNoteText(smId: string, id: string, text: string) {
    if (!this.data.elements.stateMachines[smId].notes.hasOwnProperty(id)) return false;

    this.data.elements.stateMachines[smId].notes[id].text = text;

    this.triggerDataUpdate('elements.notes');

    return true;
  }

  //TODO: (XidFanSan) Выделение пока будет так работать, в дальнейшем требуется доработка
  changeNoteSelection(smId: string, id: string, selection: boolean) {
    const note = this.data.elements.stateMachines[smId].notes[id];
    if (!note) return false;

    note.selection = selection;
    return true;
  }

  changeNoteBackgroundColor(smId: string, id: string, color: string | undefined) {
    if (!this.data.elements.stateMachines[smId].notes.hasOwnProperty(id)) return false;

    this.data.elements.stateMachines[smId].notes[id].backgroundColor = color;

    this.triggerDataUpdate('elements.notes');

    return true;
  }

  changeNoteTextColor(smId: string, id: string, color: string | undefined) {
    if (!this.data.elements.stateMachines[smId].notes.hasOwnProperty(id)) return false;

    this.data.elements.stateMachines[smId].notes[id].textColor = color;

    this.triggerDataUpdate('elements.notes');

    return true;
  }

  changeNoteFontSize(smId: string, id: string, fontSize: number | undefined) {
    if (!this.data.elements.stateMachines[smId].notes.hasOwnProperty(id)) return false;

    this.data.elements.stateMachines[smId].notes[id].fontSize = fontSize;

    this.triggerDataUpdate('elements.notes');

    return true;
  }

  changeNotePosition(smId: string, id: string, position: Point) {
    const note = this.data.elements.stateMachines[smId].notes[id];
    if (!note) return false;

    note.position = position;

    this.triggerDataUpdate('elements.notes');

    return true;
  }

  deleteNote(smId: string, id: string) {
    const note = this.data.elements.stateMachines[smId].notes[id];
    if (!note) return false;

    delete this.data.elements.stateMachines[smId].notes[id];

    this.triggerDataUpdate('elements.notes');

    return true;
  }

  setMeta(smId: string, meta: Meta) {
    if (!this.data.elements.stateMachines[smId]) return false;

    this.data.elements.stateMachines[smId].meta = meta;

    this.triggerDataUpdate('elements.meta');

    return true;
  }

  setTextMode(smId: string) {
    this.data.elements.stateMachines[smId].visual = false;

    this.triggerDataUpdate('elements.visual');

    return true;
  }
}
