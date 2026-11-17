"use client";
import { useEffect, useState } from "react";
import { DEFAULT_TIME_ZONE, validTimeZone } from "./time";
export function useTimeZone() {
  const [zone, setZone] = useState(DEFAULT_TIME_ZONE);
  useEffect(() => {
    const read = () => {
      try {
        const value = localStorage.getItem("gossaem-timezone");
        setZone(value && validTimeZone(value) ? value : DEFAULT_TIME_ZONE);
      } catch {
        setZone(DEFAULT_TIME_ZONE);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
    };
  }, []);
  return zone;
}
