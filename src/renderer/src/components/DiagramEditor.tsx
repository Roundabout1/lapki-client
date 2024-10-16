import { useEffect, useRef, useState } from 'react';

import {
  NoteEdit,
  StateNameEdit,
  ActionsModal,
  ActionsModalData,
  StateModal,
  TransitionModal,
} from '@renderer/components';
import { useSettings } from '@renderer/hooks';
import { useModal } from '@renderer/hooks/useModal';
import { EventSelection, State } from '@renderer/lib/drawable';
import { Point } from '@renderer/lib/types';
import { useEditorContext } from '@renderer/store/EditorContext';
import { Event } from '@renderer/types/diagram';

export const DiagramEditor: React.FC = () => {
  const editor = useEditorContext();

  const isMounted = editor.model.useData('isMounted');

  const [canvasSettings] = useSettings('canvas');

  const containerRef = useRef<HTMLDivElement>(null);

  const [isActionsModalOpen, openActionsModal, closeActionsModal] = useModal(false);
  const [actionsModalData, setActionsModalData] = useState<ActionsModalData>();
  // Дополнительные данные о родителе события
  const [actionsModalParentData, setActionsModalParentData] = useState<{
    state: State;
    eventSelection: EventSelection;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;

    editor.mount(containerRef.current);

    const handleDblclick = (position: Point) => {
      editor.controller.states.createState({
        name: 'Состояние',
        position,
        placeInCenter: true,
      });
    };

    const handleChangeEvent = (data: {
      state: State;
      eventSelection: EventSelection;
      event: Event;
      isEditingEvent: boolean;
    }) => {
      const { state, eventSelection, event, isEditingEvent } = data;

      setActionsModalParentData({ state, eventSelection });
      setActionsModalData({ action: event, isEditingEvent });
      openActionsModal();
    };

    editor.view.on('dblclick', handleDblclick);
    editor.controller.states.on('changeEvent', handleChangeEvent);

    //! Не забывать удалять слушатели
    return () => {
      editor.view.off('dblclick', handleDblclick);
      editor.controller.states.off('changeEvent', handleChangeEvent);

      editor.unmount();
    };
    // FIXME: containerRef не влияет на перезапуск эффекта.
    // Скорее всего, контейнер меняться уже не будет, поэтому
    // реф закомментирован, но если что, https://stackoverflow.com/a/60476525.
    // }, [ containerRef.current ]);
  }, [editor, openActionsModal]);

  useEffect(() => {
    if (!canvasSettings) return;

    editor.setSettings(canvasSettings);
  }, [canvasSettings, editor]);

  const handleActionsModalSubmit = (data: Event) => {
    if (!actionsModalParentData) return;

    editor.controller.states.changeEvent(
      actionsModalParentData.state.id,
      actionsModalParentData.eventSelection,
      data
    );

    closeActionsModal();
  };

  return (
    <>
      <div className="relative h-full overflow-hidden bg-neutral-800" ref={containerRef}></div>

      {isMounted && (
        <>
          <StateNameEdit />
          <NoteEdit />

          <StateModal />
          <TransitionModal />

          <ActionsModal
            initialData={actionsModalData}
            onSubmit={handleActionsModalSubmit}
            isOpen={isActionsModalOpen}
            onClose={closeActionsModal}
          />
        </>
      )}
    </>
  );
};
