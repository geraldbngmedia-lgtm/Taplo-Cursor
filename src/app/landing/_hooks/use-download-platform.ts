"use client";

import { useEffect, useState } from "react";
import {
  detectDownloadPlatform,
  type DetectedDownloadPlatform,
} from "../lib/detect-platform";

export function useDownloadPlatform() {
  const [platform, setPlatform] = useState<DetectedDownloadPlatform>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlatform(detectDownloadPlatform());
    setReady(true);
  }, []);

  return { platform, ready };
}
