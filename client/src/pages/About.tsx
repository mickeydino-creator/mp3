import PageShell from "../components/PageShell";

export default function About() {
  return (
    <PageShell title="About Convertly">
      <p>
        Convertly is a fast, minimal tool for converting your own YouTube videos into MP3 or
        MP4 files. Paste a link, choose a format and quality, and get a file you can keep and
        use offline.
      </p>
      <p>
        We built Convertly around a simple idea: converting a video you already have the
        rights to shouldn't require sketchy pop-ups, bloated software, or confusing settings.
        The interface stays out of your way, and the conversion pipeline runs entirely on our
        servers so nothing needs to be installed on your device.
      </p>
      <p>
        Convertly is intended strictly for videos you own or have explicit permission to
        download and convert. It is not designed or intended to bypass copyright protections,
        access restricted or private content, or circumvent platform security mechanisms. Read
        our{" "}
        <a href="/terms" className="font-medium text-ink underline underline-offset-2">
          Terms of Use
        </a>{" "}
        for the full policy.
      </p>
    </PageShell>
  );
}
