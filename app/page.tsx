export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <h1 className="text-6xl font-bold tracking-tight">
          Rentify
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-400">
          Nigeria’s modern rent-tech platform for property discovery,
          rent management, and seamless recurring payments.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-2xl bg-white px-6 py-3 text-black font-medium hover:opacity-90">
            Find Property
          </button>

          <button className="rounded-2xl border border-gray-700 px-6 py-3 font-medium hover:bg-gray-900">
            List Property
          </button>
        </div>
      </section>
    </main>
  );
}