import Link from 'next/link';

export default function Page() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Photos</h1>
        <p className="text-base text-gray-500">
          Manage photo uploads and sync sources for the wall.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This page will host upload, scan, and storage configuration.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Preview the photo wall →
          </Link>
        </div>
      </div>
    </main>
  );
}
