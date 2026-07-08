export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">
        📺 Watch Log V2
      </h1>

      <p className="text-slate-400 text-lg">
        Welcome to your personal media tracker.
      </p>

      <div className="mt-8 grid grid-cols-4 gap-4">
        {[
          ["TV Shows", "0"],
          ["Movies", "0"],
          ["Episodes", "0"],
          ["Hours", "0"],
        ].map(([title, value]) => (
          <div
            key={title}
            className="rounded-xl bg-slate-900 border border-slate-800 p-6"
          >
            <p className="text-slate-400">{title}</p>
            <h2 className="text-3xl font-bold mt-2">{value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}