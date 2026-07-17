import { useEffect, useRef } from "react";

import type { AppSettings } from "../../domain/appSettings";

const settingsSaveDebounceMs = 400;

export function useAccountSettingsAutoSave(params: {
  buildSettings: (updatedAt: string) => AppSettings;
  changeKey: string;
  enabled: boolean;
  isApplyingRemoteSettingsRef: { current: boolean };
  onError: (error: unknown) => void;
  onSaved: (settings: AppSettings) => void;
  ownerId: string;
  saveSettings: (settings: AppSettings) => Promise<AppSettings | null>;
  userId: string | null;
}) {
  const revisionRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const hasObservedBaselineRef = useRef(false);
  const enabledRef = useRef(params.enabled);
  const buildSettingsRef = useRef(params.buildSettings);
  const saveSettingsRef = useRef(params.saveSettings);
  const onSavedRef = useRef(params.onSaved);
  const onErrorRef = useRef(params.onError);
  const flushRef = useRef<() => void>(() => undefined);

  enabledRef.current = params.enabled;
  buildSettingsRef.current = params.buildSettings;
  saveSettingsRef.current = params.saveSettings;
  onSavedRef.current = params.onSaved;
  onErrorRef.current = params.onError;

  const clearPendingSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleSave = (delay = settingsSaveDebounceMs) => {
    clearPendingSave();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      flushRef.current();
    }, delay);
  };

  flushRef.current = () => {
    if (!enabledRef.current) {
      return;
    }
    if (isSavingRef.current) {
      return;
    }

    const revision = revisionRef.current;
    const settings = buildSettingsRef.current(new Date().toISOString());
    isSavingRef.current = true;
    void saveSettingsRef.current(settings).then((savedSettings) => {
      if (savedSettings && enabledRef.current && revisionRef.current === revision) {
        onSavedRef.current(savedSettings);
      }
    }).catch((error) => {
      if (enabledRef.current && revisionRef.current === revision) {
        onErrorRef.current(error);
      }
    }).finally(() => {
      isSavingRef.current = false;
      if (enabledRef.current && revisionRef.current !== revision) {
        scheduleSave(0);
      }
    });
  };

  useEffect(() => {
    revisionRef.current += 1;
    clearPendingSave();
    hasObservedBaselineRef.current = false;
  }, [params.ownerId, params.userId]);

  useEffect(() => {
    if (!params.enabled || params.isApplyingRemoteSettingsRef.current) {
      clearPendingSave();
      hasObservedBaselineRef.current = false;
      return;
    }

    if (!hasObservedBaselineRef.current) {
      hasObservedBaselineRef.current = true;
      return;
    }

    revisionRef.current += 1;
    scheduleSave();
    return clearPendingSave;
  }, [params.changeKey, params.enabled, params.isApplyingRemoteSettingsRef]);

  useEffect(() => () => {
    enabledRef.current = false;
    revisionRef.current += 1;
    clearPendingSave();
  }, []);
}
