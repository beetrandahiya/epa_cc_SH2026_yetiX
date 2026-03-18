import { LineageSankey } from "@/components/charts";

export default function LineagePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Data Origin & Structure</h1>
        <p className="mt-2 text-sm opacity-80">
          End-to-end lineage from heterogeneous source files to harmonized analytics tables.
        </p>
      </section>

      <LineageSankey />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">Before Harmonization</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>Mixed case ID formats and inconsistent null tokens</li>
            <li>Raw free-text without structured extraction</li>
            <li>No unified timeline across labs/meds/device events</li>
          </ul>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm opacity-70">After Harmonization</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>Canonical case and patient IDs</li>
            <li>Standardized missing-value semantics</li>
            <li>Unified case timeline and alert stream</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
