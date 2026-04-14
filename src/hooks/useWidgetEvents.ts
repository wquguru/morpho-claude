"use client";

import { useEffect } from "react";
import { useWidgetEvents, WidgetEvent } from "@lifi/widget";
import { toast } from "sonner";

export function useLiFiWidgetEvents() {
  const events = useWidgetEvents();

  useEffect(() => {
    const onStarted = () => toast.info("Transaction started...");
    const onCompleted = () => toast.success("Transaction completed!");
    const onFailed = () => toast.error("Transaction failed");

    events.on(WidgetEvent.RouteExecutionStarted, onStarted);
    events.on(WidgetEvent.RouteExecutionCompleted, onCompleted);
    events.on(WidgetEvent.RouteExecutionFailed, onFailed);

    return () => {
      events.off(WidgetEvent.RouteExecutionStarted, onStarted);
      events.off(WidgetEvent.RouteExecutionCompleted, onCompleted);
      events.off(WidgetEvent.RouteExecutionFailed, onFailed);
    };
  }, [events]);
}
