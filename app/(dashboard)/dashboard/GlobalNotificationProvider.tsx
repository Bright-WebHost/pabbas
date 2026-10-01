"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrderStatusPayload {
  new?: any;
  old?: any;
}

interface NotificationContextType {
  newOrder: any | null;
  acknowledgeOrder: (orderId: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  newOrder: null,
  acknowledgeOrder: () => {},
});

export const useGlobalNotification = () => useContext(NotificationContext);

export function GlobalNotificationProvider({ children }: { children: React.ReactNode }) {
  const [newOrder, setNewOrder] = useState<any | null>(null);
  
  const supabase = useRef(createClient());
  const soundTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopSound = useCallback(() => {
    if (soundTimerRef.current) {
      window.clearInterval(soundTimerRef.current);
      soundTimerRef.current = null;
    }
  }, []);

  const startSound = useCallback(() => {
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtor();
      }

      if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }

      if (soundTimerRef.current) {
        window.clearInterval(soundTimerRef.current);
      }

      const beep = () => {
        if (!audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtxRef.current.currentTime + 1);
        osc.stop(audioCtxRef.current.currentTime + 1);
      };

      beep();
      soundTimerRef.current = window.setInterval(beep, 1800);
    } catch (err) {
      console.warn("Sound play failed", err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const channel = supabase.current.channel("pabbas-orders-live-global");
    channel.on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: OrderStatusPayload) => {
      if (!active) return;
      if (payload.new && payload.new.status === "new" && (!payload.old || payload.old.status !== "new")) {
        setNewOrder(payload.new);
        startSound();
      }
    });

    void channel.subscribe();

    return () => {
      active = false;
      stopSound();
      supabase.current.removeChannel(channel);
    };
  }, [startSound, stopSound]);

  const acknowledgeOrder = useCallback((orderId: string) => {
    setNewOrder((prev: any) => {
      if (prev?.id === orderId) {
        stopSound();
        return null;
      }
      return prev;
    });
  }, [stopSound]);

  return (
    <NotificationContext.Provider value={{ newOrder, acknowledgeOrder }}>
      {children}
    </NotificationContext.Provider>
  );
}
