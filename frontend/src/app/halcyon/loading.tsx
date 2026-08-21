export default function HalcyonLoading() {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center px-6"
      aria-busy="true"
      aria-label="Loading Halcyon"
    >
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="skeleton mx-auto h-10 w-10 rounded-full" />
        <div className="skeleton mx-auto h-7 w-52" />
        <div className="skeleton mx-auto h-3 w-72" />
        <div className="skeleton mx-auto h-3 w-56" />
      </div>
    </main>
  );
}
