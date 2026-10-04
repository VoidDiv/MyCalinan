/* FILE: app/layout.tsx   (REPLACE whole file)
   Your layout with the splash screen (components/SplashScreen.tsx), plus <UpdateNotifier />
   (the "Update your MyCalinan app" check). It draws NOTHING unless a newer version is live.
   Uses only files your project already has. */
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import LanguageProvider from "@/components/LanguageProvider";
import OfflineSupport from "@/components/OfflineSupport";
import SplashScreen from "@/components/SplashScreen";
import UpdateNotifier from "@/components/UpdateNotifier";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

/* Runs before the page paints. If MyCalinan was opened as an INSTALLED APP (not in a
   browser tab) and this is a fresh launch, it switches the launch splash on and makes the
   phone's top bar the same colour as the splash (so the colours blend). The green top bar
   comes back when the splash is gone (see components/SplashScreen.tsx). */
const LAUNCH_SPLASH_SCRIPT = `(function(){try{
var standalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
if(standalone&&!sessionStorage.getItem("mc_splash")){
document.documentElement.classList.add("mc-splash-on");
var m=document.createElement("meta");m.name="theme-color";m.content="#fdfdfc";m.id="mc-splash-theme";
document.head.insertBefore(m,document.head.firstChild);
}
}catch(e){}})();`;

/* iPhone launch pictures. iOS needs one image per screen size, matched by these rules. */
const iphone = (cssWidth: number, cssHeight: number, ratio: number, file: string) => ({
  url: `/splash/${file}`,
  media: `(device-width: ${cssWidth}px) and (device-height: ${cssHeight}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
});

const START_UP_IMAGES = [
  iphone(375, 667, 2, "iphone-750x1334.jpg"), // SE, 8
  iphone(375, 812, 3, "iphone-1125x2436.jpg"), // X, XS, 11 Pro, 12/13 mini
  iphone(414, 896, 2, "iphone-828x1792.jpg"), // XR, 11
  iphone(414, 896, 3, "iphone-1242x2688.jpg"), // XS Max, 11 Pro Max
  iphone(390, 844, 3, "iphone-1170x2532.jpg"), // 12, 13, 14
  iphone(428, 926, 3, "iphone-1284x2778.jpg"), // 12/13 Pro Max, 14 Plus
  iphone(393, 852, 3, "iphone-1179x2556.jpg"), // 14 Pro, 15, 15 Pro, 16
  iphone(430, 932, 3, "iphone-1290x2796.jpg"), // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  iphone(402, 874, 3, "iphone-1206x2622.jpg"), // 16 Pro
  iphone(440, 956, 3, "iphone-1320x2868.jpg"), // 16 Pro Max
];

export const viewport: Viewport = {
  themeColor: "#1f4d33",
};

export const metadata: Metadata = {
  title: {
    default: "MyCalinan — Calinan, Davao City",
    template: "%s | MyCalinan",
  },
  description:
    "Tourism, services, and community information for Calinan Poblacion, Davao City.",
  applicationName: "MyCalinan",
  appleWebApp: {
    capable: true,
    title: "MyCalinan",
    statusBarStyle: "default",
    startupImage: START_UP_IMAGES,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LAUNCH_SPLASH_SCRIPT }} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body
        className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} antialiased`}
      >
        <SplashScreen />
        <LanguageProvider>
          <OfflineSupport />
          {children}
        </LanguageProvider>
        <PwaRegister />
        <UpdateNotifier />
      </body>
    </html>
  );
}