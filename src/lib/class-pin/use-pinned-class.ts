"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onPinChange,
  readPinState,
  setNotifyEnabled,
  setPinnedClassId,
  type PinState,
} from "@/lib/class-pin/storage";

export function usePinnedClass() {
  const [state, setState] = useState<PinState>({ classId: null, notify: false });

  useEffect(() => {
    setState(readPinState());
    return onPinChange(setState);
  }, []);

  const pin = useCallback((classId: string) => {
    setPinnedClassId(classId);
  }, []);

  const unpin = useCallback(() => {
    setPinnedClassId(null);
  }, []);

  const setNotify = useCallback((enabled: boolean) => {
    setNotifyEnabled(enabled);
  }, []);

  return {
    classId: state.classId,
    notify: state.notify,
    pin,
    unpin,
    setNotify,
  };
}
