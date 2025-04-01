import React, { useReducer, useRef } from 'react';

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from 'react-resizable-panels';
import { twMerge } from 'tailwind-merge';

import { ReactComponent as ArrowIcon } from '@renderer/assets/icons/arrow-down.svg';
import { useModelContext } from '@renderer/store/ModelContext';
import { StateMachine } from '@renderer/types/diagram';

import { ComponentsList } from './ComponentsList';
import { StateMachinesHierarchy } from './StateMachinesHierarchy';

export const Explorer: React.FC = () => {
  const modelController = useModelContext();
  const isInitialized = modelController.model.useData('', 'isInitialized');
  const stateMachines = [
    ...Object.entries(
      modelController.model.useData('', 'elements.stateMachinesId') as {
        [id: string]: StateMachine;
      }
    ),
  ];

  const panelsRefs: React.MutableRefObject<Map<string, ImperativePanelHandle | null> | null> =
    useRef<Map<string, ImperativePanelHandle | null>>(null);
  const [, forceUpdate] = useReducer((p) => p + 1, 0);

  if (!panelsRefs.current) {
    panelsRefs.current = new Map();
  }
  const refMap = panelsRefs.current;

  const togglePanel = (panelId: string) => {
    const panel = refMap.get(panelId);
    if (!panel) return;

    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }

    forceUpdate();
  };

  const refCallback = (node: ImperativePanelHandle | null, panelId: string) => {
    refMap.set(panelId, node);

    return () => {
      refMap.delete(panelId);
    };
  };

  return (
    <section className="flex h-full flex-col">
      <h3 className="mx-4 border-b border-border-primary py-2 text-center text-lg">Диаграмма</h3>
      <PanelGroup direction="vertical">
        {stateMachines.map(([smId, sm]) => {
          if (!smId) return;
          const mainPanelId = smId + '-main';
          const componentsPanelId = mainPanelId + '-components';
          const hierarchyPanelId = mainPanelId + '-hierarchy';
          return (
            <Panel
              id={mainPanelId}
              ref={(node) => refCallback(node, mainPanelId)}
              collapsible
              defaultSize={50}
              minSize={3}
              collapsedSize={3}
              onCollapse={forceUpdate}
              onExpand={forceUpdate}
              className="px-4"
            >
              <div className="my-3 flex items-center">
                <button onClick={() => togglePanel(mainPanelId)}>
                  <ArrowIcon
                    className={twMerge(
                      'rotate-0 transition-transform',
                      refMap.get(mainPanelId)?.isCollapsed() && '-rotate-90'
                    )}
                  />
                </button>
                <h3 className="font-semibold">{sm.name ?? smId}</h3>
              </div>

              <PanelGroup direction="vertical">
                <Panel
                  ref={(node) => refCallback(node, componentsPanelId)}
                  id={componentsPanelId}
                  collapsible
                  defaultSize={50}
                  minSize={3}
                  collapsedSize={3}
                  onCollapse={forceUpdate}
                  onExpand={forceUpdate}
                  className="px-4"
                >
                  <div className="my-3 flex items-center">
                    <button onClick={() => togglePanel(componentsPanelId)}>
                      <ArrowIcon
                        className={twMerge(
                          'rotate-0 transition-transform',
                          refMap.get(componentsPanelId)?.isCollapsed() && '-rotate-90'
                        )}
                      />
                    </button>
                    <h3 className="font-semibold">Компоненты</h3>
                  </div>

                  {isInitialized ? <ComponentsList /> : 'Недоступно до открытия схемы'}
                </Panel>

                <PanelResizeHandle className="group relative py-1">
                  <div className="absolute left-0 right-0 top-1/2 h-[1px] -translate-y-1/2 bg-border-primary transition-colors group-hover:h-1 group-hover:bg-primary group-active:h-1 group-active:bg-primary"></div>
                </PanelResizeHandle>

                <Panel
                  id={hierarchyPanelId}
                  ref={(node) => refCallback(node, hierarchyPanelId)}
                  collapsible
                  minSize={3}
                  collapsedSize={3}
                  onCollapse={forceUpdate}
                  onExpand={forceUpdate}
                  className="px-4"
                >
                  <div className="my-3 flex items-center">
                    <button onClick={() => togglePanel(hierarchyPanelId)}>
                      <ArrowIcon
                        className={twMerge(
                          'rotate-0 transition-transform',
                          refMap.get(hierarchyPanelId)?.isCollapsed() && '-rotate-90'
                        )}
                      />
                    </button>
                    <h3 className="font-semibold">Иерархия</h3>
                  </div>

                  {isInitialized ? <StateMachinesHierarchy /> : 'Недоступно до открытия схемы'}
                </Panel>
              </PanelGroup>
            </Panel>
          );
        })}
      </PanelGroup>
    </section>
  );
};
