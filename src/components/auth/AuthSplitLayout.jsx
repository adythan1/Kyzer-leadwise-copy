// src/components/auth/AuthSplitLayout.jsx
import { Link } from "react-router-dom";
import leadwiseLogo from "../../assets/images/leadwise.svg";
import studentVector from "../../assets/images/studentvector.png";

const AUTH_HERO_DESCRIPTION =
  "Build skills at your pace.";

/** Dark panel: solid primary-dark base, image on top of it, then navy scrim (image reads as on dark canvas). */
const HERO_DARK = "#0D1821";

const heroPanelBackgroundStyle = {
  backgroundColor: HERO_DARK,
  backgroundImage: [
    "linear-gradient(180deg, rgb(13 24 33 / 0.94) 0%, rgb(13 24 33 / 0.72) 22%, rgb(13 24 33 / 0.52) 45%, rgb(13 24 33 / 0.68) 70%, rgb(13 24 33 / 0.92) 100%)",
    `url(${studentVector})`,
  ].join(", "),
  backgroundSize: "cover, contain",
  backgroundPosition: "center, bottom center",
  backgroundRepeat: "no-repeat, no-repeat",
};

export default function AuthSplitLayout({ children }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-6 sm:px-6 flex items-center justify-center">
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-br from-background-light via-white to-background-medium"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[32rem] w-[min(100vw,56rem)] -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-primary-dark/25 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-[8%] -z-10 h-80 w-80 rounded-full bg-primary/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 left-[-10%] -z-10 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl sm:left-0"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgb(55_65_81_/_0.06),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-0 w-full max-w-5xl rounded-2xl border border-border/80 bg-background-white/95 shadow-lg shadow-text-dark/5 ring-1 ring-black/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
          <div
            className="relative flex min-h-[220px] flex-col justify-between gap-6 px-6 py-8 text-white sm:min-h-[260px] sm:px-8 sm:py-10 lg:min-h-[min(24rem,50vh)] lg:gap-5 lg:px-8 lg:py-8 lg:pr-6"
            style={heroPanelBackgroundStyle}
          >
            <div
              className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
              aria-hidden
            />

            <div className="relative z-10">
              <Link
                to="/"
                className="inline-flex outline-none ring-offset-2 ring-offset-primary-dark focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <img
                  src={leadwiseLogo}
                  alt="Leadwise — Home"
                  className="h-9 w-auto opacity-95 brightness-0 invert sm:h-10"
                />
              </Link>
            </div>

            <div className="relative z-10 flex flex-1 flex-col gap-5 lg:gap-4">
              <div className="motion-safe:animate-home-fade-up motion-reduce:animate-none">
                <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-2xl xl:text-3xl">
                  Transform learning into{" "}
                  <span className="bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
                    growth
                  </span>
                </h1>
                <p className="mt-2 max-w-md text-xs leading-relaxed sm:text-sm motion-safe:animate-home-fade-up motion-safe:delay-100 motion-reduce:animate-none motion-reduce:delay-0 lg:mt-3 bg-gradient-to-r from-blue-200 to-green-200 bg-clip-text text-transparent">
                  {AUTH_HERO_DESCRIPTION}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-border bg-background-white px-5 py-6 sm:px-7 sm:py-8 lg:border-t-0 lg:border-l lg:border-border lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-lg space-y-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
