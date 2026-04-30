export default function DashboardLoading() {
  return (
    <main className="dashboard-shell mx-auto min-h-screen w-full max-w-6xl p-5 md:p-10">
      <section className="hero-band rise-in mb-8 overflow-hidden rounded-3xl border p-6 md:p-7" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-10 w-[min(22rem,90vw)]" />
            <div className="skeleton h-4 w-[min(30rem,100%)]" />
          </div>
          <div className="skeleton h-11 w-28 rounded-xl" />
        </div>
      </section>

      <section className="rise-in grid gap-4 md:grid-cols-3">
        <div className="surface-card rounded-2xl p-5">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-4 h-6 w-28" />
        </div>
        <div className="surface-card rounded-2xl p-5">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-4 h-6 w-40" />
        </div>
        <div className="surface-card rounded-2xl p-5">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton mt-4 h-6 w-52" />
        </div>
      </section>

      <section className="rise-in mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <article className="surface-card rounded-2xl p-5 md:p-6">
          <div className="skeleton h-6 w-28" />
          <div className="mt-4 space-y-3">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-11 w-full rounded-xl" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-11 w-full rounded-xl" />
          </div>
        </article>

        <article className="surface-card rounded-2xl p-5 md:p-6">
          <div className="skeleton h-6 w-28" />
          <div className="skeleton mt-4 h-64 w-full rounded-xl" />
        </article>
      </section>

      <section className="surface-card rise-in mt-8 rounded-2xl p-5 md:p-6">
        <div className="skeleton h-6 w-28" />
        <div className="mt-4 space-y-3">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </section>
    </main>
  );
}