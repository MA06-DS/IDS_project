import { NavLink, Outlet } from "react-router-dom";

const links = [
  { label: "Dashboard", path: "/" },
  { label: "Charts", path: "/charts" },
  { label: "Predictor", path: "/predictor" },
  { label: "Dataset", path: "/dataset" },
  { label: "About", path: "/about" }
];

function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex flex-col lg:flex-row">
        <aside className="w-full lg:w-64 bg-white shadow-lg">
          <div className="px-6 py-6 border-b">
            <p className="text-xs uppercase tracking-widest text-gray-500">PSX</p>
            <h1 className="mt-1 text-2xl font-semibold text-primary-600">IDS Dashboard</h1>
          </div>
          <nav className="px-4 py-6 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  [
                    "block rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100"
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-4 py-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;

