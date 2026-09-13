import PageShell from "../components/PageShell";

export default function Terms() {
  return (
    <PageShell title="Terms of Use">
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <div>
        <h2 className="mb-1 font-semibold text-ink">1. Permitted use</h2>
        <p>
          Convertly may only be used to convert videos that you own, that you created, or that
          you have explicit permission or a license from the rights holder to download and
          convert. You are solely responsible for ensuring you have the right to convert any
          video you submit.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">2. Prohibited use</h2>
        <p>You agree not to use Convertly to:</p>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Download or convert copyrighted content without authorization from the rights holder.</li>
          <li>Bypass digital rights management (DRM) or other copy-protection mechanisms.</li>
          <li>Access private, restricted, age-gated, or otherwise non-public content without permission.</li>
          <li>Circumvent platform security, rate limits, or terms of service of any third-party site.</li>
          <li>Redistribute converted files in a way that infringes third-party rights.</li>
        </ul>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">3. No warranty</h2>
        <p>
          Convertly is provided "as is." We do not guarantee that every video will be
          convertible, that conversions will be error-free, or that the service will be
          available at all times.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">4. Limits</h2>
        <p>
          To keep the service reliable for everyone, Convertly enforces rate limits, maximum
          video duration, and maximum file size. Converted files are stored temporarily and
          automatically deleted after a short period.
        </p>
      </div>

      <div>
        <h2 className="mb-1 font-semibold text-ink">5. Termination</h2>
        <p>
          We may suspend or restrict access for any use that violates these terms, including
          suspected copyright infringement or abuse of the service.
        </p>
      </div>
    </PageShell>
  );
}
