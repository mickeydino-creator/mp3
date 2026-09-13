import Converter from "../components/Converter";

export default function Home() {
  return (
    <div className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Convert your videos.
          <br />
          Simple. Fast.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink/50 sm:text-lg">
          Paste a link, pick MP3 or MP4, and download in seconds. No installs, no clutter.
        </p>
      </div>

      <div className="mt-12">
        <Converter />
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-ink/40">
        Convertly is intended only for videos you own or have explicit permission to download.
        Do not use this service to convert copyrighted content without authorization. See our{" "}
        <a href="/terms" className="underline underline-offset-2 hover:text-ink/60">
          Terms of Use
        </a>{" "}
        for details.
      </p>
    </div>
  );
}
