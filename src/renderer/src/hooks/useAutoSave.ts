import { useEffect, useState } from 'react';

import { useModelContext } from '@renderer/store/ModelContext';

import { useErrorModal } from './useErrorModal';
import { useFileOperations } from './useFileOperations';
import { useModal } from './useModal';
import { useSettings } from './useSettings';

const tempSaveKey = 'tempSave';

export const useAutoSave = () => {
  const modelController = useModelContext();

  const isStale = modelController.model.useData('', 'isStale');
  const isInitialized = modelController.model.useData('', 'isInitialized');
  const basename = modelController.model.useData('', 'basename');

  const [autoSaveSettings] = useSettings('autoSave');
  const [restoreSession, setRestoreSession] = useSettings('restoreSession');

  const [isRestoreDataModalOpen, openRestoreDataModal, closeRestoreDataModal] = useModal(false);

  const { openSaveError, openImportError } = useErrorModal();
  const { initParseData, operations, saveModalProps } = useFileOperations({
    openLoadError: () => undefined,
    openSaveError,
    openCreateSchemeModal: () => undefined,
    openImportError,
  });

  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(saveModalProps.isOpen);
  /**
   * Временное сохранение схемы в localstorage
   */
  const tempSave = async () => {
    window.localStorage.setItem(tempSaveKey, modelController.model.serializer.getAll('Cyberiada'));
    if (!restoreSession) {
      await setRestoreSession(true);
    }
  };

  const loadTempSave = async () => {
    const restoredData = window.localStorage.getItem(tempSaveKey);
    if (restoredData === null) {
      return false;
    }
    if (!initParseData(restoredData)) {
      return false;
    }
    if (!restoreSession) {
      await setRestoreSession(true);
    }
    return true;
  };

  const deleteTempSave = async () => {
    window.localStorage.removeItem(tempSaveKey);
    if (restoreSession) {
      await setRestoreSession(false);
    }
  };

  useEffect(() => {
    if (saveModalProps.isOpen !== isSaveModalOpen) {
      setIsSaveModalOpen(saveModalProps.isOpen);
    }
  }, [saveModalProps]);

  useEffect(() => {
    console.log(
      'autoSaveSettings, isStale, isInitialized, basename, restoreSession, saveModalProps',
      autoSaveSettings,
      isStale,
      isInitialized,
      basename,
      restoreSession,
      saveModalProps.isOpen
    );
    if (autoSaveSettings === null || restoreSession === null || saveModalProps.isOpen) return;

    if (autoSaveSettings.disabled && restoreSession) {
      deleteTempSave();
      return;
    }

    if (!basename && restoreSession && !isInitialized && !isRestoreDataModalOpen) {
      openRestoreDataModal();
      return;
    }

    if (basename && isInitialized && restoreSession) {
      deleteTempSave();
    }

    if (!isStale || !isInitialized) return;

    const ms = autoSaveSettings.interval * 1000;
    let interval: NodeJS.Timeout;
    if (basename) {
      interval = setInterval(async () => {
        await operations.onRequestSaveFile();
      }, ms);
    } else {
      interval = setInterval(async () => {
        console.log('temp save...');
        await tempSave();
      }, ms);
    }

    //Clearing the intervals
    return () => clearInterval(interval);
  }, [autoSaveSettings, isStale, isInitialized, basename, restoreSession, isSaveModalOpen]);

  return {
    restoreDataModalProps: {
      isOpen: isRestoreDataModalOpen,
      onClose: closeRestoreDataModal,
      onRestore: async () => {
        await loadTempSave();
      },
      onCancelRestore: deleteTempSave,
    },
    deleteTempSave,
  };
};
