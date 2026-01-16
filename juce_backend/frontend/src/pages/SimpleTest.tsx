export default function SimpleTest() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-daw-text-primary">UI Smoke Test</h1>
      <p className="text-daw-text-secondary">
        Use this route to sanity-check layout components without spinning up the full dashboard. The view renders a
        couple of headings, buttons, and form controls so you can verify Tailwind styles and global providers quickly.
      </p>
      <div className="flex gap-3">
        <button className="rounded-md bg-daw-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-daw-accent-primary/90">
          Primary Action
        </button>
        <button className="rounded-md border border-daw-border px-4 py-2 text-sm font-medium text-daw-text-secondary hover:bg-daw-surface-secondary">
          Secondary
        </button>
      </div>
      <label className="block text-sm">
        <span className="text-daw-text-secondary">Sample Input</span>
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-daw-border bg-daw-surface px-3 py-2 text-daw-text-primary focus:border-daw-accent-primary focus:outline-none"
          placeholder="Type here"
        />
      </label>
    </div>
  );
}
