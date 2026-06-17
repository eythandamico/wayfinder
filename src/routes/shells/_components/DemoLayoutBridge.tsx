"use client";

import { useEffect } from "react";
import { useLayoutDispatch } from "../_layout/LayoutContext";

type AddPanelDetail = {
  panelType: string;
  panelId?: string;
};

/** Bridges demo runner events that need to mutate the layout tree.
 *  Must be mounted inside LayoutProvider since it calls
 *  useLayoutDispatch. Today it handles `wf:demo:add-panel` by
 *  appending a panel of the given type to the layout root — used by
 *  the demo to bring Companion / Friends in mid-sequence without
 *  leaving them mounted by default. */
export function DemoLayoutBridge() {
  const dispatch = useLayoutDispatch();

  useEffect(() => {
    if (!dispatch) return;
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent<AddPanelDetail>).detail;
      if (!detail?.panelType) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const panelType = detail.panelType as any;
      dispatch({
        type: "addPanel",
        panel: {
          id: detail.panelId ?? `demo-${detail.panelType}-${Date.now()}`,
          type: panelType,
        },
      });
    };
    window.addEventListener("wf:demo:add-panel", onAdd as EventListener);
    return () =>
      window.removeEventListener("wf:demo:add-panel", onAdd as EventListener);
  }, [dispatch]);

  return null;
}
