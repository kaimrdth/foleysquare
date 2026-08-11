const GOOGLE_MAPS_URL = "https://maps.googleapis.com/maps/api/js";
let loaderPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __initFoleyMap?: () => void;
  }
}

export function loadGoogleMaps() {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));
  }

  loaderPromise = new Promise((resolve, reject) => {
    window.__initFoleyMap = () => resolve();

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      callback: "__initFoleyMap",
      libraries: "geometry",
      v: "weekly",
    });

    script.src = `${GOOGLE_MAPS_URL}?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
