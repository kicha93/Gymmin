import { useEffect, useRef } from "react";

import type { AppSettings } from "../../domain/appSettings";

const settingsSaveDebounceMs = 400;

export function shouldScheduleAccountSettingsSave(params: {
  enabled: boolean;
  isApplyingRemoteSettings: boolean;
  nextChangeKey: string;
  observedChangeKey: string;
}) {
  return params.nextChangeKey !== params.observedChangeKey
    && params.enabled
    && !params.isApplyingRemoteSettings;
}

export function useAccountSettingsAutoSave<TSettings extends AppSettings>(params: {
  buildSettings: (updatedAt: string) => TSettings;
  changeKey: string;
  enabled: boolean;
  isApplyingRemoteSettingsRef: { current: boolean };
  onError: (error: unknown) => void;
  onSaving?: (settings: TSettings) => void;
  onSaved: (settings: TSettings) => void;
  ownerId: string;
  saveSettings: (settings: TSettings) => Promise<TSettings | null>;
  userId: string | null;
}) {
  const revisionRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const observedChangeKeyRef = useRef(params.changeKey);
  const enabledRef = useRef(params.enabled);
  const buildSettingsRef = useRef(params.buildSettings);
  const saveSettingsRef = useRef(params.saveSettings);
  const onSavedRef = useRef(params.onSaved);
  const onSavingRef = useRef(params.onSaving);
  const onErrorRef = useRef(params.onError);
  const flushRef = useRef<() => void>(() => undefined);

  enabledRef.current = params.enabled;
  buildSettingsRef.current = params.buildSettings;
  saveSettingsRef.current = params.saveSettings;
  onSavedRef.current = params.onSaved;
  onSavingRef.current = params.onSaving;
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
    onSavingRef.current?.(settings);
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
    observedChangeKeyRef.current = params.changeKey;
  }, [params.ownerId, params.userId]);

  useEffect(() => {
    const previousChangeKey = observedChangeKeyRef.current;
    if (previousChangeKey === params.changeKey) {
      return;
    }

    observedChangeKeyRef.current = params.changeKey;
    if (!shouldScheduleAccountSettingsSave({
      enabled: params.enabled,
      isApplyingRemoteSettings: params.isApplyingRemoteSettingsRef.current,
      nextChangeKey: params.changeKey,
      observedChangeKey: previousChangeKey
    })) {
      clearPendingSave();
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
