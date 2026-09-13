import PageShell from "../components/PageShell";

export default function Privacy() {
  return (
    <PageShell title="Privacy Policy">
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <div>
        <h2 className="mb-1 font-semibold text-ink">What we process</h2>
        <p>
          When you submit a video URL, we look up its public metadata (title, thumbnail,
          duration) and, if you start a conversion, temporarily process the video on our
          servers to produce the MP3 or MP4 file you requested.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">Temporary storage</h2>
        <p>
          Converted files are stored only long enough for you to download them, and are
          automatically and permanently deleted from our servers a short time after
          conversion completes, whether or not you download them.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">What we don't do</h2>
        <p>
          We do not sell your data, build advertising profiles, or retain converted files
          longer than necessary to serve your download. We do not require an account to use
          Convertly.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">Rate limiting data</h2>
        <p>
          To prevent abuse, we track request counts per network address over short time
          windows. This data is used only for rate limiting and is not linked to any
          converted content.
        </p>
      </div>
    </PageShell>
  );
}
