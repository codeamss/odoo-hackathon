import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <ShieldX className="h-16 w-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
      <p className="mt-2 text-slate-500 max-w-sm">
        You don&apos;t have permission to view this page. Contact your
        administrator if you believe this is an error.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 text-sm font-medium text-blue-600 hover:underline"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
